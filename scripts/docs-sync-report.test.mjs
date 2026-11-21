//
// docs-sync-report.mjs 的离屏断言测试。只用 node:test + node:assert，不联网、不跑 git/gh、
// 不依赖真实时钟：plan 日期与 sha 一律显式写死，渲染结果必须确定性可复跑。
//

import test from 'node:test';
import assert from 'node:assert/strict';

import { renderReport } from './docs-sync-report.mjs';

function makePlan(reports, extra = {}) {
  return {
    meta: { today: '2026-11-21', shortSha: '7c72ab7' },
    summary: { pass: 6, drift: 3, report: reports.length },
    checks: [],
    reports,
    plan: { warnings: [] },
    ...extra,
  };
}

function rep(file, line, reason, suggestion) {
  return { file, line, current: `第 ${line} 行原文`, reason, suggestion };
}

test('同一 (file, line) 的多条 report 合并成一条，原因用「；」并列；建议图例只出现一次', () => {
  const reports = [
    rep('docs/wiki/open-loops.md', 12, '原因 A', '建议 A'),
    rep('docs/wiki/open-loops.md', 12, '原因 B', '建议 B'),
  ];
  const r = renderReport(makePlan(reports), {});
  assert.equal(r.reports, 2);
  assert.equal(r.entries, 1);
  assert.equal(r.files, 1);
  assert.match(r.text, /原因 A；原因 B/);
  // 建议不再逐条写进条目，只留顶部统一图例一条
  assert.doesNotMatch(r.text, /建议 A/);
  assert.equal((r.text.match(/建议统一按/g) ?? []).length, 1);
  // 合并后同一条位置只出现一次行号
  assert.equal((r.text.match(/open-loops\.md:12/g) ?? []).length, 1);
});

test('每文件最多保留 --per-file 条，余量写「另有 M 条」', () => {
  const reports = Array.from({ length: 12 }, (_, i) =>
    rep('docs/wiki/glossary-hits.md', i + 1, `命中 ${i + 1}`, `核对 ${i + 1}`));
  const r = renderReport(makePlan(reports), { perFile: 10 });
  assert.equal(r.entries, 12);
  assert.equal(r.files, 1);
  assert.match(r.text, /\+ 另有 2 条（同文件），完整清单见 artifact/);
  // 前 10 条行号在正文中，第 12 条不在
  assert.match(r.text, /glossary-hits\.md:10/);
  assert.doesNotMatch(r.text, /glossary-hits\.md:12/);
});

test('800 字符长 current 截到 60 字符 + …，长 reason 截到 50；整体仍 ≤ 上限', () => {
  const reports = [{
    file: 'docs/wiki/long.md',
    line: 7,
    current: '中'.repeat(800),
    reason: '由'.repeat(200),
    suggestion: '逐条建议不应出现',
  }];
  const r = renderReport(makePlan(reports), { maxChars: 60000 });
  assert.ok(r.chars <= 60000);
  const entry = r.text.split('\n').find((l) => l.includes('long.md:7'));
  const currentSeg = entry.split('— ')[1].split('；')[0];
  // 60 字符正文 + 1 字符省略号
  assert.equal([...currentSeg].length, 61);
  assert.ok(currentSeg.endsWith('…'));
  assert.doesNotMatch(r.text, /逐条建议不应出现/);
});

test('5000 条 report 时输出仍 ≤ 上限；若截断则说明落在末行', () => {
  const reports = [];
  for (let i = 0; i < 5000; i++) {
    const file = `docs/wiki/page-${String(i % 50).padStart(2, '0')}.md`;
    reports.push(rep(file, (i % 100) + 1, `排除词命中 ${i}`, `人工核对 ${i}`));
  }
  const r = renderReport(makePlan(reports), { maxChars: 60000, perFile: 10 });
  assert.ok(r.chars <= 60000, `chars ${r.chars} 超过上限 60000`);
  // 紧凑条目下即使不截断也必须放下；若仍触发截断，说明要落在末行
  if (r.truncated) {
    assert.match(r.text, /> 已截断：完整清单见 run artifact/);
    const lines = r.text.trim().split('\n');
    assert.match(lines[lines.length - 1], /^> 已截断/);
  }
});

test('零 report：正文为空、计数全零、不发评论也不为它写截断说明', () => {
  const r = renderReport(makePlan([]), {});
  assert.equal(r.text, '');
  assert.equal(r.chars, 0);
  assert.equal(r.reports, 0);
  assert.equal(r.entries, 0);
  assert.equal(r.files, 0);
  assert.equal(r.truncated, false);
});

test('同一 plan 渲染两次逐字节一致（不掺时间戳/随机）', () => {
  const reports = [
    rep('docs/wiki/b.md', 3, 'b 行 3 原因', 'b 建议'),
    rep('docs/wiki/a.md', 1, 'a 行 1 原因', 'a 建议'),
    rep('docs/wiki/a.md', 5, 'a 行 5 原因', 'a 建议'),
  ];
  const plan = makePlan(reports, {
    checks: [{ id: 7, title: '排除词', status: 'report', findings: [] }],
  });
  const r1 = renderReport(plan, { runUrl: 'https://example.test/run/1', artifact: 'docs-sync-1', pr: 41 });
  const r2 = renderReport(plan, { runUrl: 'https://example.test/run/1', artifact: 'docs-sync-1', pr: 41 });
  assert.equal(Buffer.from(r1.text).compare(Buffer.from(r2.text)), 0);
  assert.deepEqual(
    { chars: r1.chars, reports: r1.reports, entries: r1.entries, files: r1.files, truncated: r1.truncated },
    { chars: r2.chars, reports: r2.reports, entries: r2.entries, files: r2.files, truncated: r2.truncated });
});

test('文件路径升序、组内行号升序；尾部 PR/Run/Artifact 各就各位', () => {
  const reports = [
    rep('docs/wiki/b.md', 9, 'b9', '建议'),
    rep('docs/wiki/a.md', 3, 'a3', '建议'),
    rep('docs/wiki/a.md', 1, 'a1', '建议'),
  ];
  const r = renderReport(makePlan(reports), { runUrl: 'https://example.test/run/9', artifact: 'docs-sync-9', pr: 41 });
  const aPos = r.text.indexOf('### docs/wiki/a.md');
  const bPos = r.text.indexOf('### docs/wiki/b.md');
  assert.ok(aPos < bPos, '文件路径升序');
  const l1 = r.text.indexOf('a.md:1');
  const l3 = r.text.indexOf('a.md:3');
  assert.ok(l1 < l3, '组内行号升序');
  assert.match(r.text, /关联 PR：#41/);
  assert.match(r.text, /Run：https:\/\/example\.test\/run\/9/);
  assert.match(r.text, /Artifact：docs-sync-9/);
});
