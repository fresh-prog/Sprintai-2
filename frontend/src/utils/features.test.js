import { describe, expect, it } from 'vitest';
import { featureVector, POSTURE_CLASSES } from './features.js';

// 33 landmarks at (0.5, 0.5, 0). The hip midpoint sits at (0.5, 0.5) so the
// normalized output should be (0, 0) for every landmark — but shoulder-width
// is also zero in this degenerate setup, so we expect the fallback divisor
// of 1.0 to kick in.
function flat() {
  return Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
}

describe('featureVector', () => {
  it('produces a Float32Array of length 107', () => {
    const fv = featureVector(flat());
    expect(fv).toBeInstanceOf(Float32Array);
    expect(fv.length).toBe(107);
  });

  it('produces all zeros for a degenerate input', () => {
    const fv = featureVector(flat());
    expect([...fv].every((v) => v === 0)).toBe(true);
  });

  it('matches expected feature count: 33×3 normalized coords + 8 joint angles', () => {
    const fv = featureVector(flat());
    expect(fv.length).toBe(33 * 3 + 8);
  });

  it('exposes POSTURE_CLASSES that matches the backend ordering', () => {
    expect(POSTURE_CLASSES).toEqual([
      'upright', 'hunched', 'leaning_left', 'leaning_right', 'slouched',
    ]);
  });
});
