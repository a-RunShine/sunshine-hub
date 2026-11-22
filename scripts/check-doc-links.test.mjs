//
// check-doc-links.mjs 的离线单元测试（node:test + node:assert/strict）。
//

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkDocLinks, collectMarkdownSources } from './check-doc-links.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, 'check-doc-links.mjs');
const REPO_ROOT = resolve(HERE, '..');

function makeSandbox() {
  const root = mkdtempSync(join(tmpdir(), 'check-doc-links-'));
  mkdirSync(join(root, 'web'), { recursive: true });
  mkdirSync(join(root, 'CODING_STANDARDS'), { recursive: true });
  mkdirSync(join(root, 'docs', 'wiki'), { recursive: true });
  writeFileSync(join(root, 'AGENTS.md'), '# Root\n', 'utf8');
  writeFileSync(join(root, 'CODING_STANDARDS', 'typescript.md'), '# TS\n', 'utf8');
  writeFileSync(join(root, 'web', 'DESIGN.md'), '# Design\n', 'utf8');
  writeFileSync(join(root, 'web', 'AGENTS.md'), '# Web Agents\n', 'utf8');
  writeFileSync(join(root, 'docs', 'wiki', 'index.md'), '# Wiki\n- [workflow](workflow.md)\n', 'utf8');
  writeFileSync(join(root, 'docs', 'wiki', 'workflow.md'), '# Workflow\n', 'utf8');
  return root;
}

test('实仓文档扫描包含 web/AGENTS.md 与 web/DESIGN.md 且全部通过', () => {
  const res = checkDocLinks(REPO_ROOT);
  const rels = res.sources.map((p) => relative(REPO_ROOT, p).split(sep).join('/'));
  assert.ok(rels.includes('web/AGENTS.md'), '应扫描 web/AGENTS.md');
  assert.ok(rels.includes('web/DESIGN.md'), '应扫描 web/DESIGN.md');
  assert.equal(res.ok, true, `期望零断链零孤儿，实际：${JSON.stringify({ broken: res.broken, orphans: res.orphans })}`);
});

test('web/AGENTS.md 与 web/DESIGN.md 相对链接有效时校验通过', () => {
  const root = makeSandbox();
  try {
    writeFileSync(
      join(root, 'web', 'AGENTS.md'),
      '先读 [DESIGN.md](DESIGN.md) 与 [TS 规范](../CODING_STANDARDS/typescript.md)。\n',
      'utf8',
    );
    writeFileSync(
      join(root, 'web', 'DESIGN.md'),
      '参见 [Root](../AGENTS.md)。\n',
      'utf8',
    );
    const cli = spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' });
    assert.equal(cli.status, 0);
    assert.match(cli.stdout, /零断链/);
    assert.match(cli.stdout, /零孤儿/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('web/AGENTS.md 出现断链时 CLI 退出码 1 并定位文件名与行号', () => {
  const root = makeSandbox();
  try {
    writeFileSync(
      join(root, 'web', 'AGENTS.md'),
      '# Web\n参考 [不存在](../CODING_STANDARDS/missing.md)\n',
      'utf8',
    );
    const cli = spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' });
    assert.equal(cli.status, 1);
    assert.match(cli.stderr, /断链 web\/AGENTS\.md:2/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('web/DESIGN.md 出现断链时 CLI 退出码 1 并定位文件名与行号', () => {
  const root = makeSandbox();
  try {
    writeFileSync(
      join(root, 'web', 'DESIGN.md'),
      '# Design\n\n参考 [不存在](./no-such-doc.md)\n',
      'utf8',
    );
    const cli = spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' });
    assert.equal(cli.status, 1);
    assert.match(cli.stderr, /断链 web\/DESIGN\.md:3/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('忽略 node_modules / dist / .oil-ui / target / .git 中的 AGENTS.md 与 DESIGN.md', () => {
  const root = makeSandbox();
  try {
    for (const ignored of ['.git', 'node_modules', 'target', 'dist', '.oil-ui']) {
      mkdirSync(join(root, ignored), { recursive: true });
      writeFileSync(join(root, ignored, 'AGENTS.md'), '[bad](./missing.md)\n', 'utf8');
      writeFileSync(join(root, ignored, 'DESIGN.md'), '[bad](./missing.md)\n', 'utf8');
    }
    const sources = collectMarkdownSources(root).map((p) => relative(root, p).split(sep).join('/'));
    for (const ignored of ['.git', 'node_modules', 'target', 'dist', '.oil-ui']) {
      assert.ok(!sources.some((s) => s.startsWith(`${ignored}/`)), `不应扫描 ${ignored}`);
    }
    const res = checkDocLinks(root);
    assert.equal(res.ok, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('docs/wiki/ 存在未在 index.md 登记的孤儿页时失败', () => {
  const root = makeSandbox();
  try {
    writeFileSync(join(root, 'docs', 'wiki', 'orphan.md'), '# Orphan\n', 'utf8');
    const cli = spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' });
    assert.equal(cli.status, 1);
    assert.match(cli.stderr, /孤儿 docs\/wiki\/orphan\.md/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('docs/wiki/ 缺少 index.md 时标记无法判定并退出码 1', () => {
  const root = makeSandbox();
  try {
    rmSync(join(root, 'docs', 'wiki', 'index.md'));
    const cli = spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' });
    assert.equal(cli.status, 1);
    assert.match(cli.stderr, /没有 index\.md/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
