#!/usr/bin/env node
//
// docs-sync-report：把 plan.json 里待人工判断的 reports 收敛成一段可贴进 issue 评论的 markdown。
//
// 为什么独立成模块：滚动 issue #62 正文已经被撑大过一次，再整段重写会撞 GitHub 正文上限；
// 本轮起流程侧只追加评论，评论正文必须先在预算内收敛。收敛规则是纯字符串计算，抽成可单测
// 的离屏模块，不联网、不调 gh、不读时钟，同一 plan 渲染两次逐字节一致。
//
// 收敛规则：
//   R1 同行合并：同一 (file, line) 的多条 report 合成一条，原因/建议用「；」并列。
//   R2 文件分组：文件路径升序、组内行号升序；每文件最多 --per-file 条，余量写「另有 M 条」。
//   R3 全局预算：默认 60000 字节（GitHub 上限 65536，留余量）；截断说明先算进预算，
//      不能先写完再截；超预算即停止纳入后续条目。
//   R4 固定骨架：顶部摘要行 + 各 check report 条数 + 分组条目 + 尾部 PR/Run/Artifact。
//   R5 确定性：不掺时间戳与随机，日期与 sha 一律取 plan.meta。
//
// 用法：
//   node scripts/docs-sync-report.mjs --plan <plan.json> --out <section.md>
//     [--max-chars 60000] [--per-file 10] [--run-url <url>] [--artifact <name>] [--pr <n>]
//
// stdout 一行 JSON：{"chars":N,"reports":N,"entries":N,"files":N,"truncated":bool}；
// plan 不是合法 JSON 时退出码 1。

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const byteLen = (s) => Buffer.byteLength(s ?? '', 'utf8');

const FILELESS = '（快照未提供文件）';

// --- 参数解析 ---

export function parseArgs(argv) {
  const opts = {
    plan: '',
    out: '',
    maxChars: 60000,
    perFile: 10,
    runUrl: '',
    artifact: '',
    pr: null,
  };
  const valued = new Set(['plan', 'out', 'max-chars', 'per-file', 'run-url', 'artifact', 'pr']);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    if (!valued.has(key)) continue;
    const camel = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    opts[camel] = argv[++i];
  }
  opts.maxChars = Number(opts.maxChars);
  opts.perFile = Number(opts.perFile);
  return opts;
}

function dedupe(list) {
  const out = [];
  for (const v of list ?? []) {
    if (v !== '' && v != null && !out.includes(v)) out.push(v);
  }
  return out;
}

// 按字符截断（中文计 1 字符），超出补一个省略号；省略号本身占 1 字符预算
function clip(s, max) {
  const chars = [...(s ?? '')];
  if (chars.length <= max) return s ?? '';
  return chars.slice(0, max).join('') + '…';
}

/**
 * 纯函数：读 plan，输出收敛后的评论节。
 * @param {object} plan docs-sync.mjs 产出的 plan JSON
 * @param {object} opts { maxChars, perFile, runUrl, artifact, pr }
 */
export function renderReport(plan, opts = {}) {
  const maxChars = Number(opts.maxChars ?? 60000);
  const perFile = Number(opts.perFile ?? 10);
  const runUrl = opts.runUrl ?? '';
  const artifact = opts.artifact ?? '';
  const pr = opts.pr ?? null;

  const reports = Array.isArray(plan.reports) ? plan.reports : [];
  const warnings = plan.plan && Array.isArray(plan.plan.warnings) ? plan.plan.warnings : [];

  const empty = { text: '', chars: 0, reports: reports.length, entries: 0, files: 0, truncated: false };
  if (reports.length === 0) return empty;

  // R1 同一 (file, line) 合并
  const merged = new Map();
  for (const r of reports) {
    const file = r.file ?? FILELESS;
    const line = r.line ?? 1;
    const key = `${file}:${line}`;
    let entry = merged.get(key);
    if (!entry) {
      entry = { file, line, current: r.current ?? '', reasons: [] };
      merged.set(key, entry);
    }
    entry.reasons = dedupe([...entry.reasons, r.reason]);
  }

  // R2 按文件分组并排序
  const groups = new Map();
  for (const entry of merged.values()) {
    if (!groups.has(entry.file)) groups.set(entry.file, []);
    groups.get(entry.file).push(entry);
  }
  const files = [...groups.keys()].sort((a, b) => a.localeCompare(b));
  for (const f of files) groups.get(f).sort((a, b) => a.line - b.line);

  // R4 头部：标题 + 摘要 + 各 check 的 report 条数
  const meta = plan.meta ?? {};
  const summary = plan.summary ?? { pass: 0, drift: 0, report: 0 };
  const head = [];
  head.push(`## ${meta.today ?? ''} 复核（\`${meta.shortSha ?? ''}\`）`);
  head.push('');
  head.push(`九项：${summary.pass} pass / ${summary.drift} drift / ${summary.report} report`);
  head.push('');
  for (const c of plan.checks ?? []) {
    const reportFindings = (c.findings ?? []).filter((f) => f.status === 'report');
    if (reportFindings.length === 0) continue;
    const lines = new Set(reportFindings.map((f) => `${f.file ?? FILELESS}:${f.line ?? 1}`));
    head.push(`- #${c.id} ${c.title}：${reportFindings.length} 条（${lines.size} 行）`);
  }
  // 建议不再逐条重复：统一一条图例，只出现一次
  head.push('建议统一按「该行语境判断是旧词误用还是历史记录」处理，逐条确认后改或留。');
  head.push('');

  // R4 尾部：PR / Run / Artifact
  const tail = [];
  if (pr != null && pr !== '') tail.push(`关联 PR：#${pr}`);
  if (runUrl) tail.push(`Run：${runUrl}`);
  if (artifact) tail.push(`Artifact：${artifact}`);

  // 条目先按 R2 顺序构造，再进预算挑选
  const items = [];
  for (const f of files) {
    const entries = groups.get(f);
    const kept = entries.slice(0, perFile);
    const rest = entries.length - kept.length;
    items.push({ kind: 'group', text: `### ${f}` });
    for (const e of kept) {
      // 长原文与长原因逐条截断；建议已上收到顶部图例，不重复写
      const current = clip(e.current, 60);
      const reason = clip(e.reasons.join('；'), 50);
      let line = `- [ ] \`${e.file}:${e.line}\` — ${current}`;
      if (reason) line += `；${reason}`;
      items.push({ kind: 'entry', text: line });
    }
    if (rest > 0) {
      items.push({ kind: 'rest', text: `+ 另有 ${rest} 条（同文件），完整清单见 artifact` });
    }
  }
  for (const w of warnings) items.push({ kind: 'warning', text: `- 注意：${w}` });

  // R3 预算装配：头部与尾部先占预算，条目逐条纳入；放不下即截断，截断文案也必须算进预算
  const truncNote = artifact
    ? `> 已截断：完整清单见 run artifact（${artifact}）。`
    : '> 已截断：完整清单见 run artifact。';
  const headText = head.join('\n') + '\n';
  const tailText = tail.length > 0 ? '\n' + tail.join('\n') + '\n' : '';
  let used = byteLen(headText) + byteLen(tailText);

  const body = [];
  let truncated = false;
  for (const item of items) {
    const lineText = item.text + '\n';
    if (used + byteLen(lineText) <= maxChars) {
      body.push(item.text);
      used += byteLen(lineText);
    } else {
      truncated = true;
      break;
    }
  }
  if (truncated) {
    const noteText = truncNote + '\n';
    if (used + byteLen(noteText) <= maxChars) body.push(truncNote);
  }

  const bodyText = body.length > 0 ? body.join('\n') + '\n' : '';
  const text = headText + bodyText + tailText;

  return {
    text,
    chars: byteLen(text),
    reports: reports.length,
    entries: merged.size,
    files: files.length,
    truncated,
  };
}

// --- CLI ---

export function main(argv) {
  const opts = parseArgs(argv);
  if (!opts.plan || !opts.out) {
    console.error('需要 --plan <plan.json> 与 --out <section.md>');
    return 1;
  }
  let plan;
  try {
    plan = JSON.parse(readFileSync(opts.plan, 'utf8'));
  } catch (err) {
    console.error(`plan JSON 解析失败：${err.message}`);
    return 1;
  }
  const result = renderReport(plan, opts);
  writeFileSync(opts.out, result.text);
  console.log(JSON.stringify({
    chars: result.chars,
    reports: result.reports,
    entries: result.entries,
    files: result.files,
    truncated: result.truncated,
  }));
  return 0;
}

// 直接执行时跑 CLI；被测试导入时不触发。
const invoked = process.argv[1] && resolve(process.argv[1]) === join(here(), 'docs-sync-report.mjs');
if (invoked) {
  process.exit(main(process.argv.slice(2)));
}

function here() {
  return dirname(fileURLToPath(import.meta.url));
}
