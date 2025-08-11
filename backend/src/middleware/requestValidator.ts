import { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';
import { badRequest } from './errorHandler';

/**
 * Request validator middleware
 * 
 * This middleware validates request body, query parameters, and headers against Zod schemas.
 * 
 * @param options Validator options
 */
export const requestValidator = <
  B extends z.ZodType = z.ZodTypeAny,
  Q extends z.ZodType = z.ZodTypeAny,
  H extends z.ZodType = z.ZodTypeAny
>(options: {
  body?: B;
  query?: Q;
  headers?: H;
}): MiddlewareHandler => {
  return async (c, next) => {
    try {
      // Validate request body if schema is provided
      if (options.body) {
        try {
          const body = await c.req.json();
          const validatedBody = await options.body.parseAsync(body);
          c.set('validatedBody', validatedBody);
        } catch (error) {
          throw badRequest('Invalid request body', {
            errors: error.errors || [{ message: 'Invalid JSON format' }]
          });
        }
      }
      
      // Validate query parameters if schema is provided
      if (options.query) {
        try {
          const query = Object.fromEntries(new URL(c.req.url).searchParams);
          const validatedQuery = await options.query.parseAsync(query);
          c.set('validatedQuery', validatedQuery);
        } catch (error) {
          throw badRequest('Invalid query parameters', {
            errors: error.errors || [{ message: 'Invalid query parameter format' }]
          });
        }
      }
      
      // Validate headers if schema is provided
      if (options.headers) {
        try {
          const headers = Object.fromEntries(
            [...c.req.headers.entries()].map(([key, value]) => [key.toLowerCase(), value])
          );
          const validatedHeaders = await options.headers.parseAsync(headers);
          c.set('validatedHeaders', validatedHeaders);
        } catch (error) {
          throw badRequest('Invalid headers', {
            errors: error.errors || [{ message: 'Invalid header format' }]
          });
        }
      }
      
      await next();
    } catch (error) {
      // If it's already a badRequest error, just throw it
      if (error.name === 'ApiError') {
        throw error;
      }
      
      // Otherwise, create a new badRequest error
      throw badRequest('Validation error', {
        errors: error.errors || [{ message: error.message }]
      });
    }
  };
};