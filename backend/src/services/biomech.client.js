import axios from 'axios';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const client = axios.create({ baseURL: env.BIOMECH_SERVICE_URL, timeout: 30_000 });

async function safeCall(path, body) {
  try {
    const { data } = await client.post(path, body);
    return data;
  } catch (err) {
    logger.warn({ err: err.message, path }, 'biomech service call failed');
    return null;
  }
}

export const biomechClient = {
  // Full IK pass on a completed session.
  runInverseKinematics: (sessionId) => safeCall('/ik/run', { sessionId }),
  computeGait: (frames) => safeCall('/gait', { frames }),
  computeRom: (frames) => safeCall('/rom', { frames }),
};
