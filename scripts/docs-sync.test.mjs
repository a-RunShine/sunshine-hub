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

function sandbox(fixture) {
  const root = join(homedir(), `.docs-sync-test-${process.pid}-${Math.random().toString(36).slice(2)}`);
  cpSync(join(FIX, fixture, 'repo'), root, { recursive: true });
  return root;
}

function cleanup(root) {
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
  const root = sandbox('adr-drift');
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
  const root = sandbox('adr-drift');
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
  const root = sandbox('links');
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

// --- 夹具 5：Closes 延迟检查 ---

test('Closes 两帧状态：第一次 OPEN，重读一次后 CLOSED 即收敛，不真等', async () => {
  const frames = [[{ number: 33, state: 'OPEN' }], [{ number: 33, state: 'CLOSED' }]];
  const source = createIssueStateSource({ frames, sleep: async () => {}, now: () => 0 });
  const settled = await source.waitUntilClosed([33], { deadlineMs: 100000, intervalMs: 1 });
  assert.equal(settled, true);
  assert.equal(source.stateOf(33), 'CLOSED');
});

test('Closes 关联 issue 一直未关闭：进 report，不产 fix', async () => {
  const root = sandbox('closes');
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
  const root = sandbox('closes');
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
  const root = sandbox('closes');
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
  const root = sandbox('closes');
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
  const root = sandbox('closes');
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
  const root = sandbox('closes');
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
  const root = sandbox('clean');
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

// --- 第 4 项缺输入 ---

test('未提供 git 历史输入：第 4 项 report 注明来源缺失', async () => {
  const root = sandbox('clean');
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

test('已有未审批 docs/sync PR：复用该分支，不开新分支', async () => {
  const root = sandbox('clean');
  try {
    const result = await runAnalyze(root, {
      prs: {
        provided: true,
        items: [{ number: 41, title: 'docs', body: '', headRefName: 'docs/sync-9ff45bd', reviewDecision: '', createdAt: '2026-11-20T00:00:00Z' }],
      },
    });
    assert.equal(result.plan.reuseExistingPr.number, 41);
    assert.equal(result.plan.branch, 'docs/sync-9ff45bd');
    assert.equal(result.plan.commitMessage, 'docs: 同步 9ff45bd 的文档事实');
  } finally {
    cleanup(root);
  }
});

// --- CLI 参数校验 ---

test('CLI：同时给 --dry-run 与 --apply 退出码 1', async () => {
  const { spawnSync } = await import('node:child_process');
  const root = sandbox('clean');
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
  const opts = parseArgs(['--full', '--repo-root', './x', '--main-sha=9ff45bd', '--poll-closes', '120000']);
  assert.equal(opts.full, true);
  assert.equal(opts.repo_root, './x');
  assert.equal(opts.main_sha, '9ff45bd');
  assert.equal(opts.poll_closes, '120000');
});
