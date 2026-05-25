// Integration test for the auth flow. Mocks Prisma so the test runs without
// a live database — we're verifying HTTP wiring + service composition, not
// Prisma itself.

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---- Mocks ------------------------------------------------------------

const fakeUserStore = new Map();        // email → user row
const fakeRefreshStore = new Map();     // tokenHash → row

vi.mock('../config/db.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async ({ where }) => {
        if (where.email) return fakeUserStore.get(where.email) ?? null;
        if (where.id) {
          for (const u of fakeUserStore.values()) if (u.id === where.id) return u;
        }
        return null;
      }),
      create: vi.fn(async ({ data }) => {
        const row = { ...data, id: `user-${fakeUserStore.size + 1}`, role: 'USER' };
        fakeUserStore.set(data.email, row);
        return row;
      }),
    },
    refreshToken: {
      create: vi.fn(async ({ data }) => {
        const row = { ...data, id: `rt-${fakeRefreshStore.size + 1}` };
        fakeRefreshStore.set(data.tokenHash, row);
        return row;
      }),
      findUnique: vi.fn(async ({ where }) => fakeRefreshStore.get(where.tokenHash) ?? null),
      update: vi.fn(async ({ where, data }) => {
        for (const row of fakeRefreshStore.values()) {
          if (row.id === where.id) Object.assign(row, data);
        }
        return null;
      }),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
  },
}));

vi.mock('../config/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('pino-http', () => ({ default: () => (_req, _res, next) => next() }));

// ---- The test -----------------------------------------------------------

const { buildApp } = await import('../app.js');
const { default: request } = await import('supertest');

describe('auth flow', () => {
  let app;
  beforeEach(() => {
    fakeUserStore.clear();
    fakeRefreshStore.clear();
    app = buildApp();
  });

  it('registers a new user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'alice@example.com', password: 'correct-horse', displayName: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('alice@example.com');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('rejects duplicate emails', async () => {
    const body = { email: 'a@b.com', password: 'correct-horse', displayName: 'A' };
    await request(app).post('/api/v1/auth/register').send(body).expect(201);
    const res = await request(app).post('/api/v1/auth/register').send(body);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('rejects bad payloads with structured validation errors', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'short', displayName: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('logs in, returns an access token, sets refresh cookie', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'bob@example.com', password: 'correct-horse', displayName: 'Bob' })
      .expect(201);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'bob@example.com', password: 'correct-horse' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toMatch(/^eyJ/);
    expect(res.headers['set-cookie']?.some((c) => c.startsWith('refresh_token='))).toBe(true);
  });

  it('rejects invalid credentials', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'c@b.com', password: 'correct-horse', displayName: 'C' })
      .expect(201);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'c@b.com', password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('GET /auth/me returns the authenticated user', async () => {
    await request(app).post('/api/v1/auth/register')
      .send({ email: 'd@b.com', password: 'correct-horse', displayName: 'D' });
    const login = await request(app).post('/api/v1/auth/login')
      .send({ email: 'd@b.com', password: 'correct-horse' });

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`);

    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('d@b.com');
  });

  it('GET /auth/me without a token is 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});
