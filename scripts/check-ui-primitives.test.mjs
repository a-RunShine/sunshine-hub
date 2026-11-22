//
// check-ui-primitives.mjs 的离线单元测试（node:test + node:assert/strict）。
//

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CHECKSUM_FILENAME,
  UI_RELATIVE_DIR,
  updateUiChecksums,
  verifyUiPrimitives,
} from './check-ui-primitives.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, 'check-ui-primitives.mjs');
const REPO_ROOT = resolve(HERE, '..');

function makeSandbox() {
  const root = mkdtempSync(join(tmpdir(), 'check-ui-primitives-'));
  const uiDir = join(root, UI_RELATIVE_DIR);
  mkdirSync(uiDir, { recursive: true });
  writeFileSync(join(uiDir, 'button.tsx'), 'export const Button = () => null\n', 'utf8');
  writeFileSync(join(uiDir, 'badge.tsx'), 'export const Badge = () => null\n', 'utf8');
  writeFileSync(join(uiDir, 'README.md'), '# shadcn\n', 'utf8');
  writeFileSync(join(uiDir, '.gitkeep'), '', 'utf8');
  return { root, uiDir };
}

test('实仓 web/src/components/ui 校验和通过', () => {
  const res = verifyUiPrimitives(REPO_ROOT);
  assert.equal(res.ok, true, `期望实仓通过，实际：${JSON.stringify(res)}`);
  assert.ok(res.fileCount >= 3);
});

test('--update 生成清单且跳过白名单元数据文件，随后校验通过', () => {
  const { root, uiDir } = makeSandbox();
  try {
    const updated = updateUiChecksums(root);
    assert.equal(updated.fileCount, 2);
    const manifest = JSON.parse(readFileSync(join(uiDir, CHECKSUM_FILENAME), 'utf8'));
    assert.equal(manifest.algorithm, 'sha256');
    assert.deepEqual(Object.keys(manifest.files), ['badge.tsx', 'button.tsx']);

    const check = verifyUiPrimitives(root);
    assert.equal(check.ok, true);
    assert.deepEqual(check.modified, []);
    assert.deepEqual(check.deleted, []);
    assert.deepEqual(check.untracked, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('修改已追踪文件时 CLI 退出码 1 并提示 pnpm --dir web ui:sync', () => {
  const { root, uiDir } = makeSandbox();
  try {
    updateUiChecksums(root);
    writeFileSync(join(uiDir, 'button.tsx'), 'export const Button = () => "hacked"\n', 'utf8');

    const cli = spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' });
    assert.equal(cli.status, 1);
    assert.match(cli.stderr, /\[已修改\].*button\.tsx/);
    assert.match(cli.stderr, /pnpm --dir web ui:sync/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('删除已追踪文件时校验失败并记入 deleted', () => {
  const { root, uiDir } = makeSandbox();
  try {
    updateUiChecksums(root);
    unlinkSync(join(uiDir, 'badge.tsx'));

    const res = verifyUiPrimitives(root);
    assert.equal(res.ok, false);
    assert.deepEqual(res.deleted, ['badge.tsx']);

    const cli = spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' });
    assert.equal(cli.status, 1);
    assert.match(cli.stderr, /\[已删除\].*badge\.tsx/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('新增未登记的 .ts/.tsx 文件时校验失败并记入 untracked', () => {
  const { root, uiDir } = makeSandbox();
  try {
    updateUiChecksums(root);
    writeFileSync(join(uiDir, 'dialog.tsx'), 'export const Dialog = () => null\n', 'utf8');

    const res = verifyUiPrimitives(root);
    assert.equal(res.ok, false);
    assert.deepEqual(res.untracked, ['dialog.tsx']);

    const cli = spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' });
    assert.equal(cli.status, 1);
    assert.match(cli.stderr, /\[未登记\].*dialog\.tsx/);
    assert.match(cli.stderr, /pnpm --dir web ui:sync/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('新增未登记的 .css 文件时校验失败并记入 untracked', () => {
  const { root, uiDir } = makeSandbox();
  try {
    updateUiChecksums(root);
    writeFileSync(join(uiDir, 'custom.css'), '.x { color: red; }\n', 'utf8');

    const res = verifyUiPrimitives(root);
    assert.equal(res.ok, false);
    assert.deepEqual(res.untracked, ['custom.css']);

    const cli = spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' });
    assert.equal(cli.status, 1);
    assert.match(cli.stderr, /\[未登记\].*custom\.css/);
    assert.match(cli.stderr, /pnpm --dir web ui:sync/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('检测到符号链接时校验与 --update 均失败拦截', () => {
  const { root, uiDir } = makeSandbox();
  try {
    updateUiChecksums(root);
    const outsideTarget = join(root, 'outside.tsx');
    writeFileSync(outsideTarget, 'export const Outside = () => null\n', 'utf8');
    symlinkSync(outsideTarget, join(uiDir, 'symlinked.tsx'));

    const res = verifyUiPrimitives(root);
    assert.equal(res.ok, false);
    assert.match(res.error ?? '', /符号链接.*symlinked\.tsx/);

    const cli = spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' });
    assert.equal(cli.status, 1);
    assert.match(cli.stderr, /符号链接/);

    const syncCli = spawnSync(process.execPath, [SCRIPT, root, '--update'], { encoding: 'utf8' });
    assert.equal(syncCli.status, 1);
    assert.match(syncCli.stderr, /符号链接/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('缺少校验和清单时 CLI 退出码 1 并提示 ui:sync', () => {
  const { root } = makeSandbox();
  try {
    const cli = spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' });
    assert.equal(cli.status, 1);
    assert.match(cli.stderr, /缺少校验和清单/);
    assert.match(cli.stderr, /pnpm --dir web ui:sync/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CLI 支持 --update 更新沙盒清单后立即校验通过', () => {
  const { root } = makeSandbox();
  try {
    const syncCli = spawnSync(process.execPath, [SCRIPT, root, '--update'], { encoding: 'utf8' });
    assert.equal(syncCli.status, 0);
    assert.match(syncCli.stdout, /已更新/);

    const checkCli = spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' });
    assert.equal(checkCli.status, 0);
    assert.match(checkCli.stdout, /校验和通过/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
