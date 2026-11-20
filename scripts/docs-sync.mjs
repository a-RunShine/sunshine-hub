#!/usr/bin/env node
//
// docs-sync：PR 合并进 main 后，核对文档事实与 issue/PR 正文。
// 机械可核对的项产出 fixes（更正块 / 索引行 / 链接替换），需要判断的项进 reports。
//
// 为什么是纯离屏分析器：流程侧负责 gh 采集、git 提交、开 PR；脚本本身不调 git、
// 不调 gh、不联网，所有外部事实由 JSON 输入喂进来。这样九项检查可以在夹具上
// 确定性复跑，不依赖真实时钟与网络。
//
// 写盘边界：先全部算出、全量校验（历史断言行逐字节未变），再一次性落盘；
// 中途任何断言失败都不留半成品。dry-run 不产生任何副作用。
//
// 用法：node scripts/docs-sync.mjs [--dry-run|--apply] [options]

import { existsSync, readFileSync, readdirSync, writeFileSync, renameSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
const LINK = /\]\(([^)]*)\)/g;
const FENCE = /^\s{0,3}(`{3,}|~{3,})/;
const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'];

const CN_NUM = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

// --- 参数解析 ---

export function parseArgs(argv) {
  const opts = {
    dryRun: false,
    apply: false,
    full: false,
  };
  const valued = new Set([
    'repo-root', 'main-sha', 'today', 'issues', 'prs', 'merged-prs',
    'issue-states', 'issue-states-cmd', 'trigger-pr', 'trigger-pr-body', 'trigger-merged-sha',
    'plan-out', 'poll-closes', 'git-shas',
  ]);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    const key = eq === -1 ? arg.slice(2) : arg.slice(2, eq);
    let val = eq === -1 ? null : arg.slice(eq + 1);
    if (key === 'dry-run') opts.dryRun = true;
    else if (key === 'apply') opts.apply = true;
    else if (key === 'full') opts.full = true;
    else {
      if (val === null) val = argv[++i];
      if (valued.has(key)) opts[key.replace(/-/g, '_')] = val;
    }
  }
  return opts;
}

function usage() {
  return [
    'node scripts/docs-sync.mjs (--dry-run | --apply) [options]',
    '  --repo-root <dir>      仓库根，默认 cwd',
    '  --main-sha <sha>       本轮复核的 main 提交（40 位或短 SHA）',
    '  --today <YYYY-MM-DD>  复核日期，默认 UTC 当天',
    '  --issues <file.json>  开放 issue 快照',
    '  --prs <file.json>      开放 PR 快照',
    '  --merged-prs <file.json>  最近合并的 PR（任何模式均参与第 7/8 项扫描）',
    '  --issue-states <file.json>  全量 issue 状态快照',
    '  --issue-states-cmd <cmd>  重读 issue 状态时执行的命令（不传则不发子进程）',
    '  --trigger-pr-body <file>  触发本轮的已合并 PR 正文',
    '  --trigger-merged-sha <sha>  触发 PR 的 merge_commit_sha（仅作 meta 元数据，不参与标注）',
    '  --trigger-pr <n>       触发本轮的 PR 号',
    '  --git-shas <file>      git 历史 SHA 列表（json 数组或每行一 SHA）',
    '  --full                 首次全量模式',
    '  --plan-out <file>      同一份 JSON 额外写盘',
    '  --poll-closes <ms>     Closes 延迟检查最长等待（上限 120000ms）',
  ].join('\n');
}

// --- 输入加载 ---

function loadJsonArray(file) {
  if (!file) return { provided: false, items: [] };
  if (!existsSync(file)) return { provided: false, items: [] };
  const text = readFileSync(file, 'utf8');
  if (/\.json$/i.test(file)) {
    let data;
    try { data = JSON.parse(text); } catch { throw new Error(`JSON 解析失败：${file}`); }
    return { provided: true, items: Array.isArray(data) ? data : [] };
  }
  return { provided: true, items: text.split('\n').map((s) => s.trim()).filter(Boolean) };
}

// 只在流程显式传入 --issue-states-cmd 时才执行；命令 stdout 解析成 issue 状态帧。
function execIssueStatesCmd(cmd) {
  const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const data = JSON.parse(out);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function loadTextFile(file) {
  if (!file) return { provided: false, text: '' };
  if (!existsSync(file)) return { provided: false, text: '' };
  return { provided: true, text: readFileSync(file, 'utf8') };
}

// --- 历史断言判定 ---

const RE_ISO_DATE = /\d{4}-\d{2}-\d{2}/;
const RE_CN_DATE = /\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日/;
const RE_SHA = /\b[0-9a-f]{7,40}\b/i;
const RE_HIST_WORD = /superseded|历史|旧快照/i;

function isHistText(text) {
  return RE_ISO_DATE.test(text) || RE_CN_DATE.test(text) || RE_SHA.test(text) || RE_HIST_WORD.test(text);
}

// 引用块整体继承历史属性：块内任一行带日期 / SHA / 历史标记，整块只读。
export function annotateLines(lines) {
  const ann = lines.map((line, i) => ({ line, i, quote: false, protected: false }));
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*>/.test(lines[i])) {
      let j = i;
      while (j < lines.length && /^\s*>/.test(lines[j])) j++;
      const blockHist = lines.slice(i, j).some(isHistText);
      for (let k = i; k < j; k++) {
        ann[k].quote = true;
        ann[k].protected = blockHist || isHistText(lines[k]);
      }
      i = j - 1;
    } else {
      ann[i].protected = isHistText(lines[i]);
    }
  }
  return ann;
}

// --- 更正块识别（幂等基线） ---

// 脚本自己落盘的更正块：`> **YYYY-MM-DD 复核（main \`<sha>\`）**：…`。
// 这种行是结论，不是断言来源：计数 / 份数 / 链接 / 集合扫描一律跳过，
// 也绝不进「原「…」」引用对象，避免把自己嵌套引用一层。
const RE_CORRECTION_BLOCK = /^\s*>\s*\*\*\d{4}-\d{2}-\d{2}\s+复核（main\s+`[0-9a-f]{7,40}`）\*\*/;

function isCorrectionBlockLine(line) {
  return RE_CORRECTION_BLOCK.test(line);
}

function parseCorrectionBlock(line) {
  if (!isCorrectionBlockLine(line)) return null;
  const date = (line.match(/\d{4}-\d{2}-\d{2}/) || [])[0] ?? null;
  const sha = (line.match(/`([0-9a-f]{7,40})`/) || [])[1] ?? null;
  // 事实段在 `**：` 之后、`。原「` 之前；括号数字按 split 取，不依赖全角括号正则。
  const factsText = (line.split('**：')[1] ?? '').split('。原「')[0] ?? '';
  return { date, sha, factsText };
}

const squash = (s) => s.replace(/\s+/g, '');

// 在同一小节内找一条事实已覆盖所需事实的更正块；sectionIdx 为 -1 时覆盖整份文件。
// 判定按「小节内事实」而不是「紧邻行」，兼容块紧跟断言与块在小节末尾两种布局。
function blockCovering(lines, sectionIdx, requiredFactRegexes) {
  const start = sectionIdx >= 0 ? sectionIdx : 0;
  let end = lines.length;
  if (sectionIdx >= 0) {
    for (let i = sectionIdx + 1; i < lines.length; i++) {
      if (/^#{1,6}\s/.test(lines[i])) { end = i; break; }
    }
  }
  for (let i = start; i < end; i++) {
    const block = parseCorrectionBlock(lines[i]);
    if (!block) continue;
    const facts = squash(block.factsText);
    if (requiredFactRegexes.every((re) => re.test(facts))) return block;
  }
  return null;
}

// --- 仓库遍历与链接提取 ---

const SKIP_DIRS = new Set(['.git', 'node_modules', 'target']);

function walkRepoFiles(root) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (SKIP_DIRS.has(e.name)) continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile()) out.push(full);
    }
  };
  walk(root);
  return out;
}

function walkMarkdown(dir) {
  if (!existsSync(dir)) return [];
  return walkRepoFiles(dir).filter((f) => f.endsWith('.md'));
}

// 代码块与行内代码里的 `](...)` 是示例，不是链接；与 check-doc-links.mjs 同一套遮蔽规则。
function maskCodeSpans(line) {
  const runs = [];
  for (const m of line.matchAll(/`+/g)) runs.push({ start: m.index, len: m[0].length, used: false });
  const chars = line.split('');
  for (let a = 0; a < runs.length; a++) {
    if (runs[a].used) continue;
    const b = runs.findIndex((r, i) => i > a && !r.used && r.len === runs[a].len);
    if (b === -1) continue;
    runs[a].used = runs[b].used = true;
    for (let k = runs[a].start; k < runs[b].start + runs[b].len; k++) chars[k] = ' ';
  }
  return chars.join('');
}

function extractLinks(file, lines) {
  const found = [];
  let fence = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const f = line.match(FENCE);
    if (f) {
      if (!fence) fence = f[1];
      else if (f[1][0] === fence[0] && f[1].length >= fence.length) fence = null;
      continue;
    }
    if (fence) continue;
    if (isCorrectionBlockLine(line)) continue;
    for (const m of maskCodeSpans(line).matchAll(LINK)) {
      let raw = m[1].trim();
      if (raw.startsWith('<') && raw.endsWith('>')) raw = raw.slice(1, -1);
      else raw = raw.split(/\s+/)[0];
      if (!raw || EXTERNAL.test(raw)) continue;
      const path = raw.split('#')[0];
      if (!path) continue;
      let decoded = path;
      try { decoded = decodeURIComponent(path); } catch { /* 落单 % 按原样查 */ }
      found.push({ line: i + 1, raw, target: resolve(dirname(file), decoded), anchor: raw.includes('#') ? raw.slice(raw.indexOf('#')) : '' });
    }
  }
  return found;
}

// --- OpenAPI / GLOSSARY 解析 ---

function countOpenapi(text) {
  const paths = [];
  let operations = 0;
  for (const line of text.split('\n')) {
    const pm = line.match(/^  (\/.*):/);
    if (pm) paths.push(pm[1]);
    if (new RegExp(`^    (${HTTP_METHODS.join('|')}):`, 'i').test(line)) operations += 1;
  }
  return { paths, operations };
}

function parseGlossary(text) {
  const canonical = new Set();
  const avoid = [];
  for (const line of text.split('\n')) {
    const head = line.match(/^\*\*[A-Za-z][A-Za-z ]*（[^）]*/);
    if (head) {
      const [en, zh] = head[0].replace(/^\*+/, '').replace(/）$/, '').split('（');
      if (en?.trim()) canonical.add(en.trim());
      if (zh?.trim()) canonical.add(zh.trim());
    }
    if (line.includes('_Avoid_:')) {
      for (const raw of line.split('_Avoid_:')[1].split('、')) {
        const t = raw.trim();
        if (t) avoid.push(t);
      }
    }
  }
  // 排除词本身是别的概念正名时，全局搜必然刷屏；与 check-glossary.sh 同一取舍。
  // 白名单同样对齐既有护栏：这些是合法口语 / 通用词，命中不算旧词误用。
  const allow = new Set(['交易', '实名信息', '序号', '订单', '退款', '支付', '履约', '消息', '用户', 'ID', 'item']);
  return { canonical, avoid: avoid.filter((t) => !canonical.has(t) && !allow.has(t)) };
}

// --- issue 状态源（可注入，测试不真等、不联网） ---

export function createIssueStateSource({ frames, reload, sleep = async () => {}, now = () => Date.now() }) {
  const snapshots = frames.length ? frames : [[]];
  let idx = 0;
  const current = () => snapshots[Math.min(idx, snapshots.length - 1)];
  return {
    stateOf: (number) => current().find((i) => Number(i.number) === Number(number))?.state ?? 'OPEN',
    reload: async () => {
      if (reload) {
        const next = await reload();
        if (Array.isArray(next)) snapshots.push(next);
      }
      idx = Math.min(idx + 1, snapshots.length - 1);
    },
    async waitUntilClosed(targets, { deadlineMs, intervalMs = 10000 } = {}) {
      const start = now();
      while (targets.some((n) => this.stateOf(n) !== 'CLOSED')) {
        if (now() - start >= deadlineMs) return false;
        await sleep(intervalMs);
        await this.reload();
      }
      return true;
    },
  };
}

function collectCloses(prs) {
  const targets = new Set();
  const re = /(?:closes|fixes|resolved?)\s*:?\s*#(\d+)/gi;
  for (const pr of prs) {
    for (const body of [pr.body ?? '', pr.title ?? '']) {
      for (const m of body.matchAll(re)) targets.add(Number(m[1]));
    }
  }
  return [...targets].sort((a, b) => a - b);
}

// --- 分析主体 ---

// 向上回溯到最近的小节标题（##/###），返回其 0-based 行号；无标题返回 -1。
function sectionIndexOf(lines, lineIdx) {
  for (let i = lineIdx; i >= 0; i--) {
    if (/^#{1,6}\s/.test(lines[i])) return i;
  }
  return -1;
}

function heaviest(findings) {
  if (findings.some((f) => f.status === 'drift')) return 'drift';
  if (findings.some((f) => f.status === 'report')) return 'report';
  return 'pass';
}

export async function analyze({ root, inputs, options }) {
  const today = options.today;
  const mainSha = options.mainSha ?? null;
  const shortSha = mainSha ? mainSha.slice(0, 7) : null;
  const rel = (full) => relative(root, full).split(sep).join('/');

  const decisionsPath = join(root, 'docs/wiki/decisions.md');
  const stagesPath = join(root, 'docs/wiki/stages.md');
  const openLoopsPath = join(root, 'docs/wiki/open-loops.md');
  const gapsPath = join(root, 'docs/wiki/contract-gaps.md');
  const openapiPath = join(root, 'api/openapi.yaml');
  const glossaryPath = join(root, 'GLOSSARY.md');

  const readText = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null);

  const fixes = [];
  const reports = [];
  const checks = [];
  const warnings = [];

  const pushFix = (fix) => fixes.push(fix);
  const pushReport = (rep) => reports.push(rep);

  // 全仓文件索引，供链接 basename 唯一解析
  const repoFiles = walkRepoFiles(root);
  const byBasename = new Map();
  for (const f of repoFiles) {
    const base = f.split(sep).pop();
    if (!byBasename.has(base)) byBasename.set(base, []);
    byBasename.get(base).push(f);
  }

  // --- 第 1 项：ADR 份数与索引表（第 6 项并入本项） ---
  const check1 = { id: 1, title: 'ADR 份数与索引表', findings: [] };
  const adrDir = join(root, 'docs/adr');
  const adrFiles = walkMarkdown(adrDir).sort();
  const adrs = adrFiles.map((file) => {
    const name = file.split(sep).pop();
    const num = (name.match(/^(\d{4})/) || [])[1] ?? null;
    const text = readText(file) ?? '';
    const title = (text.split('\n').find((l) => /^#\s+/.test(l)) ?? '').replace(/^#\s+/, '').trim();
    return { file, rel: rel(file), num, title, basename: name };
  });

  const decisionsText = readText(decisionsPath);
  if (decisionsText === null) {
    check1.findings.push({ file: null, line: 1, current: '', action: '补 decisions.md 索引页', status: 'report', detail: 'docs/wiki/decisions.md 不存在，无法核对 ADR 份数与索引。' });
  } else {
    const dLines = decisionsText.split('\n');

    // 现行份数断言：优先取含「现行」的行，否则取最后一处数字断言；历史行同样参与比对，但只读不改。
    // 更正块行是结论不是断言来源，跳过。
    const countHits = [];
    dLines.forEach((line, i) => {
      if (isCorrectionBlockLine(line)) return;
      for (const m of line.matchAll(/(\d+)\s*份\s*ADR/g)) countHits.push({ line: i + 1, current: line, matched: m[0] });
      for (const m of line.matchAll(/ADR\s*(?:共|是|现有)?\s*(\d+)\s*份/g)) countHits.push({ line: i + 1, current: line, matched: m[0] });
    });
    const currentHit = countHits.find((h) => h.current.includes('现行')) ?? countHits[countHits.length - 1];

    if (currentHit && Number(currentHit.matched.match(/\d+/)[0]) !== adrs.length) {
      const asserted = Number(currentHit.matched.match(/\d+/)[0]);
      const section = sectionIndexOf(dLines, currentHit.line - 1);
      const covered = blockCovering(dLines, section, [new RegExp(`ADR共${adrs.length}份`)]);
      if (covered) {
        check1.findings.push({
          file: rel(decisionsPath), line: currentHit.line, current: currentHit.current.trim(),
          action: '追加 ADR 份数更正块', status: 'pass',
          detail: `已有更正块（main \`${covered.sha}\`，${covered.date}）：ADR 共 ${adrs.length} 份，事实已覆盖，不再追加。`,
        });
      } else {
        check1.findings.push({
          file: rel(decisionsPath), line: currentHit.line, current: currentHit.current.trim(),
          action: '追加 ADR 份数更正块', status: 'drift',
          detail: `断言 ${asserted} 份，docs/adr/ 实测 ${adrs.length} 份。`,
        });
        pushFix(makeCorrectionFix({
          lines: dLines, anchorLine: currentHit.line,
          facts: [`ADR 共 ${adrs.length} 份`], oldFragments: [currentHit.matched],
          today, shortSha, file: rel(decisionsPath),
        }));
      }
    }

    // 索引表：表头 `| ADR | 标题（即结论） |` 后的表格行
    const headerIdx = dLines.findIndex((l) => /^\|\s*ADR\s*\|/.test(l));
    const rows = [];
    if (headerIdx >= 0) {
      for (let i = headerIdx + 2; i < dLines.length; i++) {
        const l = dLines[i];
        if (!/^\|/.test(l)) break;
        const m = l.match(/^\|\s*\[(\d{4})\]\([^)]*\)\s*\|\s*(.*?)\s*\|$/);
        if (m) rows.push({ line: i + 1, num: m[1], title: m[2], raw: l });
      }
    }
    const adrNums = new Set(adrs.map((a) => a.num).filter(Boolean));
    const rowByNum = new Map();
    const seenNums = new Set();
    for (const row of rows) {
      if (seenNums.has(row.num)) {
        check1.findings.push({
          file: rel(decisionsPath), line: row.line, current: row.raw,
          action: '人工核对重复索引编号', status: 'report',
          detail: `索引表编号 ${row.num} 重复出现。`,
        });
        pushReport({ file: rel(decisionsPath), line: row.line, current: row.raw, reason: `索引表编号 ${row.num} 重复。`, suggestion: '删除重复行后保留一条。' });
      }
      seenNums.add(row.num);
      if (!rowByNum.has(row.num)) rowByNum.set(row.num, row);
    }
    // 多余行：表里有、docs/adr/ 里没有的编号。
    for (const row of rows) {
      if (!adrNums.has(row.num)) {
        check1.findings.push({
          file: rel(decisionsPath), line: row.line, current: row.raw,
          action: '人工核对多余索引行', status: 'report',
          detail: `索引行 ${row.num} 在 docs/adr/ 无对应 ADR 文件。`,
        });
        pushReport({ file: rel(decisionsPath), line: row.line, current: row.raw, reason: `索引编号 ${row.num} 无对应 ADR 文件。`, suggestion: '核对是 ADR 文件缺失还是索引行误留。' });
      }
    }
    for (const adr of adrs) {
      const row = adr.num ? rowByNum.get(adr.num) : null;
      if (!row) {
        // 按编号升序插入到正确位置。
        const firstGreater = rows.find((r) => Number(r.num) > Number(adr.num));
        let insertAt0;
        if (firstGreater) insertAt0 = firstGreater.line - 1;
        else {
          insertAt0 = headerIdx + 2;
          while (insertAt0 < dLines.length && /^\|/.test(dLines[insertAt0])) insertAt0 += 1;
        }
        const after = `| [${adr.num}](../adr/${adr.basename}) | ${adr.title} |`;
        check1.findings.push({
          file: rel(decisionsPath), line: insertAt0 + 1, current: '',
          action: '按编号补索引行', status: 'drift', detail: `ADR ${adr.num} 未进 decisions.md 索引表。`,
        });
        pushFix({
          file: rel(decisionsPath), line: insertAt0 + 1, kind: 'index-row',
          after, insertAtLine: insertAt0 + 1, adr, anchorLine: insertAt0 + 1,
        });
      } else if (adr.title && row.title !== adr.title) {
        check1.findings.push({
          file: rel(decisionsPath), line: row.line, current: row.title,
          action: '人工核对索引标题', status: 'report',
          detail: `索引标题「${row.title}」与 ADR 文件首个标题「${adr.title}」不一致。`,
        });
        pushReport({ file: rel(decisionsPath), line: row.line, current: row.title, reason: '索引行标题与 ADR 文件首个标题不一致，需人工判断以哪份为准。', suggestion: `核对 ${adr.rel} 后修订索引标题。` });
      }
    }
  }
  check1.status = heaviest(check1.findings);
  checks.push(check1);

  // 第 6 项并入第 1 项：保留序号，状态与第 1 项一致
  checks.push({ id: 6, title: '新 ADR 是否进索引（并入第 1 项）', status: check1.status, findings: check1.findings.filter((f) => f.action === '按编号补索引行' || f.action === '人工核对索引标题') });

  // --- 第 2 项：OpenAPI path / operation 计数 vs stages.md ---
  const check2 = { id: 2, title: 'OpenAPI path / operation 计数', findings: [] };
  const stagesText = readText(stagesPath);
  const openapiText = readText(openapiPath);
  if (openapiText === null) {
    check2.findings.push({ file: rel(openapiPath), line: 1, current: '', action: '补契约文件', status: 'report', detail: 'api/openapi.yaml 不存在。' });
  } else if (stagesText === null) {
    check2.findings.push({ file: rel(stagesPath), line: 1, current: '', action: '补 stages.md', status: 'report', detail: 'docs/wiki/stages.md 不存在。' });
  } else {
    const counts = countOpenapi(openapiText);
    const sLines = stagesText.split('\n');
    const scanable = sLines.map((l, i) => ({ line: i + 1, current: l })).filter((h) => !isCorrectionBlockLine(h.current));
    const pathHit = scanable.map((h) => ({ ...h, m: h.current.match(/(\d+)\s*个\s*path/i) })).find((h) => h.m);
    const opHit = scanable.map((h) => ({ ...h, m: h.current.match(/(\d+)\s*个\s*operation/i) })).find((h) => h.m);
    const mismatches = [];
    if (pathHit && Number(pathHit.m[1]) !== counts.paths.length) {
      mismatches.push({ hit: pathHit, kind: 'path', fact: `${counts.paths.length} 个 path`, re: new RegExp(`${counts.paths.length}个path`) });
    }
    if (opHit && Number(opHit.m[1]) !== counts.operations) {
      mismatches.push({ hit: opHit, kind: 'operation', fact: `${counts.operations} 个 operation`, re: new RegExp(`${counts.operations}个operation`) });
    }
    if (mismatches.length) {
      const anchor = mismatches[0].hit;
      const section = sectionIndexOf(sLines, anchor.line - 1);
      const covered = blockCovering(sLines, section, mismatches.map((m) => m.re));
      if (covered) {
        for (const m of mismatches) {
          check2.findings.push({
            file: rel(stagesPath), line: m.hit.line, current: m.hit.current.trim(),
            action: m.kind === 'path' ? '追加 path 计数更正块' : '追加 operation 计数更正块', status: 'pass',
            detail: `已有更正块（main \`${covered.sha}\`，${covered.date}）：${m.fact}，事实已覆盖，不再追加。`,
          });
        }
      } else {
        for (const m of mismatches) {
          check2.findings.push({
            file: rel(stagesPath), line: m.hit.line, current: m.hit.current.trim(),
            action: m.kind === 'path' ? '追加 path 计数更正块' : '追加 operation 计数更正块', status: 'drift',
            detail: `断言 ${m.hit.m[1]} 个 ${m.kind === 'path' ? 'path' : 'operation'}，实测 ${m.fact}。`,
          });
        }
        const factsMerged = [`api/openapi.yaml 实测 ${counts.paths.length} 个 path、${counts.operations} 个 operation`];
        pushFix(makeCorrectionFix({
          lines: sLines, anchorLine: anchor.line,
          facts: factsMerged,
          oldFragments: mismatches.map((m) => m.hit.m[0]),
          today, shortSha, file: rel(stagesPath),
        }));
      }
    }
  }
  check2.status = heaviest(check2.findings);
  checks.push(check2);

  // --- 第 3 项：open issue 数量与集合 ---
  const check3 = { id: 3, title: 'open issue 数量与集合', findings: [] };
  const openIssues = inputs.issues.items.filter((i) => (i.state ?? 'OPEN') === 'OPEN');
  const openNumbers = new Set(openIssues.map((i) => Number(i.number)));
  if (!inputs.issues.provided) {
    check3.findings.push({ file: null, line: 1, current: '', action: '补 issue 快照输入', status: 'report', detail: '未提供 issue 列表输入，无法核对 open issue 数量与集合。' });
    pushReport({ file: null, line: 1, current: '', reason: '未提供 issue 快照（--issues）。', suggestion: '流程侧采集 gh issue list 后重跑。' });
  } else {
    // 日期、中文日期、commit SHA、版本号里的数字不算计数；标题行也不是断言来源。
    const MASK_NOISE = /\d{4}-\d{1,2}-\d{1,2}|\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日|\b[0-9a-f]{7,40}\b|\bv?\d+\.\d+(?:\.\d+)?\b/gi;
    const countFromLine = (line) => {
      if (/^\s*#{1,6}\s/.test(line)) return null;
      if (isCorrectionBlockLine(line)) return null;
      const masked = line.replace(MASK_NOISE, ' ');
      let m = masked.match(/共\s*\*\*(\d+)\*\*\s*个\s*open\s*issue/i);
      if (m) return Number(m[1]);
      m = masked.match(/(\d+)\s*个\s*open\s*issue/i);
      if (m) return Number(m[1]);
      // 快照（六个）这类中文数字写法：括号内容用 split 取，不依赖全角括号正则。
      if (line.includes('快照')) {
        const token = (line.split('（')[1] ?? '').split('）')[0].replace(MASK_NOISE, ' ').match(/[一二三四五六七八九十\d]+/);
        if (token) return /\d/.test(token[0]) ? Number(token[0]) : CN_NUM[token[0]];
      }
      return null;
    };
    const pages = [
      { path: stagesPath, text: stagesText },
      { path: openLoopsPath, text: readText(openLoopsPath) },
    ];
    for (const page of pages) {
      if (page.text === null) continue;
      const lines = page.text.split('\n');
      const hits = lines.map((l, i) => ({ line: i + 1, current: l, n: countFromLine(l), section: sectionIndexOf(lines, i) })).filter((h) => h.n !== null);
      // 同页同一小节合并成一条更正块；不同小节各自一条。
      const groups = new Map();
      for (const h of hits) {
        if (!groups.has(h.section)) groups.set(h.section, []);
        groups.get(h.section).push(h);
      }
      for (const [section, group] of groups) {
        const mismatched = group.filter((h) => h.n !== openIssues.length);
        if (!mismatched.length) continue;
        const covered = blockCovering(lines, section, [new RegExp(`openissue${openIssues.length}个`)]);
        if (covered) {
          for (const h of mismatched) {
            check3.findings.push({
              file: rel(page.path), line: h.line, current: h.current.trim(),
              action: '追加 open issue 数量更正块', status: 'pass',
              detail: `已有更正块（main \`${covered.sha}\`，${covered.date}）：open issue ${openIssues.length} 个，事实已覆盖，不再追加。`,
            });
          }
          continue;
        }
        for (const h of mismatched) {
          check3.findings.push({
            file: rel(page.path), line: h.line, current: h.current.trim(),
            action: '追加 open issue 数量更正块', status: 'drift', detail: `断言 ${h.n} 个 open issue，实测 ${openIssues.length} 个。`,
          });
        }
        pushFix(makeCorrectionFix({
          lines, anchorLine: mismatched[0].line,
          facts: [`open issue ${openIssues.length} 个`],
          oldFragments: mismatched.map((h) => h.current.trim()),
          today, shortSha, file: rel(page.path),
        }));
      }
      // 集合差异：表格里只取加粗的 issue 引用（**#N**），里程碑表里的 PR #N 不算；
      // 快照行里的编号才是 issue 集合声明。正文 PR 引用不进集合比对。
      const listed = new Set();
      const numberLine = new Map();
      lines.forEach((l, i) => {
        if (isCorrectionBlockLine(l)) return;
        let nums = [];
        if (/^\|/.test(l)) {
          for (const m of l.matchAll(/\*\*#(\d+)\*\*/g)) nums.push(Number(m[1]));
        } else if (l.includes('快照')) {
          for (const m of l.matchAll(/#(\d+)/g)) nums.push(Number(m[1]));
        }
        for (const n of nums) {
          listed.add(n);
          if (!numberLine.has(n)) numberLine.set(n, i + 1);
        }
      });
      // 找不到编号所在行时，回退到首个快照小节标题行；再没有就记第 1 行并在 detail 说明。
      const snapshotHeadingIdx = lines.findIndex((l) => /快照/.test(l) && /^#{1,6}\s/.test(l));
      const fallbackLine = snapshotHeadingIdx >= 0 ? snapshotHeadingIdx + 1 : 1;
      const lineFor = (n) => numberLine.get(n) ?? fallbackLine;
      const noteFallback = (n) => numberLine.has(n) ? '' : '（文档中未直接定位到该编号，指向首个快照小节）';
      const extra = [...listed].filter((n) => !openNumbers.has(n)).sort((a, b) => a - b);
      const missing = [...openNumbers].filter((n) => !listed.has(n)).sort((a, b) => a - b);
      for (const n of extra) {
        const line = lineFor(n);
        check3.findings.push({ file: rel(page.path), line, current: `#${n}`, action: '人工核对 issue 集合', status: 'report', detail: `文档列出的该 issue 当前不在 open 集合中。${noteFallback(n)}` });
        pushReport({ file: rel(page.path), line, current: `#${n}`, reason: '文档列出但已关闭或不存在，集合差异需人工判断。', suggestion: '确认该 issue 状态后从现行快照移除。' });
      }
      for (const n of missing) {
        const line = lineFor(n);
        check3.findings.push({ file: rel(page.path), line, current: `#${n}`, action: '人工核对 issue 集合', status: 'report', detail: `open 集合中的该 issue 未在文档列出。${noteFallback(n)}` });
        pushReport({ file: rel(page.path), line, current: `#${n}`, reason: 'open issue 未被文档快照覆盖。', suggestion: '人工确认是否补进现行快照。' });
      }
    }
  }
  check3.status = heaviest(check3.findings);
  checks.push(check3);

  // --- 第 4 项：文档内 commit SHA 是否在 git 历史中 ---
  const check4 = { id: 4, title: '文档内 commit SHA 可溯源', findings: [] };
  const shaDocs = [
    ...walkMarkdown(join(root, 'docs')),
    ...[glossaryPath, join(root, 'AGENTS.md')].filter(existsSync),
  ];
  if (!inputs.gitShas.provided) {
    check4.findings.push({ file: null, line: 1, current: '', action: '补 git 历史输入', status: 'report', detail: '未提供 git 历史输入（--git-shas），无法判定文档内 SHA 是否存在。' });
    pushReport({ file: null, line: 1, current: '', reason: '未提供 git 历史快照。', suggestion: '流程侧采集 git log --all --format=%H 后重跑。' });
  } else {
    const shas = new Set(inputs.gitShas.items.map((s) => s.toLowerCase()));
    const known = (token) => [...shas].some((full) => full.startsWith(token.toLowerCase()) || token.toLowerCase().startsWith(full));
    for (const file of shaDocs) {
      const text = readText(file) ?? '';
      text.split('\n').forEach((line, i) => {
        for (const m of line.matchAll(/\b[0-9a-f]{7,40}\b/gi)) {
          if (!known(m[0])) {
            check4.findings.push({ file: rel(file), line: i + 1, current: line.trim(), action: '人工核对 SHA 来源', status: 'report', detail: `SHA \`${m[0]}\` 不在提供的 git 历史中。` });
            pushReport({ file: rel(file), line: i + 1, current: line.trim(), reason: '文档引用的 commit SHA 在历史快照中找不到。', suggestion: '核对 SHA 拼写或对应提交是否已进 main。' });
          }
        }
      });
    }
  }
  check4.status = heaviest(check4.findings);
  checks.push(check4);

  // --- 第 5 项：相对链接目标可解析 ---
  const check5 = { id: 5, title: '相对链接目标可解析', findings: [] };
  const linkDocs = [...walkMarkdown(join(root, 'docs/agents')), ...walkMarkdown(join(root, 'docs/wiki'))];
  for (const file of linkDocs) {
    const lines = (readText(file) ?? '').split('\n');
    for (const link of extractLinks(file, lines)) {
      if (existsSync(link.target)) continue;
      const base = link.target.split(sep).pop();
      const hits = byBasename.get(base) ?? [];
      if (hits.length === 1) {
        const targetRel = relative(dirname(file), hits[0]).split(sep).join('/');
        const newTarget = targetRel + link.anchor;
        const origLine = lines[link.line - 1] ?? '';
        const linkText = origLine.match(/\[([^\]]*)\]/)?.[1] ?? '';
        const newLink = `[${linkText}](${newTarget})`;
        const replacedLine = origLine.replace(link.raw, newLink);
        check5.findings.push({
          file: rel(file), line: link.line, current: link.raw, action: '原地替换链接目标', status: 'drift',
          detail: `旧目标不存在，basename「${base}」全仓唯一命中。`,
        });
        pushFix({
          file: rel(file), line: link.line, kind: 'link-replace',
          before: link.raw, after: replacedLine, insertAtLine: link.line,
          oldTarget: link.target, newTarget: hits[0], anchor: link.anchor,
        });
      } else {
        check5.findings.push({
          file: rel(file), line: link.line, current: link.raw, action: '人工解析链接', status: 'report',
          detail: hits.length === 0 ? '旧目标不存在且全仓无同名文件。' : `basename「${base}」命中 ${hits.length} 个文件，无法唯一解析。`,
        });
        pushReport({ file: rel(file), line: link.line, current: link.raw, reason: hits.length === 0 ? '链接目标零命中。' : '链接目标歧义（多命中）。', suggestion: '人工确认目标文档后修正链接。' });
      }
    }
  }
  check5.status = heaviest(check5.findings);
  checks.push(check5);

  // --- 第 7 项：GLOSSARY 排除词命中 ---
  const check7 = { id: 7, title: 'GLOSSARY 排除词零命中', findings: [] };
  if (existsSync(glossaryPath)) {
    const { avoid } = parseGlossary(readText(glossaryPath));
    const scanText = (sourceLabel, text) => {
      if (!text) return;
      text.split('\n').forEach((line, i) => {
        for (const term of avoid) {
          const hit = /^[A-Za-z]/.test(term)
            ? new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(line)
            : line.includes(term);
          if (hit) {
            check7.findings.push({ file: sourceLabel, line: i + 1, current: line.trim(), action: '人工判断排除词用法', status: 'report', detail: `命中排除词「${term}」。` });
            pushReport({ file: sourceLabel, line: i + 1, current: line.trim(), reason: `命中 GLOSSARY 排除词「${term}」。`, suggestion: '按语境判断是旧词误用还是合法口语 / 墓碑记录。' });
          }
        }
      });
    };
    for (const file of walkMarkdown(join(root, 'docs'))) {
      if (file === glossaryPath) continue;
      scanText(rel(file), readText(file));
    }
    if (options.full && existsSync(join(root, 'AGENTS.md'))) scanText('AGENTS.md', readText(join(root, 'AGENTS.md')));
    for (const issue of inputs.issues.items) scanText(`issue #${issue.number}`, `${issue.title ?? ''}\n${issue.body ?? ''}`);
    for (const pr of inputs.prs.items) scanText(`PR #${pr.number}`, `${pr.title ?? ''}\n${pr.body ?? ''}`);
    for (const pr of inputs.mergedPrs.items) scanText(`merged PR #${pr.number}`, `${pr.title ?? ''}\n${pr.body ?? ''}`);
  }
  check7.status = heaviest(check7.findings);
  checks.push(check7);

  // --- 第 8 项：Closes / Fixes 关联 issue 已关闭 ---
  const check8 = { id: 8, title: 'Closes / Fixes 关联 issue 已关闭', findings: [] };
  const closeBodies = [];
  const triggerBody = inputs.triggerPrBody ?? { provided: false, text: '' };
  if (triggerBody.provided) closeBodies.push({ body: triggerBody.text });
  if (options.full) closeBodies.push(...inputs.prs.items);
  closeBodies.push(...inputs.mergedPrs.items);
  const closesTargets = collectCloses(closeBodies);

  if (!options.full && !triggerBody.provided) {
    check8.findings.push({ file: null, line: 1, current: '', action: '补触发 PR 正文', status: 'report', detail: '未提供触发 PR 正文（--trigger-pr-body），增量模式无法核对 Closes 关联。' });
    pushReport({ file: null, line: 1, current: '', reason: '未提供触发 PR 正文。', suggestion: '流程侧采集触发 PR 正文后重跑。' });
  } else if (!inputs.issueStates.provided) {
    check8.findings.push({ file: null, line: 1, current: '', action: '补 issue 状态快照', status: 'report', detail: '未提供 issue 状态快照（--issue-states），无法核对 Closes 关联。' });
    pushReport({ file: null, line: 1, current: '', reason: '未提供 issue 状态快照。', suggestion: '流程侧采集 gh issue list --state all 后重跑。' });
  } else if (closesTargets.length) {
    const reload = options.statesReload ?? (options.issueStatesCmd ? () => execIssueStatesCmd(options.issueStatesCmd) : null);
    const source = createIssueStateSource({ frames: [inputs.issueStates.items], reload });
    const pollMs = options.pollCloses != null ? Math.min(Number(options.pollCloses) || 0, 120000) : 0;
    // dry-run 不等待、不重读，只比首帧；等待循环只在 apply 走。
    // 未提供重读命令（reload 为 null）时退化为单帧比较，不进入轮询。
    if (!options.dryRun && pollMs > 0 && reload) {
      const settled = await source.waitUntilClosed(closesTargets, { deadlineMs: pollMs, intervalMs: 10000 });
      if (!settled) warnings.push(`Closes 轮询达到上限 ${pollMs}ms，按超时处理。`);
    }
    for (const n of closesTargets) {
      if (source.stateOf(n) !== 'CLOSED') {
        check8.findings.push({ file: null, line: 1, current: `#${n}`, action: '人工核对关闭状态', status: 'report', detail: `PR 正文关联的 issue #${n} 仍未关闭。` });
        pushReport({ file: null, line: 1, current: `#${n}`, reason: 'Closes / Fixes 关联的 issue 未处于 CLOSED 状态。', suggestion: '确认 issue 是否被自动关闭，或修正 PR 关联编号。' });
      }
    }
  }
  check8.status = heaviest(check8.findings);
  checks.push(check8);

  // --- 第 9 项：contract-gaps 缺口端点是否已进 OpenAPI ---
  const check9 = { id: 9, title: 'contract-gaps 缺口端点落点', findings: [] };
  const gapsText = readText(gapsPath);
  if (gapsText === null) {
    check9.findings.push({ file: null, line: 1, current: '', action: '补 contract-gaps.md', status: 'report', detail: 'docs/wiki/contract-gaps.md 不存在。' });
  } else if (openapiText === null) {
    check9.findings.push({ file: rel(openapiPath), line: 1, current: '', action: '补契约文件', status: 'report', detail: 'api/openapi.yaml 不存在。' });
  } else {
    const openapiPaths = new Set(countOpenapi(openapiText).paths);
    const norm = (p) => p.replace(/\{[^}]+\}/g, '{}').replace(/\/+$/, '');
    const openapiNorm = new Set([...openapiPaths].map(norm));
    const endpoints = new Set();
    for (const m of gapsText.matchAll(/`(\/[A-Za-z0-9/{}_-]+)`/g)) endpoints.add(m[1]);
    for (const m of gapsText.matchAll(/(?:GET|POST|PUT|DELETE|PATCH)\s+(\/[A-Za-z0-9/{}_-]+)/gi)) endpoints.add(m[1]);
    for (const ep of endpoints) {
      const present = openapiNorm.has(norm(ep));
      check9.findings.push({
        file: rel(gapsPath), line: 1, current: ep, action: present ? '记录已补端点' : '人工核对缺口', status: 'report',
        detail: present ? '该端点已在当前 OpenAPI 出现，可能已补。' : '该端点未在当前 OpenAPI 出现，仍未补。',
      });
      pushReport({
        file: rel(gapsPath), line: 1, current: ep,
        reason: present ? '端点疑似已补进契约。' : '端点在契约中仍未出现。',
        suggestion: present ? '人工确认缺口关闭后更新 contract-gaps.md。' : '确认缺口是否仍待契约修订。',
      });
    }
  }
  check9.status = heaviest(check9.findings);
  checks.push(check9);

  // --- 汇总与 plan ---
  const summary = { pass: 0, drift: 0, report: 0 };
  for (const c of checks) summary[c.status] += 1;

  const plan = buildPlan({ prs: inputs.prs.items, fixes, reports, shortSha });

  return {
    meta: { mainSha, shortSha, today, full: !!options.full, dryRun: options.dryRun, pollSkipped: !!options.dryRun, trigger: { pr: options.triggerPr ? Number(options.triggerPr) : null, mergedSha: options.triggerMergedSha ?? null } },
    checks,
    summary,
    fixes,
    reports,
    changedFiles: [...new Set(fixes.map((f) => f.file))],
    plan,
    warnings,
  };
}

function buildPlan({ prs, fixes, reports, shortSha }) {
  const syncPrs = (prs ?? []).filter((p) => String(p.headRefName ?? '').startsWith('docs/sync-'));
  let reuseExistingPr = null;
  let branch = null;
  const warnings = [];
  const occupied = new Set(syncPrs.map((p) => p.headRefName));
  const base = `docs/sync-${shortSha ?? 'unknown'}`;

  if (syncPrs.length === 0) {
    branch = base;
  } else if (syncPrs.length === 1) {
    const pr = syncPrs[0];
    const reviewed = ['APPROVED', 'CHANGES_REQUESTED'].includes(pr.reviewDecision ?? '');
    if (reviewed) {
      // 已被占用则 -3、-4… 依次回退。
      let suffix = 2;
      branch = `${base}-2`;
      while (occupied.has(branch)) {
        suffix += 1;
        branch = `${base}-${suffix}`;
      }
    } else {
      reuseExistingPr = { number: pr.number, headRefName: pr.headRefName };
      branch = pr.headRefName;
    }
  } else {
    const sorted = [...syncPrs].sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')));
    reuseExistingPr = { number: sorted[0].number, headRefName: sorted[0].headRefName };
    branch = sorted[0].headRefName;
    warnings.push(`exist multiple docs sync PRs: ${sorted.slice(1).map((p) => `#${p.number}`).join(', ')}`);
  }

  return {
    shouldCreateBranch: fixes.length > 0,
    branch,
    reuseExistingPr,
    commitMessage: shortSha ? `docs: 同步 ${shortSha} 的文档事实` : null,
    shouldCreateRollingIssue: reports.length > 0,
    rollingIssueTitle: 'docs: 文档同步待人工判断',
    rollingIssueLabel: 'docs',
    warnings,
  };
}

// --- 落盘：全算完 → 全校验 → 一次写盘 ---

function renderCorrectionBlock({ today, shortSha, facts, oldFragments }) {
  const shaPart = shortSha ? `main \`${shortSha}\`` : 'main（未提供 SHA）';
  return `> **${today} 复核（${shaPart}）**：${facts.join('；')}。原「${oldFragments.join('；')}」按历史断言保留。`;
}

// 同一 today + shortSha 的更正块已存在则跳过，保证 apply 幂等。
function correctionBlockExists(text, today, shortSha) {
  return Boolean(text) && text.includes(`${today} 复核`) && (!shortSha || text.includes(`main \`${shortSha}\``));
}

// 构造一条更正块 fix：after 为新增行逐字，insertAtLine 为其在结果文件中的 1-based 行号。
function makeCorrectionFix({ lines, anchorLine, facts, oldFragments, today, shortSha, file }) {
  const block = renderCorrectionBlock({ today, shortSha, facts, oldFragments });
  const insertAt0 = locateBlockInsertion(lines, Math.max(0, anchorLine - 1));
  return {
    file, line: anchorLine, kind: 'correction-block',
    after: block, insertAtLine: insertAt0 + 2, insertAt0,
    facts, oldFragments, before: oldFragments.join('；'), anchorLine,
  };
}

export function applyFixes(root, fixes, { today, shortSha }) {
  const byFile = new Map();
  for (const fix of fixes) {
    if (!byFile.has(fix.file)) byFile.set(fix.file, []);
    byFile.get(fix.file).push(fix);
  }

  // 阶段一：全部修正算完、校验完，先不落盘；任一文件校验失败都不写任何文件。
  const planned = [];
  for (const [relFile, fileFixes] of byFile) {
    const abs = join(root, relFile);
    const original = readFileSync(abs, 'utf8');
    const lines = original.split('\n');
    const ann = annotateLines(lines);
    const protectedBefore = ann.filter((a) => a.protected).map((a) => a.line);

    const blockFixes = fileFixes.filter((f) => f.kind === 'correction-block');
    const rowFixes = fileFixes.filter((f) => f.kind === 'index-row');
    const linkFixes = fileFixes.filter((f) => f.kind === 'link-replace');

    let content = [...lines];

    // 幂等：同轮更正块已落盘则整组跳过。
    const skipBlocks = blockFixes.length > 0 && correctionBlockExists(original, today, shortSha);
    const blockApply = skipBlocks ? [] : blockFixes;

    // 插入类动作按原始行号倒序应用，避免前面的插入顶掉后面的行号。
    const inserts = [
      ...blockApply.map((f) => ({ at: f.insertAt0 ?? locateBlockInsertion(lines, (f.anchorLine ?? lines.length) - 1), kind: 'block', fix: f })),
      ...rowFixes.map((f) => ({ at: f.insertAtLine - 1, kind: 'row', fix: f })),
    ].sort((a, b) => b.at - a.at);
    for (const ins of inserts) {
      if (ins.kind === 'block') content.splice(ins.at, 0, '', ins.fix.after, '');
      else content.splice(ins.at, 0, ins.fix.after);
    }

    // 链接替换只动目标，不动链接文本与整行其他内容；历史行不参与改写。
    for (const fix of linkFixes) {
      const idx = fix.line - 1;
      if (ann[idx]?.protected) continue;
      const line = content[idx];
      const re = new RegExp(`\\]\\(${escapeRegex(fix.before.replace(/#.*$/, ''))}[^)]*\\)`);
      const replaced = line.replace(re, fix.after);
      if (replaced === line) throw new Error(`链接目标未命中：${relFile} :: ${fix.before.slice(0, 40)}…`);
      content[idx] = replaced;
    }

    // 校验：历史断言行逐字节未变。
    const result = content.join('\n');
    for (const orig of protectedBefore) {
      if (!result.includes(orig)) throw new Error(`历史断言行被改写：${relFile} :: ${orig.slice(0, 40)}…`);
    }
    planned.push({ abs, relFile, result });
  }

  // 阶段二：临时文件 + rename 一次落盘；同目录 rename 是原子替换。
  const written = [];
  for (const p of planned) {
    const tmp = `${p.abs}.tmp-${process.pid}`;
    writeFileSync(tmp, p.result);
    renameSync(tmp, p.abs);
    written.push(p.relFile);
  }
  return written;
}

function locateBlockInsertion(lines, anchorIdx) {
  const details = lines.findIndex((l) => /^<details>/.test(l));
  if (details >= 0) return details;
  for (let i = anchorIdx + 1; i < lines.length; i++) {
    if (/^#{1,6}\s/.test(lines[i])) return i;
  }
  return lines.length;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// --- CLI 入口 ---

async function main(argv) {
  const opts = parseArgs(argv);
  if (opts.dryRun === opts.apply) {
    console.error(usage());
    process.exit(1);
  }
  if (!opts.main_sha && !opts.dryRun) {
    // apply 缺 SHA 属于参数不全；dry-run 允许缺省以便离线演示。
    console.error('错误：--apply 必须提供 --main-sha');
    console.error(usage());
    process.exit(1);
  }

  const root = resolve(opts.repo_root ?? process.cwd());
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    console.error(`错误：--today 必须是 YYYY-MM-DD，收到 ${today}`);
    process.exit(1);
  }

  const inputs = {
    issues: loadJsonArray(opts.issues),
    prs: loadJsonArray(opts.prs),
    mergedPrs: loadJsonArray(opts.merged_prs),
    issueStates: loadJsonArray(opts.issue_states),
    gitShas: loadJsonArray(opts.git_shas),
    triggerPrBody: loadTextFile(opts.trigger_pr_body),
  };

  const options = {
    dryRun: opts.dryRun,
    apply: opts.apply,
    full: opts.full,
    today,
    mainSha: opts.main_sha,
    triggerPr: opts.trigger_pr,
    triggerMergedSha: opts.trigger_merged_sha,
    pollCloses: opts.poll_closes,
    issueStatesCmd: opts.issue_states_cmd,
  };

  let result;
  try {
    result = await analyze({ root, inputs, options });
  } catch (err) {
    console.error(`内部错误：${err.message}`);
    process.exit(2);
  }

  let written = [];
  if (opts.apply) {
    try {
      written = applyFixes(root, result.fixes, { today, shortSha: result.meta.shortSha });
    } catch (err) {
      console.error(`写盘失败（未留下半成品）：${err.message}`);
      process.exit(2);
    }
    result.changedFiles = written;
  }

  const json = JSON.stringify(result, null, 2);
  console.log(json);
  if (opts.plan_out) writeFileSync(opts.plan_out, json);
  process.exit(0);
}

// 直接执行时跑 CLI；被测试导入时不触发。
const invoked = process.argv[1] && resolve(process.argv[1]) === join(here(), 'docs-sync.mjs');
if (invoked) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(`致命错误：${err.message}`);
    process.exit(1);
  });
}

function here() {
  return dirname(fileURLToPath(import.meta.url));
}
