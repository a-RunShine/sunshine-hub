export function computeOffsetMs(serverTime: string, localNow: number): number {
  const serverEpoch = Date.parse(serverTime)
  if (Number.isNaN(serverEpoch)) return 0
  return serverEpoch - localNow
}

export function serverNow(localNow: number, offsetMs: number): number {
  return localNow + offsetMs
}

export function remainingMs(target: string, now: number): number {
  const targetEpoch = Date.parse(target)
  if (Number.isNaN(targetEpoch)) return 0
  return Math.max(0, targetEpoch - now)
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
  return `${pad2(minutes)}:${pad2(seconds)}`
}
