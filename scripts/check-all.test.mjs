//
// 本地一键校验脚本与 git hooks 的离线回归测试（node:test + node:assert/strict）。
//

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const CHECK_ALL = join(HERE, 'check-all.sh');
const INSTALL_HOOKS = join(HERE, 'install-hooks.sh');
const PRE_COMMIT = join(REPO_ROOT, '.githooks', 'pre-commit');

function readScript(file) {
  return readFileSync(file, 'utf8');
}

function isExecutable(file) {
  return (statSync(file).mode & 0o111) !== 0;
}

test('check-all.sh 与 install-hooks.sh 已提交且可执行', () => {
  for (const file of [CHECK_ALL, INSTALL_HOOKS]) {
    assert.ok(existsSync(file), `缺少 ${file}`);
    assert.ok(isExecutable(file), `${file} 应带可执行位`);
  }
  assert.ok(isExecutable(PRE_COMMIT), '.githooks/pre-commit 应带可执行位');
});

test('三个 bash 脚本语法正确', () => {
  for (const file of [CHECK_ALL, INSTALL_HOOKS, PRE_COMMIT]) {
    const res = spawnSync('bash', ['-n', file], { encoding: 'utf8' });
    assert.equal(res.status, 0, res.stderr);
  }
});

test('check-all.sh --help 退出 0 并列出全部开关', () => {
  const res = spawnSync('bash', [CHECK_ALL, '--help'], { encoding: 'utf8' });
  assert.equal(res.status, 0);
  for (const flag of ['--fast', '--skip-maven', '--dry-run', '--resolve-java-home', 'CHECK_ALL_JAVA_HOME']) {
    assert.match(res.stdout, new RegExp(flag.replace(/[-]/g, '\\-')));
  }
});

test('check-all.sh 拒绝未知参数并退出 1', () => {
  const res = spawnSync('bash', [CHECK_ALL, '--nope'], { encoding: 'utf8' });
  assert.equal(res.status, 1);
  assert.match(res.stderr, /未知参数/);
});

test('check-all.sh 覆盖全量校验的每一步且前端用 env -u NODE_ENV', () => {
  const body = readScript(CHECK_ALL);
  assert.match(body, /env -u NODE_ENV pnpm --dir web check/);
  assert.match(body, /@redocly\/cli@latest lint api\/openapi\.yaml/);
  assert.match(body, /node scripts\/check-doc-links\.mjs/);
  assert.match(body, /\.\/scripts\/test-check-glossary\.sh/);
  assert.match(body, /node --test scripts\/\*\.test\.mjs/);
  assert.match(body, /\.\/scripts\/check-glossary\.sh/);
  assert.match(body, /\.\/mvnw -B verify/);
  assert.match(body, /--skip-maven/);
});

const NO_JDK_ENV = {
  ...process.env,
  CHECK_ALL_JAVA_HOME: '/nonexistent',
  CHECK_ALL_DISABLE_JAVA_PROBE: '1',
  JAVA_HOME: '/nonexistent',
  HOME: '/nonexistent',
  PATH: '/usr/bin:/bin',
};

test('无 JDK 25 的环境下 --fast --dry-run 仍退出 0', () => {
  const res = spawnSync('bash', [CHECK_ALL, '--fast', '--dry-run'], {
    encoding: 'utf8',
    env: NO_JDK_ENV,
  });
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /跳过 \.\/mvnw -B verify/);
});

test('无 JDK 25 的环境下 --dry-run 打印占位 JAVA_HOME 并退出 0', () => {
  const res = spawnSync('bash', [CHECK_ALL, '--dry-run'], {
    encoding: 'utf8',
    env: NO_JDK_ENV,
  });
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /占位/);
  assert.match(res.stdout, /\[dry-run\] 后端全量构建/);
});

test('无 JDK 25 且要真跑 Maven 时提前报错退出 1', () => {
  const res = spawnSync('bash', [CHECK_ALL], { encoding: 'utf8', env: NO_JDK_ENV });
  assert.equal(res.status, 1);
  assert.match(res.stderr, /找不到 JDK 25/);
});

test('--resolve-java-home 探不到 JDK 25 时退出 1', () => {
  const res = spawnSync('bash', [CHECK_ALL, '--resolve-java-home'], {
    encoding: 'utf8',
    env: NO_JDK_ENV,
  });
  assert.equal(res.status, 1);
  assert.match(res.stderr, /找不到 JDK 25/);
});

test('check-all.sh 的 JDK 25 探测覆盖 macOS 与云主机候选路径', () => {
  const body = readScript(CHECK_ALL);
  assert.match(body, /\/usr\/libexec\/java_home -v 25/);
  assert.match(body, /temurin-25\.jdk/);
  assert.match(body, /jdk25\/jdk-25\.0\.5\+8/);
  assert.match(body, /CHECK_ALL_JAVA_HOME/);
});

test('check-all.sh 的失败计数会累积并以非零退出', () => {
  const body = readScript(CHECK_ALL);
  assert.match(body, /failures=\$?\(\(failures \+ 1\)\)/);
  assert.match(body, /exit 1/);
});

test('install-hooks.sh 设置 core.hooksPath 到 .githooks', () => {
  const root = mkdtempSync(join(tmpdir(), 'install-hooks-'));
  try {
    const git = (args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    git(['init', '-q']);
    const scriptsDir = join(root, 'scripts');
    spawnSync('mkdir', ['-p', scriptsDir]);
    writeFileSync(join(root, 'scripts', 'install-hooks.sh'), readScript(INSTALL_HOOKS), 'utf8');
    chmodSync(join(root, 'scripts', 'install-hooks.sh'), 0o755);
    spawnSync('mkdir', ['-p', join(root, '.githooks')]);
    writeFileSync(join(root, '.githooks', 'pre-commit'), '#!/usr/bin/env bash\n', 'utf8');

    const res = spawnSync('bash', [join(root, 'scripts', 'install-hooks.sh')], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(res.status, 0, res.stderr);

    const hooksPath = git(['config', 'core.hooksPath']);
    assert.equal(hooksPath.status, 0, hooksPath.stderr);
    assert.equal(hooksPath.stdout.trim(), '.githooks');
    assert.ok(isExecutable(join(root, '.githooks', 'pre-commit')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('install-hooks.sh 在缺少 .githooks 时报错退出 1', () => {
  const root = mkdtempSync(join(tmpdir(), 'install-hooks-missing-'));
  try {
    spawnSync('git', ['init', '-q'], { cwd: root });
    const scriptsDir = join(root, 'scripts');
    spawnSync('mkdir', ['-p', scriptsDir]);
    writeFileSync(join(root, 'scripts', 'install-hooks.sh'), readScript(INSTALL_HOOKS), 'utf8');
    const res = spawnSync('bash', [join(root, 'scripts', 'install-hooks.sh')], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(res.status, 1);
    assert.match(res.stderr, /\.githooks/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('check-glossary.sh 的差集两侧固定 LC_ALL=C，候选集不随运行 locale 漂移', () => {
  const body = readFileSync(join(HERE, 'check-glossary.sh'), 'utf8');
  const diffLine = body.split('\n').find((line) => line.includes('comm -23'));
  assert.ok(diffLine, '应保留 comm -23 差集');
  assert.match(diffLine, /LC_ALL=C comm/);
  const sortLines = body.split('\n').filter((line) => line.includes('sort -u'));
  assert.equal(sortLines.length, 2);
  for (const line of sortLines) {
    assert.match(line, /LC_ALL=C sort -u/);
  }
});

test('pre-commit 跑快检、只在 web/ 有暂存改动且装了依赖时做前端检查', () => {
  const body = readScript(PRE_COMMIT);
  assert.match(body, /node scripts\/check-doc-links\.mjs/);
  assert.match(body, /node scripts\/check-ui-primitives\.mjs/);
  assert.match(body, /git diff --cached --quiet -- web\//);
  assert.doesNotMatch(body, /git diff --cached --name-only/);
  assert.doesNotMatch(body, /--amend/);
  assert.match(body, /web\/node_modules/);
  assert.match(body, /env -u NODE_ENV pnpm --dir web exec tsc --noEmit/);
  assert.match(body, /env -u NODE_ENV pnpm --dir web lint/);
  assert.match(body, /--no-verify/);
});
