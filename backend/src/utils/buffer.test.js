import { describe, expect, it } from 'vitest';
import { RollingBuffer } from './buffer.js';

describe('RollingBuffer', () => {
  it('keeps at most capacity items, dropping the oldest', () => {
    const b = new RollingBuffer(3);
    b.push(1, 2, 3, 4, 5);
    expect(b.values()).toEqual([3, 4, 5]);
  });

  it('reports full only when capacity is reached', () => {
    const b = new RollingBuffer(2);
    expect(b.full).toBe(false);
    b.push('a');
    expect(b.full).toBe(false);
    b.push('b');
    expect(b.full).toBe(true);
    b.push('c');
    expect(b.full).toBe(true);
    expect(b.values()).toEqual(['b', 'c']);
  });

  it('rejects invalid capacity', () => {
    expect(() => new RollingBuffer(0)).toThrow();
    expect(() => new RollingBuffer(-1)).toThrow();
    expect(() => new RollingBuffer(1.5)).toThrow();
  });

  it('clear() resets state', () => {
    const b = new RollingBuffer(3);
    b.push(1, 2);
    b.clear();
    expect(b.length).toBe(0);
    expect(b.values()).toEqual([]);
  });
});
