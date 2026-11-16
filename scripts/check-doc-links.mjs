#!/usr/bin/env node
//
// 扫文档里的相对 markdown 链接，校验目标存在；并检出 docs/wiki/ 的孤儿页。
// 命中即 exit 1，不做 advisory——advisory 的教训见 scripts/check-glossary.sh 与 issue #29。
//
// 为什么是脚本而不是 lychee / markdown-link-check：孤儿页检查两个工具都不做，
// 这部分代码无论如何要自己写；而 markdown-link-check 为查本地文件拖进整套 HTTP 栈
// （needle / proxy-agent / xmlbuilder2），lychee 要装 Rust 二进制，且 npm 上的
// `lychee` 是个同名数据库库，装错就是供应链事故。契约 job 已经钉了 node 22，
// 这个脚本只用标准库，零新依赖、零下载。
//
// 不校验锚点：全仓当前零条带锚点的相对链接，而 GitHub 的 slug 规则与本地渲染器
// 不一致（中文标题尤甚），现在做等于给不存在的消费者猜一套规则。见 issue #31「待定」。
// 外部链接（http/https/mailto 等）也不查，那需要网络，不确定性不该进 CI。
//
// 用法：node scripts/check-doc-links.mjs [仓库根目录]

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] ?? join(here, '..'));

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
const LINK = /\]\(([^)]*)\)/g;
const FENCE = /^\s{0,3}(`{3,}|~{3,})/;

function walkMarkdown(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMarkdown(full));
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

// 代码块与行内代码里的 `](...)` 是示例，不是链接。漏掉这层会把文档里的写法样例判断链。
function maskCodeSpans(line) {
  const runs = [];
  for (const m of line.matchAll(/`+/g)) runs.push({ start: m.index, len: m[0].length, used: false });
  // 按 UTF-16 单元拆，与 matchAll 的 m.index 同一套偏移；用码点数组会在 astral 字符处错位
  const chars = line.split('');
  for (let a = 0; a < runs.length; a++) {
    if (runs[a].used) continue;
    // 闭合 run 必须等长，否则按 CommonMark 这个 opener 只是普通文本
    const b = runs.findIndex((r, i) => i > a && !r.used && r.len === runs[a].len);
    if (b === -1) continue;
    runs[a].used = runs[b].used = true;
    for (let k = runs[a].start; k < runs[b].start + runs[b].len; k++) chars[k] = ' ';
  }
  return chars.join('');
}

function extractLinks(file) {
  const found = [];
  let fence = null;
  const lines = readFileSync(file, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const f = line.match(FENCE);
    if (f) {
      if (!fence) fence = f[1];
      else if (f[1][0] === fence[0] && f[1].length >= fence.length) fence = null;
      continue;
    }
    if (fence) continue;

    for (const m of maskCodeSpans(line).matchAll(LINK)) {
      let raw = m[1].trim();
      if (raw.startsWith('<') && raw.endsWith('>')) raw = raw.slice(1, -1);
      else raw = raw.split(/\s+/)[0];
      if (!raw || EXTERNAL.test(raw)) continue;

      const path = raw.split('#')[0];
      if (!path) continue; // 纯锚点

      let decoded = path;
      try {
        decoded = decodeURIComponent(path);
      } catch {
        // 落单的 % 不是合法转义，按原样当路径查
      }
      found.push({ line: i + 1, raw, target: resolve(dirname(file), decoded) });
    }
  }
  return found;
}

const sources = [
  ...walkMarkdown(join(root, 'docs')),
  ...['AGENTS.md', 'GLOSSARY.md'].map((n) => join(root, n)).filter(existsSync),
  ...walkMarkdown(join(root, 'CODING_STANDARDS')),
].sort();

const broken = [];
const linksByFile = new Map();
let total = 0;

for (const file of sources) {
  const links = extractLinks(file);
  linksByFile.set(file, links);
  total += links.length;
  for (const link of links) {
    if (!existsSync(link.target)) broken.push({ file, ...link });
  }
}

const wikiDir = join(root, 'docs', 'wiki');
const indexPath = join(wikiDir, 'index.md');
const orphans = [];
let wikiNote;
let wikiUnjudgeable = false;

if (!existsSync(wikiDir)) {
  wikiNote = 'docs/wiki/ 不存在，跳过孤儿检查。';
} else if (!existsSync(indexPath)) {
  wikiNote = 'docs/wiki/ 存在但没有 index.md，无法判定登记关系。';
  wikiUnjudgeable = true;
} else {
  const pages = walkMarkdown(wikiDir).filter((p) => p !== indexPath);
  const registered = new Set((linksByFile.get(indexPath) ?? []).map((l) => l.target));
  for (const page of pages) {
    if (!registered.has(page)) orphans.push({ file: page, reason: '未被 docs/wiki/index.md 登记' });
  }
  wikiNote = `docs/wiki/ ${pages.length + 1} 页：${orphans.length ? `${orphans.length} 个孤儿` : '零孤儿'}。`;
}

const rel = (p) => (p.startsWith(root) ? p.slice(root.length + 1) : p);

for (const b of broken) {
  console.error(`断链 ${rel(b.file)}:${b.line}  ${b.raw}  目标不存在`);
}
for (const o of orphans) {
  console.error(`孤儿 ${rel(o.file)}  ${o.reason}`);
}
if (wikiUnjudgeable) console.error(`孤儿检查无法进行：${wikiNote}`);

console.log(`扫 ${sources.length} 个文件、${total} 条相对链接：${broken.length ? `${broken.length} 条断链` : '零断链'}。`);
console.log(wikiNote);

process.exit(broken.length || orphans.length || wikiUnjudgeable ? 1 : 0);