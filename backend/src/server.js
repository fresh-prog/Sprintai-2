import http from 'node:http';
import { buildApp } from './app.js';
import { attachSockets } from './sockets/index.js';
import { startPoseConsumer } from './sockets/poseConsumer.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

const app = buildApp();
const server = http.createServer(app);
const io = attachSockets(server);
startPoseConsumer(io);

server.listen(env.BACKEND_PORT, () => {
  logger.info({ port: env.BACKEND_PORT, env: env.NODE_ENV }, 'sprintai backend listening');
});

const shutdown = (sig) => {
  logger.info({ sig }, 'shutting down');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
