import { describe, expect, it } from 'vitest';
import { calcPercentile, summarizeFpsSamples } from '../perfStats';

describe('perfStats', () => {
  it('returns 0 for empty percentile input', () => {
    expect(calcPercentile([], 0.01)).toBe(0);
  });

  it('calculates percentile index correctly', () => {
    expect(calcPercentile([40, 45, 50, 60], 0.5)).toBe(45);
  });

  it('summarizes fps samples with 1% low', () => {
    const summary = summarizeFpsSamples([0, 48, 52, 60, 58, 50]);
    expect(summary.samples).toBe(5);
    expect(summary.avgFps).toBe(54);
    expect(summary.minFps).toBe(48);
    expect(summary.p1LowFps).toBe(48);
  });
});
