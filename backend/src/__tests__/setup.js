// Test environment defaults. Ensures `env.js` can validate before any
// service file is imported.
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-32characters-long';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-32characters-long';
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL ||= 'redis://localhost:6379';
process.env.ML_SERVICE_URL ||= 'http://localhost:8001';
process.env.BIOMECH_SERVICE_URL ||= 'http://localhost:8002';
