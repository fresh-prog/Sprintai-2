import { BadRequest } from '../utils/errors.js';

/**
 * Zod request validator. Pass any subset of { body, params, query }.
 * Replaces the parsed shape on `req` so downstream handlers get clean data.
 */
export function validate(schemas) {
  return (req, _res, next) => {
    try {
      for (const key of ['body', 'params', 'query']) {
        if (schemas[key]) req[key] = schemas[key].parse(req[key]);
      }
      next();
    } catch (e) {
      next(BadRequest('VALIDATION_FAILED', 'Invalid request', e.flatten?.() ?? String(e)));
    }
  };
}
