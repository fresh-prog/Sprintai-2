import axios from 'axios';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const client = axios.create({ baseURL: env.ML_SERVICE_URL, timeout: 1500 });

/** Best-effort call — on failure we log and return null so the WS pipeline keeps moving. */
async function safeCall(path, body) {
  try {
    const { data } = await client.post(path, body);
    return data;
  } catch (err) {
    logger.warn({ err: err.message, path }, 'ml service call failed');
    return null;
  }
}

export const mlClient = {
  predictPosture: (features) => safeCall('/predict/posture', { features }),
  predictActivity: (window) => safeCall('/predict/activity', { window }),
};
