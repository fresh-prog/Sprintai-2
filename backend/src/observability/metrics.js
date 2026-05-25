// Prometheus metrics — exposed at GET /metrics. Default node metrics plus a
// few we care about: HTTP latency, WS frame ingest, and external service
// call durations.

import client from 'prom-client';

const register = new client.Registry();
register.setDefaultLabels({ service: 'sprintai-backend' });
client.collectDefaultMetrics({ register });

export const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency, seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});
register.registerMetric(httpDuration);

export const framesIngested = new client.Counter({
  name: 'pose_frames_ingested_total',
  help: 'Pose frames received over WS, before down-sampling',
});
register.registerMetric(framesIngested);

export const framesPersisted = new client.Counter({
  name: 'pose_frames_persisted_total',
  help: 'Pose frames written to Postgres after down-sampling',
});
register.registerMetric(framesPersisted);

export const externalCalls = new client.Histogram({
  name: 'external_service_call_seconds',
  help: 'Latency of HTTP calls to ML / biomech services',
  labelNames: ['service', 'route', 'ok'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30],
});
register.registerMetric(externalCalls);

/** Express middleware: records HTTP duration per route. */
export function httpDurationMiddleware(req, res, next) {
  const end = httpDuration.startTimer({ method: req.method });
  res.on('finish', () => {
    // `req.route?.path` is set by the matched router; falls back to req.path
    // for 404s, which keeps cardinality bounded.
    const route = req.route?.path ?? req.path;
    end({ route, status: String(res.statusCode) });
  });
  next();
}

/** Wrapper for axios-style clients so external latency shows up in /metrics. */
export async function timeExternal(service, route, fn) {
  const end = externalCalls.startTimer({ service, route });
  let ok = 'true';
  try {
    return await fn();
  } catch (err) {
    ok = 'false';
    throw err;
  } finally {
    end({ ok });
  }
}

/** Exposes the registry's text format. */
export async function metricsHandler(_req, res) {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
}
