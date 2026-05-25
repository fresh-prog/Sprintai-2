import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.js'],
    include: ['src/**/*.test.js'],
    globals: false,
  },
});
