/**
 * Bounded rolling buffer. push() appends and trims to `capacity`. Exposed as a
 * standalone helper because both the WS consumer and the activity-window
 * pipeline depend on the exact same semantics — and now we can unit-test
 * those semantics in isolation.
 */
export class RollingBuffer {
  constructor(capacity) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new Error('capacity must be a positive integer');
    }
    this.capacity = capacity;
    this._items = [];
  }

  push(...items) {
    this._items.push(...items);
    if (this._items.length > this.capacity) {
      this._items.splice(0, this._items.length - this.capacity);
    }
    return this._items.length;
  }

  get length() { return this._items.length; }
  get full() { return this._items.length === this.capacity; }
  values() { return [...this._items]; }
  clear() { this._items.length = 0; }
}
