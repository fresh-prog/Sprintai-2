import { describe, expect, it } from 'vitest';
import { angle3, jointAngles, symmetryIndex } from './angles.js';

describe('angle3', () => {
  it('returns 90° for perpendicular vectors', () => {
    const a = { x: 1, y: 0, z: 0 };
    const b = { x: 0, y: 0, z: 0 };
    const c = { x: 0, y: 1, z: 0 };
    expect(angle3(a, b, c)).toBeCloseTo(90, 5);
  });

  it('returns 180° for collinear opposite vectors', () => {
    const a = { x: -1, y: 0, z: 0 };
    const b = { x: 0, y: 0, z: 0 };
    const c = { x: 1, y: 0, z: 0 };
    expect(angle3(a, b, c)).toBeCloseTo(180, 5);
  });

  it('returns 0° for degenerate input', () => {
    const p = { x: 0, y: 0, z: 0 };
    expect(angle3(p, p, p)).toBe(0);
  });
});

describe('symmetryIndex', () => {
  it('is 0 for equal sides', () => {
    expect(symmetryIndex(90, 90)).toBe(0);
  });
  it('is positive and bounded for unequal sides', () => {
    expect(symmetryIndex(100, 80)).toBeCloseTo(22.22, 1);
  });
});

describe('jointAngles', () => {
  it('returns all expected joint keys', () => {
    const kp = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0 }));
    const out = jointAngles(kp);
    expect(Object.keys(out)).toEqual([
      'left_elbow', 'right_elbow',
      'left_shoulder', 'right_shoulder',
      'left_hip', 'right_hip',
      'left_knee', 'right_knee',
    ]);
  });
});
