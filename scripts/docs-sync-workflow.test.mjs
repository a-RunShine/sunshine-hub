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
