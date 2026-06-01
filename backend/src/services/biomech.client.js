import axios from 'axios';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { timeExternal } from '../observability/metrics.js';

const client = axios.create({ baseURL: env.BIOMECH_SERVICE_URL, timeout: 30_000 });

async function safeCall(path, body) {
  return timeExternal('biomech', path, async () => {
    try {
      const { data } = await client.post(path, body);
      return data;
    } catch (err) {
      logger.warn({ err: err.message, path }, 'biomech service call failed');
      return null;
    }
  });
}

export const biomechClient = {
  // Full IK pass on a completed session.
  runInverseKinematics: (sessionId, frames, rateHz = 30) =>
    safeCall('/ik/run', { sessionId, frames, rateHz }),
  computeGait: (frames) => safeCall('/gait', { frames }),
  computeRom: (frames) => safeCall('/rom', { frames }),
  computeSummary: (frames) => safeCall('/summary', { frames }),
  // Sprint-specific endpoint. `athleteHeightCm` is optional and only used
  // to scale normalized metrics into real-world units when present.
  analyzeSprint: (frames, athleteHeightCm) =>
    safeCall('/sprint', { frames, athleteHeightCm }),
  // Per-frame fault detection (overstride, knee collapse, heel strike, ...).
  detectTechniqueErrors: (frames) => safeCall('/technique-errors', { frames }),
};
