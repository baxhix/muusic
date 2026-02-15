export function calcPercentile(sortedNumbers, ratio) {
  if (!sortedNumbers.length) return 0;
  const idx = Math.max(Math.floor(sortedNumbers.length * ratio) - 1, 0);
  return sortedNumbers[idx];
}

export function summarizeFpsSamples(samples) {
  const filtered = samples.filter((n) => n > 0);
  const sorted = [...filtered].sort((a, b) => a - b);
  const avg = filtered.length ? Math.round(filtered.reduce((a, b) => a + b, 0) / filtered.length) : 0;
  const min = sorted.length ? sorted[0] : 0;
  const p1 = Math.round(calcPercentile(sorted, 0.01));
  return {
    samples: filtered.length,
    avgFps: avg,
    minFps: min,
    p1LowFps: p1
  };
}
