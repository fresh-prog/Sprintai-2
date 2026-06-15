// Teach the global JSON encoder how to handle Prisma's BigInt autoincrement
// ids. Without this, every Socket.IO emit that carries a Prisma row crashes
// the process with `TypeError: Do not know how to serialize a BigInt`,
// which (because nodemon restarts but mid-flight HTTP requests die) shows
// up on the frontend as ERR_EMPTY_RESPONSE / "Network Error".
//
// We're safe to convert to Number — autoincrement ids stay well within 2^53
// in any realistic deployment. Must run before anything imports a router.
BigInt.prototype.toJSON = function () { return Number(this); };

import http from 'node:http';
import { buildApp } from './app.js';
import { attachSockets } from './sockets/index.js';
import { startPoseConsumer } from './sockets/poseConsumer.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { seedAdmin } from './config/seed.js';

const app = buildApp();
const server = http.createServer(app);
const io = attachSockets(server);
startPoseConsumer(io);

// Seed the admin account (no-op unless ADMIN_EMAIL/ADMIN_PASSWORD are set).
seedAdmin().catch((err) => logger.error({ err: err.message }, 'admin seed error'));

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
