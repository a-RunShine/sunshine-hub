/**
 * 展示层格式化小工具。时分秒、日期两位补齐只在这里实现一处，
 * 倒计时 hook 与场次卡开售时刻共用，不在各自文件里再抄一份。
 */

/** 数字两位补齐：0 → "00"，7 → "07"；非数字不兜底。 */
export function pad2(value: number): string {
  return String(value).padStart(2, '0')
}
