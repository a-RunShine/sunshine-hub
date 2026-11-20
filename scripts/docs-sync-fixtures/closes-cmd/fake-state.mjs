// 测试用假命令：按调用次数吐出两帧 issue 状态。
// 第 1 次返回 OPEN，第 2 次及以后返回 CLOSED。计数器落到 argv[2] 指定文件。
// 用法：node fake-state.mjs <counter-file> [<issue-number>]
import { readFileSync, writeFileSync } from 'node:fs';

const counterFile = process.argv[2];
const number = Number(process.argv[3] || 33);
let n = 0;
try {
  n = Number(readFileSync(counterFile, 'utf8').trim()) || 0;
} catch {
  n = 0;
}
writeFileSync(counterFile, String(n + 1));
const state = n === 0 ? 'OPEN' : 'CLOSED';
console.log(JSON.stringify([{ number, state }]));
