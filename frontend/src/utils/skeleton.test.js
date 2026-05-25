import { describe, expect, it, vi } from 'vitest';
import { POSE_CONNECTIONS, drawSkeleton } from './skeleton.js';

function makeCtxSpy() {
  return {
    lineWidth: 0, strokeStyle: '', fillStyle: '',
    beginPath: vi.fn(),
    moveTo:    vi.fn(),
    lineTo:    vi.fn(),
    stroke:    vi.fn(),
    arc:       vi.fn(),
    fill:      vi.fn(),
  };
}

const W = 100;
const H = 100;
const landmarks = Array.from({ length: 33 }, (_, i) => ({
  x: (i / 33) % 1,
  y: ((i * 7) % 100) / 100,
  z: 0,
  visibility: 1,
}));

describe('drawSkeleton', () => {
  it('draws one stroke per connection and one circle per landmark', () => {
    const ctx = makeCtxSpy();
    drawSkeleton(ctx, landmarks, W, H);
    expect(ctx.stroke).toHaveBeenCalledTimes(POSE_CONNECTIONS.length);
    expect(ctx.arc).toHaveBeenCalledTimes(landmarks.length);
  });

  it('scales normalized coords to canvas dimensions', () => {
    const ctx = makeCtxSpy();
    drawSkeleton(ctx, landmarks, W, H);
    // arc(x, y, r, 0, 2π) — first call: landmark 0
    const [x, y, r] = ctx.arc.mock.calls[0];
    expect(x).toBeCloseTo(landmarks[0].x * W);
    expect(y).toBeCloseTo(landmarks[0].y * H);
    expect(r).toBe(4);
  });

  it('skips a connection if either endpoint is missing', () => {
    const ctx = makeCtxSpy();
    const sparse = landmarks.slice();
    sparse[12] = undefined; // R shoulder used by connection [11,12]
    drawSkeleton(ctx, sparse, W, H);
    // Strokes drawn = connections whose both endpoints exist.
    const expected = POSE_CONNECTIONS.filter(([a, b]) => sparse[a] && sparse[b]).length;
    expect(ctx.stroke).toHaveBeenCalledTimes(expected);
  });
});
