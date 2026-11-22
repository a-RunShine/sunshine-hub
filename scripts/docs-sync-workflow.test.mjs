// docs-sync workflow 的机器检查：把「一次真实事故」钉成回归。
//
// full=true 首次实跑（run 44762319606）在第 9 步失败：runner 里 commit 好了，但没 push
// 就调 gh pr create，GitHub 比的是远端，于是只得到「No commits between main and
// docs/sync-<sha>」，一个 commit 8372d1b 白做，还得人工重跑。
//
// 这条检查只看 YAML 的动作顺序，不假装能跑通 Actions：顺序错了就是错，与脚本逻辑无关。

import { readFileSync } from 'node:fs';
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
    let j = i + 1;
    while (j < lines.length && !/^\s*- name:/.test(lines[j])) {
      if (/^\s*run:\s*\|/.test(lines[j])) {
        const body = [];
        for (let k = j + 1; k < lines.length; k++) {
          const line = lines[k];
          if (line.trim() === '') {
            body.push('');
            continue;
          }
          if (!line.startsWith('          ')) break;
          body.push(line.slice(10));
        }
        runs.push({ name, script: body.join('\n') + '\n' });
        break;
      }
      j += 1;
    }
  }
  return runs;
}

test('dry-run 早于切分支，切分支并合入 main 早于 --apply', () => {
  const dryRun = idx('node scripts/docs-sync.mjs --dry-run');
  const switchReuse = idx('git switch -C "$branch" "origin/$branch"');
  const mergeMain = idx('git merge --no-edit main', switchReuse);
  const switchNew = idx('git switch -c "$BRANCH"');
  const apply = idx('node scripts/docs-sync.mjs --apply');
  const commit = idx('git commit -m "$COMMIT_MSG"');
  assert.ok(dryRun < switchReuse && dryRun < switchNew, '必须先 dry-run 再切分支');
  assert.ok(switchReuse < mergeMain && mergeMain < apply, '复用分支须先切分支再合入 main，最后 --apply');
  assert.ok(switchNew < apply, '新开分支也须在 --apply 之前完成切分支');
  assert.ok(apply < commit, '--apply 必须在 git commit 之前');
});

test('复用 OPEN PR 前先校验 preflight，冲突时 abort 不留脏合并态', () => {
  const preflightPrep = idx('./scripts/pr-preflight.sh "$REUSE_PR"');
  const syncReuse = idx('sync_remote_branch "$BRANCH"', preflightPrep);
  const apply = idx('node scripts/docs-sync.mjs --apply');
  const preflightEdit = idx('./scripts/pr-preflight.sh "$REUSE_PR"', apply);
  const editPr = idx('gh pr edit "$REUSE_PR"', preflightEdit);
  assert.ok(preflightPrep < syncReuse && syncReuse < apply, '切分支复用前须校验 PR 仍 OPEN');
  assert.ok(apply < preflightEdit && preflightEdit < editPr, 'edit PR 前须再次校验 PR 仍 OPEN');
  assert.ok(COMMANDS.includes('git merge --abort'), '合并冲突时必须执行 git merge --abort');
});

test('无自动修正时跳过切分支与空提交', () => {
  const dryZero = idx('if [ "$(cat .docs-sync-run/dry-fixes-count)" = "0" ]');
  const switchNew = idx('git switch -c "$BRANCH"');
  const applyZero = idx('if [ "$(cat .docs-sync-run/fixes-count)" = "0" ]');
  const cachedQuiet = idx('if git diff --cached --quiet');
  const commit = idx('git commit -m "$COMMIT_MSG"');
  assert.ok(dryZero < switchNew, 'dry-run 无修正时不得切分支');
  assert.ok(applyZero < cachedQuiet && cachedQuiet < commit, '无改动时不得产生空提交');
});

test('所有执行步骤均接入失败 stderr 日志捕获', () => {
  for (const log of ['err-collect.log', 'err-dry-run.log', 'err-branch.log', 'err-apply.log', 'err-pr.log', 'err-issue.log']) {
    assert.ok(COMMANDS.includes(`exec 2> .docs-sync-run/${log}`), `缺少错误捕获：${log}`);
    assert.match(COMMANDS, new RegExp(`for f in [^\\n]*${log.replace('.', '\\.')}`), `失败汇总未扫描 ${log}`);
  }
});

test('所有 run 步骤通过 bash -n 语法检查', () => {
  const steps = extractStepRuns(WF);
  assert.ok(steps.length >= 8, `期望至少 8 个 run 步骤，实际 ${steps.length}`);
  for (const step of steps) {
    const res = spawnSync('bash', ['-n'], { input: step.script, encoding: 'utf8' });
    assert.equal(res.status, 0, `${step.name} 存在 bash 语法错误：${res.stderr}`);
  }
});
