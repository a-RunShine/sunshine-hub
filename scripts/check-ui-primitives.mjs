#!/usr/bin/env node
//
// 校验 web/src/components/ui/ 下的 shadcn 原语源码未被非预期手改、删除或私自新增。
// 命中漂移即 exit 1（blocking），防止改动在下次 `shadcn add` 时静默丢失。
//
// 用法：
//   node scripts/check-ui-primitives.mjs [仓库根目录]
//   node scripts/check-ui-primitives.mjs [仓库根目录] --update

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const defaultRoot = resolve(join(here, '..'));

export const UI_RELATIVE_DIR = join('web', 'src', 'components', 'ui');
export const CHECKSUM_FILENAME = '.shadcn-checksums.json';
const IGNORED_ROOT_META_FILES = new Set(['README.md', '.gitkeep', CHECKSUM_FILENAME]);

function sha256File(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function collectUiFiles(uiDir) {
  const out = [];
  function walk(dir) {
    const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    );
    for (const entry of entries) {
      const full = join(dir, entry.name);
      const relPath = relative(uiDir, full).split(sep).join('/');
      if (entry.isSymbolicLink()) {
        throw new Error(`禁止在 ${UI_RELATIVE_DIR} 中放置符号链接：${relPath}`);
      }
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      if (dir === uiDir && IGNORED_ROOT_META_FILES.has(entry.name)) continue;
      out.push(full);
    }
  }
  walk(uiDir);
  return out;
}

export function computeUiChecksums(root = defaultRoot) {
  const resolvedRoot = resolve(root);
  const uiDir = join(resolvedRoot, UI_RELATIVE_DIR);
  if (!existsSync(uiDir)) {
    throw new Error(`找不到目录：${UI_RELATIVE_DIR}`);
  }
  const checksumPath = join(uiDir, CHECKSUM_FILENAME);
  const files = {};
  for (const fullPath of collectUiFiles(uiDir)) {
    const relPath = relative(uiDir, fullPath).split(sep).join('/');
    files[relPath] = sha256File(fullPath);
  }
  return { uiDir, checksumPath, files };
}

export function updateUiChecksums(root = defaultRoot) {
  const { checksumPath, files } = computeUiChecksums(root);
  const payload = {
    algorithm: 'sha256',
    files,
  };
  writeFileSync(checksumPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return {
    checksumPath,
    fileCount: Object.keys(files).length,
    files,
  };
}

export function verifyUiPrimitives(root = defaultRoot) {
  const resolvedRoot = resolve(root);
  const uiDir = join(resolvedRoot, UI_RELATIVE_DIR);
  const checksumPath = join(uiDir, CHECKSUM_FILENAME);

  if (!existsSync(uiDir)) {
    return {
      ok: false,
      uiDir,
      checksumPath,
      fileCount: 0,
      modified: [],
      deleted: [],
      untracked: [],
      error: `找不到目录：${UI_RELATIVE_DIR}`,
    };
  }

  if (!existsSync(checksumPath)) {
    return {
      ok: false,
      uiDir,
      checksumPath,
      fileCount: 0,
      modified: [],
      deleted: [],
      untracked: [],
      error: `缺少校验和清单 ${UI_RELATIVE_DIR}/${CHECKSUM_FILENAME}`,
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(checksumPath, 'utf8'));
  } catch (err) {
    return {
      ok: false,
      uiDir,
      checksumPath,
      fileCount: 0,
      modified: [],
      deleted: [],
      untracked: [],
      error: `校验和清单解析失败：${err.message}`,
    };
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    parsed.algorithm !== 'sha256' ||
    !parsed.files ||
    typeof parsed.files !== 'object' ||
    Array.isArray(parsed.files)
  ) {
    return {
      ok: false,
      uiDir,
      checksumPath,
      fileCount: 0,
      modified: [],
      deleted: [],
      untracked: [],
      error: `校验和清单格式无效：${UI_RELATIVE_DIR}/${CHECKSUM_FILENAME}`,
    };
  }

  let actualFiles;
  try {
    actualFiles = computeUiChecksums(resolvedRoot).files;
  } catch (err) {
    return {
      ok: false,
      uiDir,
      checksumPath,
      fileCount: 0,
      modified: [],
      deleted: [],
      untracked: [],
      error: err.message,
    };
  }
  const expectedFiles = parsed.files;

  const modified = [];
  const deleted = [];
  const untracked = [];

  for (const relPath of Object.keys(expectedFiles).sort()) {
    if (!(relPath in actualFiles)) {
      deleted.push(relPath);
    } else if (actualFiles[relPath] !== expectedFiles[relPath]) {
      modified.push(relPath);
    }
  }

  for (const relPath of Object.keys(actualFiles).sort()) {
    if (!(relPath in expectedFiles)) {
      untracked.push(relPath);
    }
  }

  const ok = modified.length === 0 && deleted.length === 0 && untracked.length === 0;
  return {
    ok,
    uiDir,
    checksumPath,
    fileCount: Object.keys(actualFiles).length,
    modified,
    deleted,
    untracked,
  };
}

function parseCliArgs(argv) {
  let update = false;
  let rootArg = null;
  for (const arg of argv) {
    if (arg === '--update') {
      update = true;
    } else if (arg === '--help' || arg === '-h') {
      return { help: true, update: false, rootArg: null };
    } else if (arg.startsWith('-')) {
      throw new Error(`未知参数：${arg}`);
    } else if (rootArg === null) {
      rootArg = arg;
    } else {
      throw new Error(`多余的位置参数：${arg}`);
    }
  }
  return { help: false, update, rootArg };
}

function main(argv) {
  let opts;
  try {
    opts = parseCliArgs(argv);
  } catch (err) {
    console.error(err.message);
    console.error('用法：node scripts/check-ui-primitives.mjs [仓库根目录] [--update]');
    return 1;
  }

  if (opts.help) {
    console.log('用法：node scripts/check-ui-primitives.mjs [仓库根目录] [--update]');
    return 0;
  }

  const root = opts.rootArg ? resolve(opts.rootArg) : defaultRoot;

  if (opts.update) {
    try {
      const res = updateUiChecksums(root);
      console.log(`已更新 ${UI_RELATIVE_DIR}/${CHECKSUM_FILENAME}（共 ${res.fileCount} 个文件）。`);
      return 0;
    } catch (err) {
      console.error(err.message);
      return 1;
    }
  }

  const res = verifyUiPrimitives(root);
  if (res.error) {
    console.error(res.error);
    console.error('修复方式：请运行 pnpm --dir web ui:sync');
    return 1;
  }

  if (!res.ok) {
    for (const file of res.modified) {
      console.error(`漂移 [已修改] ${UI_RELATIVE_DIR}/${file}`);
    }
    for (const file of res.deleted) {
      console.error(`漂移 [已删除] ${UI_RELATIVE_DIR}/${file}`);
    }
    for (const file of res.untracked) {
      console.error(`漂移 [未登记] ${UI_RELATIVE_DIR}/${file}`);
    }
    console.error('禁止手改 web/src/components/ui/* 源码；若确需新增或升级 shadcn 官方原语，请运行：pnpm --dir web ui:sync');
    return 1;
  }

  console.log(`${UI_RELATIVE_DIR} 校验和通过（${res.fileCount} 个文件，未发生非预期改动）。`);
  return 0;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  process.exit(main(process.argv.slice(2)));
}
