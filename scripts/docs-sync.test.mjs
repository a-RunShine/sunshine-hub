//
// docs-sync.mjs 的离屏断言测试。只用 node:test + node:assert，不联网、不跑 git/gh、
// 不依赖真实时钟：复核日期一律显式 --today，轮询状态源走注入帧。
//
// 夹具布局：docs-sync-fixtures/<case>/repo 是被检仓库副本，inputs 是流程侧喂进来的快照。
// 期望数字在夹具里写死，不用生产代码反算一遍。

import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, rmSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { analyze, applyFixes, createIssueStateSource, parseArgs } from './docs-sync.mjs';

const FIX = join(dirname(fileURLToPath(import.meta.url)), 'docs-sync-fixtures');

// 只读用例共享一份 pristine 副本，避免每个用例重复复制/删除夹具目录。
const pristine = new Map();

function sandbox(fixture, { shared = false } = {}) {
  if (shared) {
    if (!pristine.has(fixture)) {
      const root = join(homedir(), `.docs-sync-pristine-${process.pid}-${fixture}`);
      cpSync(join(FIX, fixture, 'repo'), root, { recursive: true });
      pristine.set(fixture, root);
    }
    return pristine.get(fixture);
  }
  const root = join(homedir(), `.docs-sync-test-${process.pid}-${Math.random().toString(36).slice(2)}`);
  cpSync(join(FIX, fixture, 'repo'), root, { recursive: true });
  return root;
}

function cleanup(root) {
  if ([...pristine.values()].includes(root)) return;
  rmSync(root, { recursive: true, force: true });
}

const emptyInputs = {
  issues: { provided: false, items: [] },
  prs: { provided: false, items: [] },
  mergedPrs: { provided: false, items: [] },
  issueStates: { provided: false, items: [] },
  gitShas: { provided: false, items: [] },
  triggerPrBody: { provided: false, text: '' },
};

function runAnalyze(root, inputs = {}, options = {}) {
  return analyze({
    root,
    inputs: { ...emptyInputs, ...inputs },
    options: { today: '2026-11-20', mainSha: '9ff45bd', ...options },
  });
}

function treeHash(root) {
  const hash = createHash('sha256');
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else hash.update(relative(root, full)).update(readFileSync(full));
    }
  };
  walk(root);
  return hash.digest('hex');
}

const checkById = (result, id) => result.checks.find((c) => c.id === id);

// --- 夹具 1：ADR 计数与索引行 ---

test('ADR 计数漂移：断言 2 份 vs 实测 3 份，产出份数更正块', async () => {
  const root = sandbox('adr-drift', { shared: true });
  try {
    const result = await runAnalyze(root);
    const c1 = checkById(result, 1);
    assert.equal(c1.status, 'drift');
    const block = result.fixes.find((f) => f.kind === 'correction-block');
    assert.ok(block, '应有一条更正块 fix');
    assert.deepEqual(block.facts, ['ADR 共 3 份']);
    assert.equal(result.plan.shouldCreateBranch, true);
  } finally {
    cleanup(root);
  }
});

test('索引缺行：0003 按编号补进表内正确位置', async () => {
  const root = sandbox('adr-drift');
  try {
    const result = await runAnalyze(root);
    const row = result.fixes.find((f) => f.kind === 'index-row');
    assert.ok(row, '应有一条索引补行 fix');
    assert.equal(row.after, '| [0003](../adr/0003-three.md) | 第三份决策 |');

    applyFixes(root, result.fixes, { today: '2026-11-20', shortSha: '9ff45bd' });
    const decisions = readFileSync(join(root, 'docs/wiki/decisions.md'), 'utf8');
    const rows = decisions.split('\n').filter((l) => /^\|\s*\[/.test(l));
    assert.deepEqual(rows.map((r) => r.match(/\[(\d{4})\]/)[1]), ['0001', '0002', '0003']);
  } finally {
    cleanup(root);
  }
});

test('索引标题与 ADR 标题不一致：只报告，不自动改', async () => {
  const root = sandbox('adr-drift', { shared: true });
  try {
    const result = await runAnalyze(root);
    const report = result.reports.find((r) => r.reason.includes('标题'));
    assert.ok(report, '应有标题不一致的 report');
    assert.match(report.current, /错误标题/);
    const rowFix = result.fixes.find((f) => f.kind === 'index-row' && f.adr.num === '0002');
    assert.equal(rowFix, undefined);
  } finally {
    cleanup(root);
  }
});

// --- 夹具 2：path / operation 计数 ---

test('OpenAPI 计数漂移：合成一条更正块，旧句逐字保留', async () => {
  const root = sandbox('openapi-drift');
  try {
    const result = await runAnalyze(root);
    const c2 = checkById(result, 2);
    assert.equal(c2.status, 'drift');
    const block = result.fixes.find((f) => f.kind === 'correction-block');
    assert.deepEqual(block.facts, ['api/openapi.yaml 实测 2 个 path、3 个 operation']);

    applyFixes(root, result.fixes, { today: '2026-11-20', shortSha: '9ff45bd' });
    const stages = readFileSync(join(root, 'docs/wiki/stages.md'), 'utf8');
    assert.match(stages, /38 个 path/);
    assert.match(stages, /40 个 operation/);
    assert.match(stages, /2026-11-20 复核（main `9ff45bd`）/);
  } finally {
    cleanup(root);
  }
});

// --- 夹具 3：历史段只读 ---

test('历史断言行 apply 后逐字节未变，更正块插在 <details> 之前', async () => {
  const root = sandbox('historical');
  try {
    const result = await runAnalyze(root);
    assert.equal(checkById(result, 1).status, 'drift');

    applyFixes(root, result.fixes, { today: '2026-11-20', shortSha: '9ff45bd' });
    const text = readFileSync(join(root, 'docs/wiki/decisions.md'), 'utf8');
    const lines = text.split('\n');

    const historicalLine = lines.find((l) => l.includes('13 份 ADR'));
    assert.equal(historicalLine, '**现行：13 份 ADR**（2026-11-16 复核，`main` = `3701bd4`，`ls docs/adr/*.md | wc -l` = 13）。');

    const blockIdx = lines.findIndex((l) => l.includes('复核（main `9ff45bd`）'));
    const detailsIdx = lines.findIndex((l) => /^<details>/.test(l));
    assert.ok(blockIdx >= 0 && detailsIdx >= 0);
    assert.ok(blockIdx < detailsIdx, '更正块必须在第一个 <details> 之前');
    assert.match(lines[blockIdx], /ADR 共 1 份/);
  } finally {
    cleanup(root);
  }
});

// --- 夹具 4：链接唯一解析 / 歧义 / 零命中 ---

test('链接旧目标不存在且 basename 唯一命中：原地替换目标', async () => {
  const root = sandbox('links');
  try {
    const result = await runAnalyze(root);
    const fix = result.fixes.find((f) => f.kind === 'link-replace');
    assert.ok(fix, '应有一条链接替换 fix');
    assert.match(fix.after, /\]\(\.\.\/shared\/old-claim\.md\)/);

    applyFixes(root, result.fixes, { today: '2026-11-20', shortSha: '9ff45bd' });
    const alpha = readFileSync(join(root, 'docs/wiki/alpha.md'), 'utf8');
    assert.match(alpha, /\.\.\/shared\/old-claim\.md/);
  } finally {
    cleanup(root);
  }
});

test('链接歧义与零命中：只报告，不改文件', async () => {
  const root = sandbox('links', { shared: true });
  try {
    const result = await runAnalyze(root);
    const reasons = result.reports.map((r) => r.reason);
    assert.ok(reasons.some((r) => r.includes('歧义')));
    assert.ok(reasons.some((r) => r.includes('零命中')));
    const linkFixes = result.fixes.filter((f) => f.kind === 'link-replace');
    assert.equal(linkFixes.length, 1, '只有唯一命中那一条进 fixes');
  } finally {
    cleanup(root);
  }
});

// --- fixes 镜像真实写入（补丁 3.1） ---

test('fixes 描述真实写入：after/insertAtLine 非空，apply 后逐字落位且条数等于新增块数', async () => {
  const root = sandbox('openapi-drift');
  try {
    const result = await runAnalyze(root);
    const blocks = result.fixes.filter((f) => f.kind === 'correction-block');
    assert.equal(blocks.length, 1, '本夹具应只有一条更正块');
    for (const b of blocks) {
      assert.ok(b.after, 'after 必须非空');
      assert.ok(b.insertAtLine > 0, 'insertAtLine 必须非空且为 1-based');
    }

    applyFixes(root, result.fixes, { today: '2026-11-20', shortSha: '9ff45bd' });
    const lines = readFileSync(join(root, 'docs/wiki/stages.md'), 'utf8').split('\n');
    for (const b of blocks) {
      assert.equal(lines[b.insertAtLine - 1], b.after, '新增行逐字落在 insertAtLine 位置');
    }
    const inserted = lines.filter((l) => l.includes('2026-11-20 复核'));
    assert.equal(inserted.length, blocks.length, '实际新增块数与 fixes 条数一致');
  } finally {
    cleanup(root);
  }
});

test('索引补行 fix：after 为逐字新行，insertAtLine 指向该行', async () => {
  const root = sandbox('adr-drift');
  try {
    const result = await runAnalyze(root);
    const row = result.fixes.find((f) => f.kind === 'index-row');
    assert.ok(row);
    assert.ok(row.after, 'after 非空');
    assert.ok(row.insertAtLine > 0);

    applyFixes(root, result.fixes, { today: '2026-11-20', shortSha: '9ff45bd' });
    const lines = readFileSync(join(root, 'docs/wiki/decisions.md'), 'utf8').split('\n');
    assert.equal(lines[row.insertAtLine - 1], row.after);
  } finally {
    cleanup(root);
  }
});

// --- 原子落盘（补丁 3.4） ---

test('原子落盘：第二个文件校验失败，两个文件都保持原样', async () => {
  const root = sandbox('links');
  try {
    const alphaPath = join(root, 'docs/wiki/alpha.md');
    const claimPath = join(root, 'docs/adr/0001-claim.md');
    const beforeAlpha = readFileSync(alphaPath, 'utf8');
    const beforeClaim = readFileSync(claimPath, 'utf8');

    const fixes = [
      {
        file: 'docs/wiki/alpha.md', line: 2, kind: 'link-replace',
        before: '[唯一命中](../adr/old-claim.md)',
        after: '- [唯一命中](../shared/old-claim.md)', insertAtLine: 2,
      },
      {
        file: 'docs/adr/0001-claim.md', line: 1, kind: 'link-replace',
        before: '[不存在](../x.md)', after: '[不存在](../x.md)', insertAtLine: 1,
      },
    ];
    assert.throws(() => applyFixes(root, fixes, { today: '2026-11-20', shortSha: '9ff45bd' }));
    assert.equal(readFileSync(alphaPath, 'utf8'), beforeAlpha, '第一个文件未被改写');
    assert.equal(readFileSync(claimPath, 'utf8'), beforeClaim, '第二个文件未被改写');
  } finally {
    cleanup(root);
  }
});

// --- open issue 计数：扫全部断言，按小节合并（补丁 3.2） ---

test('open issue 计数：不同小节各一条更正块，历史旧句逐字保留', async () => {
  const root = sandbox('issue-drift');
  try {
    const result = await runAnalyze(root, {
      issues: {
        provided: true,
        items: [
          { number: 3, title: '文档审查', state: 'OPEN' },
          { number: 7, title: '实施路径', state: 'OPEN' },
        ],
      },
    });
    const blocks = result.fixes.filter((f) => f.kind === 'correction-block' && f.file === 'docs/wiki/stages.md');
    assert.equal(blocks.length, 2, '两个小节各一条汇总更正');

    applyFixes(root, result.fixes, { today: '2026-11-20', shortSha: '9ff45bd' });
    const lines = readFileSync(join(root, 'docs/wiki/stages.md'), 'utf8').split('\n');
    assert.ok(lines.some((l) => l.includes('快照（六个）')), '历史快照旧句保留');
    const inserted = lines.filter((l) => l.includes('2026-11-20 复核'));
    assert.equal(inserted.length, 2);
  } finally {
    cleanup(root);
  }
});

test('历史标题与日期/SHA/版本号不被当成计数，更正块不进历史小节', async () => {
  const root = sandbox('issue-hist-heading');
  try {
    const issues = [3, 7, 27, 59, 31].map((number) => ({ number, title: 'x', state: 'OPEN' }));
    const result = await runAnalyze(root, { issues: { provided: true, items: issues } });
    const c3 = checkById(result, 3);
    // (a) 不出现把年份 2026 当成「2026 个 open issue」
    assert.ok(!c3.findings.some((f) => f.detail.includes('2026 个')));
    // (b) 标题行不被当作断言来源、不进「原「…」」引用
    assert.ok(!c3.findings.some((f) => /旧快照/.test(f.current)));
    const blocks = result.fixes.filter((f) => f.kind === 'correction-block');
    assert.equal(blocks.length, 1, '只有现行小节那条真断言产块');
    assert.ok(!blocks[0].oldFragments.some((o) => o.includes('旧快照')));
    assert.ok(!blocks[0].after.includes('2026 个'));

    applyFixes(root, result.fixes, { today: '2026-11-20', shortSha: '9ff45bd' });
    const lines = readFileSync(join(root, 'docs/wiki/stages.md'), 'utf8').split('\n');
    const headingIdx = lines.findIndex((l) => /^### 旧快照/.test(l));
    const blockIdx = lines.findIndex((l) => l.includes('2026-11-20 复核'));
    assert.ok(blockIdx >= 0 && headingIdx >= 0 && blockIdx < headingIdx, '更正块在历史小节之前');
    assert.match(lines[headingIdx], /### 旧快照（2026-11-16，superseded）/, '历史标题逐字节保留');
  } finally {
    cleanup(root);
  }
});

test('日期与 commit SHA 里的数字都不被当成 open issue 计数', async () => {
  const root = sandbox('issue-hist-heading', { shared: true });
  const issues = [3, 7, 27, 59, 31].map((number) => ({ number, title: 'x', state: 'OPEN' }));
  const result = await runAnalyze(root, { issues: { provided: true, items: issues } });
  const c3 = checkById(result, 3);
  const noisy = c3.findings.filter((f) => /3701bd4|v2\.10\.3|2026-11-16/.test(f.current));
  assert.equal(noisy.length, 0, 'SHA / 版本号 / 日期行不产生计数断言');
});

test('集合差异：编号指向首次出现行，未列出的回退快照小节标题', async () => {
  const root = sandbox('issue-drift', { shared: true });
  try {
    const result = await runAnalyze(root, {
      issues: { provided: true, items: [{ number: 3, title: 'a', state: 'OPEN' }, { number: 7, title: 'b', state: 'OPEN' }] },
    });
    const f2 = result.reports.find((r) => r.current === '#2');
    assert.equal(f2.line, 9, '#2 指向快照行');
    const f7 = result.reports.find((r) => r.current === '#7');
    assert.equal(f7.line, 7, '#7 未列出，回退首个快照小节标题行');
  } finally {
    cleanup(root);
  }
});

// --- 索引集合比对（补丁 3 第 4 项） ---

test('索引集合：多余行与重复编号进 report，不自动补幽灵编号', async () => {
  const root = sandbox('index-set', { shared: true });
  try {
    const result = await runAnalyze(root);
    const reasons = result.reports.map((r) => r.reason);
    assert.ok(reasons.some((r) => r.includes('无对应 ADR')), '多余索引行进 report');
    assert.ok(reasons.some((r) => r.includes('重复')), '重复编号进 report');
    const rowFixes = result.fixes.filter((f) => f.kind === 'index-row');
    assert.equal(rowFixes.length, 0, '0001/0002 已在表内；幽灵编号 0009 不自动补');
  } finally {
    cleanup(root);
  }
});

// --- 夹具 5：Closes 延迟检查 ---

test('Closes 两帧状态：第一次 OPEN，重读一次后 CLOSED 即收敛，不真等', async () => {
  const frames = [[{ number: 33, state: 'OPEN' }], [{ number: 33, state: 'CLOSED' }]];
  const source = createIssueStateSource({ frames, sleep: async () => {}, now: () => 0 });
  const settled = await source.waitUntilClosed([33], { deadlineMs: 100000, intervalMs: 1 });
  assert.equal(settled, true);
  assert.equal(source.stateOf(33), 'CLOSED');
});

test('Closes 关联 issue 一直未关闭：进 report，不产 fix', async () => {
  const root = sandbox('closes', { shared: true });
  try {
    const result = await runAnalyze(root, {
      triggerPrBody: { provided: true, text: 'Closes #33' },
      issueStates: { provided: true, items: [{ number: 33, state: 'OPEN' }] },
    });
    const c8 = checkById(result, 8);
    assert.equal(c8.status, 'report');
    assert.ok(result.reports.some((r) => r.current === '#33'));
    assert.equal(result.fixes.length, 0);
  } finally {
    cleanup(root);
  }
});

test('apply 模式重读状态源：第二帧转 CLOSED 即收敛，不真等', async () => {
  const root = sandbox('closes', { shared: true });
  try {
    let calls = 0;
    const reload = async () => {
      calls += 1;
      return [{ number: 33, state: 'CLOSED' }];
    };
    const result = await runAnalyze(root, {
      triggerPrBody: { provided: true, text: 'Fixes #33' },
      issueStates: { provided: true, items: [{ number: 33, state: 'OPEN' }] },
    }, { apply: true, pollCloses: 120000, statesReload: reload });
    const c8 = checkById(result, 8);
    assert.equal(c8.status, 'pass');
    assert.equal(calls, 1, '重读一次后收敛');
    assert.equal(result.fixes.length, 0);
  } finally {
    cleanup(root);
  }
});

test('issue-states-cmd 假命令：走子进程重读，第二帧即收敛，总耗时 <2s', async () => {
  const root = sandbox('closes', { shared: true });
  try {
    const counter = join(root, '.state-counter');
    const script = join(FIX, 'closes-cmd', 'fake-state.mjs');
    const cmd = `node ${script} ${counter} 33`;
    const start = Date.now();
    const result = await runAnalyze(root, {
      triggerPrBody: { provided: true, text: 'Closes #33' },
      issueStates: { provided: true, items: [{ number: 33, state: 'OPEN' }] },
    }, { apply: true, pollCloses: 120000, issueStatesCmd: cmd });
    const elapsed = Date.now() - start;
    const c8 = checkById(result, 8);
    assert.equal(c8.status, 'pass');
    assert.ok(elapsed < 2000, `总耗时 ${elapsed}ms，应 < 2000ms`);
    assert.equal(result.warnings.length, 0);
    assert.equal(result.fixes.length, 0);
  } finally {
    cleanup(root);
  }
});

test('poll-closes 0：不进入等待循环，不执行重读命令', async () => {
  const root = sandbox('closes', { shared: true });
  try {
    // 该命令若被执行会以非零退出；pollCloses=0 时循环不得进入。
    const result = await runAnalyze(root, {
      triggerPrBody: { provided: true, text: 'Closes #33' },
      issueStates: { provided: true, items: [{ number: 33, state: 'OPEN' }] },
    }, { apply: true, pollCloses: 0, issueStatesCmd: 'node -e "process.exit(1)"' });
    const c8 = checkById(result, 8);
    assert.equal(c8.status, 'report');
    assert.equal(result.warnings.length, 0);
  } finally {
    cleanup(root);
  }
});

test('增量模式缺触发 PR 正文：第 8 项 report 注明来源缺失', async () => {
  const root = sandbox('closes', { shared: true });
  try {
    const result = await runAnalyze(root, {});
    const c8 = checkById(result, 8);
    assert.equal(c8.status, 'report');
    assert.ok(c8.findings.some((f) => f.detail.includes('未提供触发 PR 正文')));
  } finally {
    cleanup(root);
  }
});

test('dry-run 不等待不重读：meta 记 pollSkipped', async () => {
  const root = sandbox('closes', { shared: true });
  try {
    let calls = 0;
    const reload = async () => { calls += 1; return [{ number: 33, state: 'CLOSED' }]; };
    const result = await runAnalyze(root, {
      triggerPrBody: { provided: true, text: 'Closes #33' },
      issueStates: { provided: true, items: [{ number: 33, state: 'OPEN' }] },
      statesReload: reload,
    }, { dryRun: true, pollCloses: 120000 });
    assert.equal(result.meta.pollSkipped, true);
    assert.equal(calls, 0, 'dry-run 不触发重读');
  } finally {
    cleanup(root);
  }
});

// --- 夹具 6：无漂移 ---

test('无漂移 dry-run：不建分支，工作区内容哈希不变', async () => {
  const root = sandbox('clean', { shared: true });
  const before = treeHash(root);
  const result = await runAnalyze(root, {
    issues: { provided: true, items: [{ number: 3, title: '文档审查', state: 'OPEN', labels: [] }] },
  }, { dryRun: true });
  assert.equal(result.plan.shouldCreateBranch, false);
  assert.equal(result.fixes.length, 0);
  assert.equal(treeHash(root), before);
  cleanup(root);
});

test('无漂移 apply：不建分支，文件内容与 mtime 不变', async () => {
  const root = sandbox('clean');
  const before = treeHash(root);
  const result = await runAnalyze(root, {
    issues: { provided: true, items: [{ number: 3, title: '文档审查', state: 'OPEN', labels: [] }] },
  });
  assert.equal(result.plan.shouldCreateBranch, false);
  const written = applyFixes(root, result.fixes, { today: '2026-11-20', shortSha: '9ff45bd' });
  assert.deepEqual(written, []);
  assert.equal(treeHash(root), before);
  cleanup(root);
});

// --- 幂等：同一份输入 apply 两次，第二次无重复更正块 ---

test('apply 幂等：第二轮 fixes 为空，更正块不重复追加', async () => {
  const root = sandbox('adr-drift');
  try {
    const first = await runAnalyze(root);
    applyFixes(root, first.fixes, { today: '2026-11-20', shortSha: '9ff45bd' });

    const second = await runAnalyze(root);
    assert.equal(second.fixes.length, 0, '第二轮不应再有 fix');
    applyFixes(root, second.fixes, { today: '2026-11-20', shortSha: '9ff45bd' });

    const decisions = readFileSync(join(root, 'docs/wiki/decisions.md'), 'utf8');
    const blocks = decisions.split('\n').filter((l) => l.includes('2026-11-20 复核') && l.includes('9ff45bd'));
    assert.equal(blocks.length, 1, '同一轮更正块只存在一条');
  } finally {
    cleanup(root);
  }
});

// --- 幂等：已有更正块按事实覆盖，不重复追加（事实变了才再补） ---

const fiveOpenIssues = [3, 7, 27, 29, 59].map((number) => ({ number, title: 'x', state: 'OPEN' }));

test('已更正覆盖：同小节块事实一致 → fixes=0，两遍 apply 文件逐字节不变', async () => {
  const root = sandbox('idem-covered');
  const before = treeHash(root);
  try {
    const first = await runAnalyze(root, { issues: { provided: true, items: fiveOpenIssues } });
    assert.equal(first.fixes.length, 0);
    assert.equal(first.plan.shouldCreateBranch, false);
    assert.deepEqual(first.changedFiles, []);

    const c2 = checkById(first, 2);
    const c3 = checkById(first, 3);
    assert.ok(c2.findings.some((f) => f.status === 'pass' && f.detail.includes('c55ccb6') && f.detail.includes('2026-11-19')));
    assert.ok(c3.findings.some((f) => f.status === 'pass' && f.detail.includes('c55ccb6') && f.detail.includes('2026-11-19')));

    applyFixes(root, first.fixes, { today: '2026-11-20', shortSha: 'abf8a35' });
    assert.equal(treeHash(root), before, '第一遍 apply 后文件不变');

    const second = await runAnalyze(root, { issues: { provided: true, items: fiveOpenIssues } });
    assert.equal(second.fixes.length, 0);
    applyFixes(root, second.fixes, { today: '2026-11-20', shortSha: 'abf8a35' });
    assert.equal(treeHash(root), before, '第二遍 apply 后文件仍不变');
  } finally {
    cleanup(root);
  }
});

test('反例：已有块陈述旧事实（6），实际变为 5 → 仍产出新块', async () => {
  const root = sandbox('idem-stale-block');
  try {
    const result = await runAnalyze(root, { issues: { provided: true, items: fiveOpenIssues } });
    const blocks = result.fixes.filter((f) => f.kind === 'correction-block');
    assert.ok(blocks.length >= 1, '事实已变，不能因为有块就闭嘴');
    assert.ok(blocks.some((b) => b.facts.includes('open issue 5 个')));
    assert.equal(result.plan.shouldCreateBranch, true);
  } finally {
    cleanup(root);
  }
});

test('更正块行自身的计数字样不被当成断言，不产生嵌套引用', async () => {
  const root = sandbox('idem-covered', { shared: true });
  const blockRef = new RegExp('复核（main');
  try {
    const result = await runAnalyze(root, { issues: { provided: true, items: fiveOpenIssues } });
    const c3 = checkById(result, 3);
    assert.ok(!c3.findings.some((f) => blockRef.test(f.current)), '块行不进断言来源');
    const blocks = result.fixes.filter((f) => f.kind === 'correction-block');
    assert.ok(blocks.every((b) => !b.oldFragments.some((o) => blockRef.test(o))), '块行不进「原「…」」引用');
  } finally {
    cleanup(root);
  }
});

// --- 第 4 项缺输入 ---

test('未提供 git 历史输入：第 4 项 report 注明来源缺失', async () => {
  const root = sandbox('clean', { shared: true });
  try {
    const result = await runAnalyze(root);
    const c4 = checkById(result, 4);
    assert.equal(c4.status, 'report');
    assert.ok(c4.findings.some((f) => f.detail.includes('未提供 git 历史输入')));
  } finally {
    cleanup(root);
  }
});

// --- plan 去重决策 ---

const planPr = (number, headRefName, reviewDecision, createdAt) => ({
  number, title: 'docs', body: '', headRefName, reviewDecision, createdAt,
});

async function planWith(prs) {
  const root = sandbox('clean', { shared: true });
  try {
    const result = await runAnalyze(root, { prs: { provided: true, items: prs } });
    return result.plan;
  } finally {
    cleanup(root);
  }
}

test('plan：0 个开放 sync PR → 新开 docs/sync-<short>', async () => {
  const plan = await planWith([]);
  assert.equal(plan.branch, 'docs/sync-9ff45bd');
  assert.equal(plan.reuseExistingPr, null);
});

test('plan：1 个未审批 → 复用该分支', async () => {
  const plan = await planWith([planPr(41, 'docs/sync-9ff45bd', '', '2026-11-20T00:00:00Z')]);
  assert.equal(plan.reuseExistingPr.number, 41);
  assert.equal(plan.branch, 'docs/sync-9ff45bd');
  assert.equal(plan.commitMessage, 'docs: 同步 9ff45bd 的文档事实');
});

test('plan：1 个 APPROVED → 新开 -2，不复用', async () => {
  const plan = await planWith([planPr(42, 'docs/sync-9ff45bd', 'APPROVED', '2026-11-20T00:00:00Z')]);
  assert.equal(plan.reuseExistingPr, null);
  assert.equal(plan.branch, 'docs/sync-9ff45bd-2');
});

test('plan：1 个 CHANGES_REQUESTED → 新开 -2，不复用', async () => {
  const plan = await planWith([planPr(43, 'docs/sync-9ff45bd', 'CHANGES_REQUESTED', '2026-11-20T00:00:00Z')]);
  assert.equal(plan.reuseExistingPr, null);
  assert.equal(plan.branch, 'docs/sync-9ff45bd-2');
});

test('plan：多个开放 → 取最早复用，其余进 warnings', async () => {
  const plan = await planWith([
    planPr(44, 'docs/sync-old', '', '2026-11-19T00:00:00Z'),
    planPr(45, 'docs/sync-new', '', '2026-11-20T00:00:00Z'),
  ]);
  assert.equal(plan.reuseExistingPr.number, 44);
  assert.equal(plan.branch, 'docs/sync-old');
  assert.equal(plan.warnings.length, 1);
});

test('plan：-2 已被占用 → 回退 -3', async () => {
  const plan = await planWith([planPr(46, 'docs/sync-9ff45bd-2', 'APPROVED', '2026-11-20T00:00:00Z')]);
  assert.equal(plan.branch, 'docs/sync-9ff45bd-3');
});

// --- CLI 参数校验 ---

test('CLI：同时给 --dry-run 与 --apply 退出码 1', async () => {
  const { spawnSync } = await import('node:child_process');
  const root = sandbox('clean', { shared: true });
  try {
    const cli = join(dirname(fileURLToPath(import.meta.url)), 'docs-sync.mjs');
    const res = spawnSync(process.execPath, [cli, '--dry-run', '--apply', '--repo-root', root, '--today', '2026-11-20'], { encoding: 'utf8' });
    assert.equal(res.status, 1);
    assert.match(res.stderr, /dry-run|apply|用法/);
  } finally {
    cleanup(root);
  }
});

test('参数解析：布尔与取值选项归位', () => {
  const opts = parseArgs(['--full', '--repo-root', './x', '--main-sha=9ff45bd', '--poll-closes', '120000', '--trigger-merged-sha', 'abc1234']);
  assert.equal(opts.full, true);
  assert.equal(opts.repo_root, './x');
  assert.equal(opts.main_sha, '9ff45bd');
  assert.equal(opts.poll_closes, '120000');
  assert.equal(opts.trigger_merged_sha, 'abc1234');
});

test('meta.trigger.mergedSha：给了进 meta，未给为 null，不参与标注', async () => {
  const root = sandbox('clean', { shared: true });
  try {
    const none = await runAnalyze(root, {}, {});
    assert.equal(none.meta.trigger.mergedSha, null);
    const given = await runAnalyze(root, {}, { triggerMergedSha: 'abc1234def5678' });
    assert.equal(given.meta.trigger.mergedSha, 'abc1234def5678');
    // 标注 main 仍用 --main-sha，不被 mergedSha 顶替。
    assert.equal(given.meta.mainSha, '9ff45bd');
  } finally {
    cleanup(root);
  }
});
