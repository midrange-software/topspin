export const percentile = (sortedMs: number[], p: number): number => {
  if (sortedMs.length === 0) return 0
  const idx = Math.ceil((p / 100) * sortedMs.length) - 1
  return sortedMs[Math.max(0, idx)]
}

export const msToHours = (ms: number) => Math.round(ms / (1000 * 60 * 60))

export const median = (sortedMs: number[]) => percentile(sortedMs, 50)
