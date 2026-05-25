// Unit tests for token issuance + rotation semantics. Mocks Prisma so we
// can hammer the refresh-token state machine without a real DB.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const fakeStore = new Map(); // tokenHash → row
let nextId = 0;

vi.mock('../config/db.js', () => ({
  prisma: {
    refreshToken: {
      create: vi.fn(async ({ data }) => {
        const row = { ...data, id: `rt-${++nextId}`, revokedAt: data.revokedAt ?? null };
        fakeStore.set(data.tokenHash, row);
        return row;
      }),
      findUnique: vi.fn(async ({ where }) => fakeStore.get(where.tokenHash) ?? null),
      update: vi.fn(async ({ where, data }) => {
        for (const row of fakeStore.values()) {
          if (row.id === where.id) Object.assign(row, data);
        }
      }),
      updateMany: vi.fn(async ({ where, data }) => {
        let count = 0;
        for (const row of fakeStore.values()) {
          if (row.tokenHash === where.tokenHash && row.revokedAt == null) {
            Object.assign(row, data);
            count++;
          }
        }
        return { count };
      }),
    },
  },
}));

const {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  signAccessToken,
} = await import('./token.service.js');

describe('token.service', () => {
  beforeEach(() => { fakeStore.clear(); nextId = 0; });

  it('signs a JWT that decodes to the user id', async () => {
    const token = signAccessToken({ id: 'user-1', role: 'USER' });
    const [, payloadB64] = token.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe('USER');
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  it('issueRefreshToken returns an opaque string and persists a hashed copy', async () => {
    const { raw, expiresAt } = await issueRefreshToken('user-1');
    expect(raw).toMatch(/^[A-Za-z0-9_-]{32,}$/);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    // The DB row stores the *hash*, never the raw value.
    expect([...fakeStore.keys()][0]).not.toBe(raw);
  });

  it('rotateRefreshToken returns the user id, revokes the old token, and is single-use', async () => {
    const { raw } = await issueRefreshToken('user-42');
    const first = await rotateRefreshToken(raw);
    expect(first).toBe('user-42');
    // Second attempt with the same token must fail.
    const second = await rotateRefreshToken(raw);
    expect(second).toBeNull();
  });

  it('rotateRefreshToken returns null for an unknown token', async () => {
    expect(await rotateRefreshToken('definitely-not-issued')).toBeNull();
  });

  it('revokeRefreshToken marks all active rows with that hash as revoked', async () => {
    const { raw } = await issueRefreshToken('user-9');
    await revokeRefreshToken(raw);
    const result = await rotateRefreshToken(raw);
    expect(result).toBeNull();
  });
});
