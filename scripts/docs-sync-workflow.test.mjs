// docs-sync workflow 的机器检查：把「一次真实事故」钉成回归。
//
// full=true 首次实跑（run 44762319606）在第 9 步失败：runner 里 commit 好了，但没 push
// 就调 gh pr create，GitHub 比的是远端，于是只得到「No commits between main and
// docs/sync-<sha>」，一个 commit 8372d1b 白做，还得人工重跑。
//
// 这条检查只看 YAML 的动作顺序，不假装能跑通 Actions：顺序错了就是错，与脚本逻辑无关。

import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WF = readFileSync(join(ROOT, '.github/workflows/docs-sync.yml'), 'utf8');

// 只看命令，不看注释：注释里既会提到 gh pr create，也会写「不 force push」，
// 拿整份文本做位置比较会把说明文字当成动作。
const COMMANDS = WF.split('\n')
  .filter((line) => !/^\s*#/.test(line))
  .join('\n');

const idx = (needle, from = 0) => {
  const at = COMMANDS.indexOf(needle, from);
  assert.notEqual(at, -1, `workflow 里找不到：${needle}`);
  return at;
};

test('开 PR 之前先把提交推到远端：commit → push → gh pr create', () => {
  const commit = idx('git commit -m "$COMMIT_MSG"');
  const push = idx('git push origin "$BRANCH"');
  const create = idx('gh pr create');
  assert.ok(commit < push, 'commit 必须在 push 之前');
  assert.ok(push < create, 'push 必须在 gh pr create 之前，否则远端没有 head，PR 开不出来');
});

test('复用已有分支时也要推送：push 早于 gh pr edit', () => {
  const push = idx('git push origin "$BRANCH"');
  const edit = idx('gh pr edit "$REUSE_PR"');
  assert.ok(push < edit, '往已审过的 PR 追加提交时同样得先 push');
});

test('推送之后核验远端分支确实存在', () => {
  const push = idx('git push origin "$BRANCH"');
  const guard = idx('git ls-remote --exit-code --heads origin "$BRANCH"');
  const create = idx('gh pr create');
  assert.ok(push < guard && guard < create, 'ls-remote 核验应夹在 push 与 pr create 之间');
});

test('全程不 force push、不推 main', () => {
  assert.ok(!COMMANDS.includes('--force'), '不允许 force push');
  assert.ok(!COMMANDS.includes('--force-with-lease'), '也不允许 force-with-lease');
  assert.match(COMMANDS, /git push origin "\$BRANCH"/, '推送目标必须是被 plan 决定的分支变量');
  assert.ok(!/git push\s+(origin\s+)?main/.test(COMMANDS), '不允许直接 push main');
});

test('推送失败就让这一步红，不被 || true 吞掉', () => {
  assert.ok(!WF.includes('git push origin "$BRANCH" || true'), 'push 失败必须中止本步');
});

function extractStepRuns(yamlText) {
  const lines = yamlText.split('\n');
  const runs = [];
  for (let i = 0; i < lines.length; i++) {
    const nameMatch = lines[i].match(/^\s*- name:\s*(.+)$/);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim();
    for (let j = i + 1; j < lines.length && !/^\s*- name:/.test(lines[j]); j++) {
      const runMatch = lines[j].match(/^(\s*)run:\s*(.+)$/);
      if (!runMatch) continue;
      const rhs = runMatch[2].trim();
      if (!rhs.startsWith('|')) {
        runs.push({ name, script: `${rhs}\n` });
        break;
      }
      const minIndent = runMatch[1].length + 1;
      const raw = [];
      for (let k = j + 1; k < lines.length; k++) {
        const line = lines[k];
        if (line.trim() === '') {
          raw.push('');
          continue;
        }
        const indent = line.match(/^ */)[0].length;
        if (indent < minIndent) break;
        raw.push(line);
      }
      const nonEmpty = raw.filter((l) => l.trim() !== '');
      const common = nonEmpty.length ? Math.min(...nonEmpty.map((l) => l.match(/^ */)[0].length)) : 0;
      runs.push({ name, script: raw.map((l) => (l.trim() === '' ? '' : l.slice(common))).join('\n') + '\n' });
      break;
    }
  }
  return runs;
}

const STEP_RUNS = extractStepRuns(WF);
const stepScript = (name) => {
  const step = STEP_RUNS.find((s) => s.name === name);
  assert.ok(step, `找不到步骤：${name}`);
  return step.script;
};
const activeLines = (script) => script.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');

test('执行步骤顺序：干跑 → 准备分支 → 落盘 → 提交推送/PR → 滚动 issue', () => {
  const names = STEP_RUNS.map((s) => s.name);
  const expected = [
    '生成辅助脚本与 PR 正文渲染器',
    '采集 issue、PR 与 git 历史事实',
    '干跑复核并留存九项结果',
    '按 dry-run 准备目标分支',
    '落盘修正并产出 plan',
    '提交并开或更新 docs PR',
    '按 plan 追加滚动 docs issue',
    '追加失败记录到滚动 issue',
  ];
  let prev = -1;
  for (const name of expected) {
    const pos = names.indexOf(name);
    assert.ok(pos > prev, `步骤顺序错位：${name}`);
    prev = pos;
  }
});

test('dry-run 与 apply 共用固定 --today 且通过 write_plan_meta 解析计划', () => {
  const helpers = activeLines(stepScript('生成辅助脚本与 PR 正文渲染器'));
  const collect = activeLines(stepScript('采集 issue、PR 与 git 历史事实'));
  const dry = activeLines(stepScript('干跑复核并留存九项结果'));
  const pr = activeLines(stepScript('提交并开或更新 docs PR'));
  assert.ok(collect.includes('date -u +%F > .docs-sync-run/today'), '采集阶段须固定 UTC 日期');
  assert.ok(helpers.includes('--today "$(cat .docs-sync-run/today)"'), 'build_args 须显式传入固定 --today');
  assert.ok(helpers.includes('write_plan_meta()'), 'step-helpers.sh 须提供共享 write_plan_meta');
  assert.ok(dry.includes('write_plan_meta dry'));
  assert.ok(pr.includes('write_plan_meta apply'));
});

test('准备目标分支：干跑为 0 不切分支，复用与 REMOTE_HEAD 均合并 main 且冲突 abort', () => {
  const prep = activeLines(stepScript('按 dry-run 准备目标分支'));
  const fnStart = prep.indexOf('sync_remote_branch()');
  const fnEnd = prep.indexOf('\n}\n', fnStart);
  assert.ok(fnStart !== -1 && fnEnd > fnStart, '缺少 sync_remote_branch 定义');
  const fnBody = prep.slice(fnStart, fnEnd);
  const execBody = prep.slice(fnEnd + 3);

  const fetchAt = fnBody.indexOf('git fetch origin "+refs/heads/$branch:refs/remotes/origin/$branch"');
  const switchAt = fnBody.indexOf('git switch -C "$branch" "origin/$branch"');
  const mergeAt = fnBody.indexOf('git merge --no-edit main');
  const abortAt = fnBody.indexOf('git merge --abort');
  assert.ok(fetchAt !== -1 && switchAt > fetchAt && mergeAt > switchAt && abortAt > mergeAt);

  const dryZeroAt = execBody.indexOf('if [ "$(cat .docs-sync-run/dry-fixes-count)" = "0" ]');
  const reuseIfAt = execBody.indexOf('if [ -n "$REUSE_PR" ]');
  const preflightAt = execBody.indexOf('./scripts/pr-preflight.sh "$REUSE_PR"', reuseIfAt);
  const syncReuseAt = execBody.indexOf('sync_remote_branch "$BRANCH"', preflightAt);
  const remoteHeadAt = execBody.indexOf('REMOTE_HEAD="$(git ls-remote --heads origin "refs/heads/$BRANCH")"');
  const remoteCheckAt = execBody.indexOf('if [ -n "$REMOTE_HEAD" ]', remoteHeadAt);
  const syncRemoteAt = execBody.indexOf('sync_remote_branch "$BRANCH"', remoteCheckAt);
  const switchNewAt = execBody.indexOf('git switch -c "$BRANCH"', syncRemoteAt);
  const preparedAt = execBody.indexOf('.docs-sync-run/prepared-branch', switchNewAt);

  assert.ok(dryZeroAt !== -1 && dryZeroAt < reuseIfAt);
  assert.ok(preflightAt !== -1 && syncReuseAt > preflightAt);
  assert.ok(remoteHeadAt > syncReuseAt && remoteCheckAt > remoteHeadAt);
  assert.ok(syncRemoteAt > remoteCheckAt && switchNewAt > syncRemoteAt && preparedAt > switchNewAt);
});

test('PR 步骤覆盖 REUSE_PR 合并 main 后 apply 无新改动分支同步及防空提交', () => {
  const pr = activeLines(stepScript('提交并开或更新 docs PR'));
  const preparedGuard = pr.indexOf('if [ ! -s .docs-sync-run/prepared-branch ]');
  const aheadCount = pr.indexOf('AHEAD_COUNT="$(git rev-list --count "origin/$BRANCH..HEAD")"');
  const skipGuard = pr.indexOf('if [ "$COMMITTED" -eq 0 ] && [ "$AHEAD_COUNT" -eq 0 ]');
  const preflightPush = pr.indexOf('./scripts/pr-preflight.sh "$REUSE_PR"', skipGuard);
  const diffStat = pr.indexOf('git diff --stat main..HEAD > .docs-sync-run/diff-stat.txt', preflightPush);
  const pushAt = pr.indexOf('git push origin "$BRANCH"', diffStat);
  const preflightEdit = pr.indexOf('./scripts/pr-preflight.sh "$REUSE_PR"', pushAt);
  const editAt = pr.indexOf('gh pr edit "$REUSE_PR"', preflightEdit);
  assert.ok(preparedGuard !== -1 && aheadCount > preparedGuard && skipGuard > aheadCount);
  assert.ok(preflightPush > skipGuard && diffStat > preflightPush && pushAt > diffStat);
  assert.ok(preflightEdit > pushAt && editAt > preflightEdit);
  assert.ok(pr.includes('if ! git diff --cached --quiet; then'));
});

test('全部六个执行步骤接入 begin_step 透传控制台并由失败步骤扫齐日志', () => {
  const helpers = activeLines(stepScript('生成辅助脚本与 PR 正文渲染器'));
  assert.ok(helpers.includes('begin_step()'));
  assert.ok(helpers.includes('tee -a "$STEP_ERR_LOG"') && helpers.includes('wait "$STEP_TEE_PID"'));
  const stepLogs = [
    ['采集 issue、PR 与 git 历史事实', 'err-collect.log'],
    ['干跑复核并留存九项结果', 'err-dry-run.log'],
    ['按 dry-run 准备目标分支', 'err-branch.log'],
    ['落盘修正并产出 plan', 'err-apply.log'],
    ['提交并开或更新 docs PR', 'err-pr.log'],
    ['按 plan 追加滚动 docs issue', 'err-issue.log'],
  ];
  const failureScript = activeLines(stepScript('追加失败记录到滚动 issue'));
  for (const [name, log] of stepLogs) {
    const s = activeLines(stepScript(name));
    assert.ok(s.includes(log), `${name} 须调用 begin_step 传入 ${log}`);
    assert.ok(!s.includes(`: > .docs-sync-run/${log}`), `${name} 不应手写重复清零`);
    assert.match(failureScript, new RegExp(`for f in [^\\n]*${log.replace('.', '\\.')}`));
  }
});

test('所有 run 步骤通过 bash -n 语法检查', () => {
  assert.ok(STEP_RUNS.length >= 9);
  for (const step of STEP_RUNS) {
    const res = spawnSync('bash', ['-n'], { input: step.script, encoding: 'utf8' });
    assert.equal(res.status, 0, `${step.name} 存在 bash 语法错误：${res.stderr}`);
  }
});

test('begin_step 透传 stderr 到控制台且成功清零、失败保留日志', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'docs-sync-begin-step-'));
  try {
    mkdirSync(join(tmp, '.docs-sync-run'), { recursive: true });
    const helpersRun = stepScript('生成辅助脚本与 PR 正文渲染器');
    const prep = spawnSync('bash', ['-c', helpersRun], { cwd: tmp, encoding: 'utf8' });
    assert.equal(prep.status, 0, prep.stderr);

    const runSnippet = (body) => spawnSync('bash', ['-c', `
      set -euo pipefail
      source .docs-sync-run/step-helpers.sh
      begin_step "测试" err-test.log
      ${body}
    `], { cwd: tmp, encoding: 'utf8' });

    const ok = runSnippet('echo "out"; echo "progress-msg" >&2');
    assert.equal(ok.status, 0);
    assert.match(ok.stderr, /progress-msg/);
    assert.equal(readFileSync(join(tmp, '.docs-sync-run/err-test.log'), 'utf8'), '');

    const early = runSnippet('echo "early-msg" >&2; exit 0');
    assert.equal(early.status, 0);
    assert.match(early.stderr, /early-msg/);
    assert.equal(readFileSync(join(tmp, '.docs-sync-run/err-test.log'), 'utf8'), '');

    const fail = runSnippet('echo "fatal-detail" >&2; ls /no_such_path_docs_sync_test');
    assert.notEqual(fail.status, 0);
    assert.match(fail.stderr, /fatal-detail/);
    assert.match(fail.stderr, /no_such_path_docs_sync_test/);
    const errLog = readFileSync(join(tmp, '.docs-sync-run/err-test.log'), 'utf8');
    assert.match(errLog, /fatal-detail/);
    assert.match(errLog, /no_such_path_docs_sync_test/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

function gitRun(cwd, args) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(res.status, 0, `git ${args.join(' ')} 失败：${res.stderr}`);
  return res.stdout.trim();
}

function setupWorkflowSandbox(tmp) {
  const bare = join(tmp, 'origin.git');
  const seed = join(tmp, 'seed');
  const binDir = join(tmp, 'bin');
  const stateDir = join(tmp, 'gh-state');
  mkdirSync(binDir, { recursive: true });
  mkdirSync(stateDir, { recursive: true });

  gitRun(tmp, ['init', '--bare', '-b', 'main', bare]);
  gitRun(tmp, ['clone', bare, seed]);
  gitRun(seed, ['checkout', '-B', 'main']);
  gitRun(seed, ['config', 'user.name', 'seed']);
  gitRun(seed, ['config', 'user.email', 'seed@example.com']);

  cpSync(join(ROOT, 'scripts/docs-sync.mjs'), join(seed, 'scripts/docs-sync.mjs'));
  cpSync(join(ROOT, 'scripts/docs-sync-report.mjs'), join(seed, 'scripts/docs-sync-report.mjs'));
  writeFileSync(join(seed, 'scripts/pr-preflight.sh'), '#!/usr/bin/env bash\nset -euo pipefail\necho "PR #$1 OPEN"\n');
  chmodSync(join(seed, 'scripts/pr-preflight.sh'), 0o755);

  mkdirSync(join(seed, 'docs/adr'), { recursive: true });
  mkdirSync(join(seed, 'docs/wiki'), { recursive: true });
  mkdirSync(join(seed, 'api'), { recursive: true });
  writeFileSync(join(seed, 'docs/adr/0001-one.md'), '# 第一份决策\n');
  writeFileSync(join(seed, 'docs/wiki/index.md'), '# Wiki\n- [decisions](decisions.md)\n- [stages](stages.md)\n- [open-loops](open-loops.md)\n- [contract-gaps](contract-gaps.md)\n');
  writeFileSync(join(seed, 'docs/wiki/decisions.md'), '# 决策\n\n现行：1 份 ADR。\n\n| ADR | 标题（即结论） |\n| --- | --- |\n| [0001](../adr/0001-one.md) | 第一份决策 |\n');
  writeFileSync(join(seed, 'docs/wiki/stages.md'), '# 阶段\n\n共 5 个 open issue。api/openapi.yaml 1 个 path、1 个 operation。\n\n## 下节\n');
  writeFileSync(join(seed, 'docs/wiki/open-loops.md'), '# 未结\n\n**2026-11-17 open issue 快照（5）**：#1。\n\n## 已知但未做\n');
  writeFileSync(join(seed, 'docs/wiki/contract-gaps.md'), '# 缺口\n');
  writeFileSync(join(seed, 'api/openapi.yaml'), 'openapi: 3.0.3\npaths:\n  /health:\n    get:\n      responses:\n        "200":\n          description: ok\n');
  writeFileSync(join(seed, 'GLOSSARY.md'), '# Glossary\n');
  writeFileSync(join(seed, 'AGENTS.md'), '# Agents\n');
  gitRun(seed, ['add', '.']);
  gitRun(seed, ['commit', '-m', 'init']);
  gitRun(seed, ['push', '-u', 'origin', 'main']);

  const ghStub = join(binDir, 'gh');
  writeFileSync(ghStub, `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const stateDir = ${JSON.stringify(stateDir)};
const args = process.argv.slice(2);
fs.appendFileSync(path.join(stateDir, 'gh.log'), JSON.stringify(args) + '\\n');
if (args[0] === 'issue' && args[1] === 'list') {
  if (args.includes('--jq')) console.log(process.env.FAKE_ROLLING_ISSUE || '');
  else if (args.includes('--state') && args[args.indexOf('--state') + 1] === 'all') console.log('[{"number":99,"state":"CLOSED"}]');
  else process.stdout.write(fs.readFileSync(path.join(stateDir, 'issues.json'), 'utf8'));
} else if (args[0] === 'pr' && args[1] === 'list') {
  if (args.includes('--head')) console.log(process.env.FAKE_CREATED_PR || '91');
  else process.stdout.write(fs.readFileSync(path.join(stateDir, 'prs.json'), 'utf8'));
} else if (args[0] === 'pr' && args[1] === 'view') {
  console.log('Closes #99');
} else {
  console.log('OK');
}
`);
  chmodSync(ghStub, 0o755);
  return { bare, seed, binDir, stateDir };
}

function runSandboxWorkflow(runner, ctxEnv, { issues, prs, eventName = 'pull_request' }) {
  writeFileSync(join(ctxEnv.stateDir, 'issues.json'), JSON.stringify(issues));
  writeFileSync(join(ctxEnv.stateDir, 'prs.json'), JSON.stringify(prs));
  const env = {
    ...process.env,
    PATH: `${ctxEnv.binDir}:${process.env.PATH}`,
    FULL: 'false',
    FAKE_ROLLING_ISSUE: '62',
    FAKE_CREATED_PR: '91',
  };
  const repl = (s) => s
    .replaceAll('${{ github.event_name }}', eventName)
    .replaceAll('${{ github.event.pull_request.number }}', '85')
    .replaceAll('${{ github.event.pull_request.merge_commit_sha }}', 'deadbeef')
    .replaceAll('${{ github.run_id }}', '12345')
    .replaceAll('${{ github.server_url }}', 'https://github.com')
    .replaceAll('${{ github.repository }}', 'a-RunShine/sunshine-hub')
    .replaceAll('--poll-closes 120000', '--poll-closes 10');

  const steps = [
    '生成辅助脚本与 PR 正文渲染器',
    '采集 issue、PR 与 git 历史事实',
    '干跑复核并留存九项结果',
    '按 dry-run 准备目标分支',
    '落盘修正并产出 plan',
    '提交并开或更新 docs PR',
    '按 plan 追加滚动 docs issue',
  ];
  for (const name of steps) {
    const res = spawnSync('bash', ['-c', repl(stepScript(name))], { cwd: runner, env, encoding: 'utf8' });
    if (res.status !== 0) return { ok: false, failedStep: name, res };
  }
  return { ok: true };
}

test('沙盒：REUSE_PR 合并 main 后 apply 为 fixes==0 时仍推送合并提交并刷新 PR 与双向链接', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'docs-sync-reuse-zero-'));
  try {
    const ctxEnv = setupWorkflowSandbox(tmp);
    const { bare, seed, stateDir } = ctxEnv;
    const c0Short = gitRun(seed, ['rev-parse', '--short=7', 'HEAD']);
    const staleBranch = `docs/sync-${c0Short}`;
    const today = new Date().toISOString().slice(0, 10);

    gitRun(seed, ['checkout', '-b', staleBranch]);
    writeFileSync(join(seed, 'docs/wiki/stages.md'), `# 阶段\n\n共 5 个 open issue。api/openapi.yaml 1 个 path、1 个 operation。\n\n\n> **${today} 复核（main \`${c0Short}\`）**：open issue 17 个。原「共 5 个 open issue。」按历史断言保留。\n\n## 下节\n`);
    writeFileSync(join(seed, 'docs/wiki/open-loops.md'), `# 未结\n\n**2026-11-17 open issue 快照（5）**：#1。\n\n\n> **${today} 复核（main \`${c0Short}\`）**：open issue 17 个。原「**2026-11-17 open issue 快照（5）**：#1。」按历史断言保留。\n\n## 已知但未做\n`);
    gitRun(seed, ['add', '.']);
    gitRun(seed, ['commit', '-m', `docs: 同步 ${c0Short} 的文档事实`]);
    gitRun(seed, ['push', '-u', 'origin', staleBranch]);

    gitRun(seed, ['checkout', 'main']);
    writeFileSync(join(seed, 'README.md'), '# Unrelated main advance\n');
    gitRun(seed, ['add', 'README.md']);
    gitRun(seed, ['commit', '-m', 'docs: advance main']);
    gitRun(seed, ['push', 'origin', 'main']);

    const runner = join(tmp, 'runner');
    gitRun(tmp, ['clone', bare, runner]);
    gitRun(runner, ['checkout', 'main']);

    const issues17 = Array.from({ length: 17 }, (_, i) => ({ number: i + 1, title: `i${i + 1}`, state: 'OPEN' }));
    const prs82 = [{ number: 82, title: 'docs: sync', body: '', headRefName: staleBranch, reviewDecision: '', createdAt: '2026-11-22T00:00:00Z' }];
    const out = runSandboxWorkflow(runner, ctxEnv, { issues: issues17, prs: prs82 });
    assert.equal(out.ok, true, out.res?.stderr);

    assert.equal(readFileSync(join(runner, '.docs-sync-run/fixes-count'), 'utf8'), '0');
    assert.equal(readFileSync(join(runner, '.docs-sync-run/pr-number'), 'utf8').trim(), '82');
    assert.equal(gitRun(runner, ['branch', '--show-current']), staleBranch);
    assert.equal(gitRun(runner, ['rev-parse', 'HEAD']), gitRun(runner, ['rev-parse', `origin/${staleBranch}`]));
    assert.match(gitRun(runner, ['log', '-1', '--format=%s']), /^Merge branch 'main'/);
    const prBody = readFileSync(join(runner, '.docs-sync-run/pr-body.md'), 'utf8');
    assert.match(prBody, /关联滚动 issue：#62/);
    assert.match(prBody, /stages\.md/);
    const issueSec = readFileSync(join(runner, '.docs-sync-run/issue-section.md'), 'utf8');
    assert.match(issueSec, /关联 PR：#82/);
    const ghLog = readFileSync(join(stateDir, 'gh.log'), 'utf8');
    assert.match(ghLog, /\["pr","edit","82"/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('沙盒：REUSE_PR 合并冲突 cleanly abort；无 REUSE_PR 时 REMOTE_HEAD 分支复用并合并 main', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'docs-sync-conflict-remote-'));
  try {
    const ctxEnv = setupWorkflowSandbox(tmp);
    const { bare, seed } = ctxEnv;
    const c0Short = gitRun(seed, ['rev-parse', '--short=7', 'HEAD']);
    const staleBranch = `docs/sync-${c0Short}`;

    gitRun(seed, ['checkout', '-b', staleBranch]);
    writeFileSync(join(seed, 'docs/wiki/open-loops.md'), 'CONFLICT FROM STALE\n');
    gitRun(seed, ['add', 'docs/wiki/open-loops.md']);
    gitRun(seed, ['commit', '-m', 'stale edit']);
    gitRun(seed, ['push', '-u', 'origin', staleBranch]);

    gitRun(seed, ['checkout', 'main']);
    writeFileSync(join(seed, 'docs/wiki/open-loops.md'), 'CONFLICT FROM MAIN\n\n**2026-11-17 open issue 快照（5）**：#1。\n');
    gitRun(seed, ['add', 'docs/wiki/open-loops.md']);
    gitRun(seed, ['commit', '-m', 'main edit']);
    gitRun(seed, ['push', 'origin', 'main']);

    const rConflict = join(tmp, 'runner-conflict');
    gitRun(tmp, ['clone', bare, rConflict]);
    gitRun(rConflict, ['checkout', 'main']);
    const issues17 = Array.from({ length: 17 }, (_, i) => ({ number: i + 1, title: `i${i + 1}`, state: 'OPEN' }));
    const prs82 = [{ number: 82, title: 'docs: sync', body: '', headRefName: staleBranch, reviewDecision: '', createdAt: '2026-11-22T00:00:00Z' }];
    const conflictOut = runSandboxWorkflow(rConflict, ctxEnv, { issues: issues17, prs: prs82 });
    assert.equal(conflictOut.ok, false);
    assert.equal(conflictOut.failedStep, '按 dry-run 准备目标分支');
    assert.equal(existsSync(join(rConflict, '.git/MERGE_HEAD')), false);
    assert.equal(gitRun(rConflict, ['status', '--short', '--untracked-files=no']), '');
    const errBranch = readFileSync(join(rConflict, '.docs-sync-run/err-branch.log'), 'utf8');
    assert.match(errBranch, /open-loops\.md/);
    assert.match(errBranch, /PR #82/);

    const mainShort = gitRun(seed, ['rev-parse', '--short=7', 'HEAD']);
    const remoteBranch = `docs/sync-${mainShort}`;
    gitRun(seed, ['checkout', '-b', remoteBranch]);
    writeFileSync(join(seed, 'NOTE.md'), 'prior run artifact\n');
    gitRun(seed, ['add', 'NOTE.md']);
    gitRun(seed, ['commit', '-m', 'prior push before pr create']);
    gitRun(seed, ['push', '-u', 'origin', remoteBranch]);
    gitRun(seed, ['checkout', 'main']);

    const rRemote = join(tmp, 'runner-remote');
    gitRun(tmp, ['clone', bare, rRemote]);
    gitRun(rRemote, ['checkout', 'main']);
    const remoteOut = runSandboxWorkflow(rRemote, ctxEnv, { issues: issues17, prs: [] });
    assert.equal(remoteOut.ok, true, remoteOut.res?.stderr);
    assert.equal(gitRun(rRemote, ['branch', '--show-current']), remoteBranch);
    assert.equal(readFileSync(join(rRemote, '.docs-sync-run/pr-number'), 'utf8').trim(), '91');
    assert.equal(gitRun(rRemote, ['rev-parse', 'HEAD']), gitRun(rRemote, ['rev-parse', `origin/${remoteBranch}`]));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('沙盒：REUSE_PR 有新漂移时先合 main 再落盘提交；dry-run 无修正但有 REUSE_PR 时留在 main', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'docs-sync-drift-and-clean-'));
  try {
    const ctxEnv = setupWorkflowSandbox(tmp);
    const { bare, seed, stateDir } = ctxEnv;
    const c0Short = gitRun(seed, ['rev-parse', '--short=7', 'HEAD']);
    const staleBranch = `docs/sync-${c0Short}`;

    gitRun(seed, ['checkout', '-b', staleBranch]);
    writeFileSync(join(seed, 'docs/wiki/stages.md'), `# 阶段\n\n共 5 个 open issue。api/openapi.yaml 1 个 path、1 个 operation。\n\n\n> **2026-11-22 复核（main \`${c0Short}\`）**：open issue 17 个。原「共 5 个 open issue。」按历史断言保留。\n\n## 下节\n`);
    writeFileSync(join(seed, 'docs/wiki/open-loops.md'), `# 未结\n\n**2026-11-17 open issue 快照（5）**：#1。\n\n\n> **2026-11-22 复核（main \`${c0Short}\`）**：open issue 17 个。原「**2026-11-17 open issue 快照（5）**：#1。」按历史断言保留。\n\n## 已知但未做\n`);
    gitRun(seed, ['add', '.']);
    gitRun(seed, ['commit', '-m', `docs: 同步 ${c0Short} 的文档事实`]);
    gitRun(seed, ['push', '-u', 'origin', staleBranch]);

    gitRun(seed, ['checkout', 'main']);
    writeFileSync(join(seed, 'docs/adr/0002-two.md'), '# 第二份决策\n');
    gitRun(seed, ['add', '.']);
    gitRun(seed, ['commit', '-m', 'feat: add adr 0002']);
    gitRun(seed, ['push', 'origin', 'main']);

    const rDrift = join(tmp, 'runner-drift');
    gitRun(tmp, ['clone', bare, rDrift]);
    gitRun(rDrift, ['checkout', 'main']);
    const issues18 = Array.from({ length: 18 }, (_, i) => ({ number: i + 1, title: `i${i + 1}`, state: 'OPEN' }));
    const prs82 = [{ number: 82, title: 'docs: sync', body: '', headRefName: staleBranch, reviewDecision: '', createdAt: '2026-11-22T00:00:00Z' }];
    const driftOut = runSandboxWorkflow(rDrift, ctxEnv, { issues: issues18, prs: prs82 });
    assert.equal(driftOut.ok, true, driftOut.res?.stderr);
    assert.equal(gitRun(rDrift, ['branch', '--show-current']), staleBranch);
    assert.equal(gitRun(rDrift, ['rev-parse', 'HEAD']), gitRun(rDrift, ['rev-parse', `origin/${staleBranch}`]));
    const diffStat = gitRun(rDrift, ['diff', '--stat', 'main..HEAD']);
    assert.match(diffStat, /decisions\.md/);
    assert.match(diffStat, /stages\.md/);
    assert.doesNotMatch(diffStat, /0002-two\.md/);

    writeFileSync(join(seed, 'docs/wiki/decisions.md'), '# 决策\n\n现行：2 份 ADR。\n\n| ADR | 标题（即结论） |\n| --- | --- |\n| [0001](../adr/0001-one.md) | 第一份决策 |\n| [0002](../adr/0002-two.md) | 第二份决策 |\n');
    writeFileSync(join(seed, 'docs/wiki/stages.md'), '# 阶段\n\n共 1 个 open issue。api/openapi.yaml 1 个 path、1 个 operation。\n\n## 下节\n');
    writeFileSync(join(seed, 'docs/wiki/open-loops.md'), '# 未结\n\n**2026-11-17 open issue 快照（1）**：#1。\n\n## 已知但未做\n');
    writeFileSync(join(seed, 'GLOSSARY.md'), '# Glossary\n\n**Item（物品）** _Avoid_: 旧道具\n');
    writeFileSync(join(seed, 'docs/wiki/contract-gaps.md'), '# 缺口：含旧道具\n');
    gitRun(seed, ['add', '.']);
    gitRun(seed, ['commit', '-m', 'docs: clean main with report']);
    gitRun(seed, ['push', 'origin', 'main']);

    const rClean = join(tmp, 'runner-clean');
    gitRun(tmp, ['clone', bare, rClean]);
    gitRun(rClean, ['checkout', 'main']);
    const prevRemote = gitRun(rClean, ['rev-parse', `origin/${staleBranch}`]);
    writeFileSync(join(stateDir, 'gh.log'), '');
    const cleanOut = runSandboxWorkflow(rClean, ctxEnv, { issues: [{ number: 1, title: 'i1', state: 'OPEN' }], prs: prs82 });
    assert.equal(cleanOut.ok, true, cleanOut.res?.stderr);
    assert.equal(gitRun(rClean, ['branch', '--show-current']), 'main');
    assert.equal(readFileSync(join(rClean, '.docs-sync-run/prepared-branch'), 'utf8'), '');
    assert.equal(gitRun(rClean, ['rev-parse', `origin/${staleBranch}`]), prevRemote);
    assert.equal(existsSync(join(rClean, '.docs-sync-run/pr-number')), false);
    assert.match(readFileSync(join(rClean, '.docs-sync-run/issue-section.md'), 'utf8'), /旧道具/);
    assert.doesNotMatch(readFileSync(join(stateDir, 'gh.log'), 'utf8'), /\["pr","edit"/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
