import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Dev server only (prod is served by nginx). Allow access from the Docker
    // service hostname so headless screenshots on the compose network work.
    allowedHosts: true,
  },
});
