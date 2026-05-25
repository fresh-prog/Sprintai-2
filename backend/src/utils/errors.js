export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const BadRequest = (code, message, details) => new ApiError(400, code, message, details);
export const Unauthorized = (message = 'Unauthorized') => new ApiError(401, 'UNAUTHORIZED', message);
export const Forbidden = (message = 'Forbidden') => new ApiError(403, 'FORBIDDEN', message);
export const NotFound = (message = 'Not found') => new ApiError(404, 'NOT_FOUND', message);
export const Conflict = (code, message) => new ApiError(409, code, message);
