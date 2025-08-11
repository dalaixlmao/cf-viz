import { Context, MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  statusCode: number;
  errorCode: string;
  details?: any;

  constructor(message: string, statusCode: number = 500, errorCode: string = 'INTERNAL_SERVER_ERROR', details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}

/**
 * Error handler middleware for Hono
 * 
 * This middleware catches errors thrown in route handlers and returns a standardized error response.
 */
export const errorHandler = (): MiddlewareHandler => {
  return async (c, next) => {
    try {
      await next();
    } catch (error: any) {
      console.error('Error in request:', error);
      
      // Format error response based on error type
      if (error instanceof ApiError) {
        return c.json({
          status: 'error',
          message: error.message,
          code: error.errorCode,
          details: error.details,
        }, error.statusCode);
      } else if (error instanceof HTTPException) {
        return c.json({
          status: 'error',
          message: error.message,
          code: `HTTP_${error.status}`,
        }, error.status);
      } else {
        // For unexpected errors, return a generic error message
        const statusCode = error.status || 500;
        const isDev = c.env.ENVIRONMENT === 'development';
        
        return c.json({
          status: 'error',
          message: isDev ? error.message : 'An unexpected error occurred',
          code: 'INTERNAL_SERVER_ERROR',
          ...(isDev && { stack: error.stack }),
        }, statusCode);
      }
    }
  };
};

/**
 * Not found error
 */
export const notFound = (message: string = 'Resource not found') => {
  return new ApiError(message, 404, 'NOT_FOUND');
};

/**
 * Bad request error
 */
export const badRequest = (message: string = 'Bad request', details?: any) => {
  return new ApiError(message, 400, 'BAD_REQUEST', details);
};

/**
 * Unauthorized error
 */
export const unauthorized = (message: string = 'Unauthorized') => {
  return new ApiError(message, 401, 'UNAUTHORIZED');
};

/**
 * Forbidden error
 */
export const forbidden = (message: string = 'Forbidden') => {
  return new ApiError(message, 403, 'FORBIDDEN');
};

/**
 * Rate limit exceeded error
 */
export const tooManyRequests = (message: string = 'Rate limit exceeded', retryAfter?: number) => {
  const error = new ApiError(message, 429, 'RATE_LIMIT_EXCEEDED');
  if (retryAfter) {
    error.details = { retryAfter };
  }
  return error;
};

/**
 * Service unavailable error
 */
export const serviceUnavailable = (message: string = 'Service unavailable') => {
  return new ApiError(message, 503, 'SERVICE_UNAVAILABLE');
};