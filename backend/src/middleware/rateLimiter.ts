import { Context, MiddlewareHandler } from 'hono';
import { tooManyRequests } from './errorHandler';

/**
 * Rate limiter configuration
 */
interface RateLimiterOptions {
  limit: number;            // Maximum requests allowed in the window
  window: number;           // Time window in seconds
  keyGenerator?: (c: Context) => Promise<string> | string; // Function to generate rate limit key
}

/**
 * Rate limiter middleware for Hono
 * 
 * This middleware limits the number of requests a client can make in a given time window.
 * It uses Cloudflare KV for distributed rate limiting.
 * 
 * @param options Rate limiter options
 */
export const rateLimiter = (options: RateLimiterOptions): MiddlewareHandler => {
  const {
    limit = 60,
    window = 60,
    keyGenerator = (c: Context) => {
      // Default key generator uses IP address
      const ip = c.req.header('CF-Connecting-IP') || 
                 c.req.header('X-Forwarded-For') || 
                 'unknown';
      return `ratelimit:${ip}:${c.req.path}`;
    }
  } = options;

  return async (c, next) => {
    try {
      const cache = c.env.CACHE;
      const key = await keyGenerator(c);
      
      // Get current counter value
      const counterValue = await cache.get(key);
      const count = counterValue ? parseInt(counterValue) : 0;
      
      if (count >= limit) {
        // Calculate retry-after header
        const retryAfter = window;
        c.header('Retry-After', String(retryAfter));
        
        throw tooManyRequests(`Rate limit of ${limit} requests per ${window} seconds exceeded`, retryAfter);
      }
      
      // Increment the counter
      await cache.put(key, String(count + 1), {
        expirationTtl: window
      });
      
      // Add rate limit headers
      c.header('X-RateLimit-Limit', String(limit));
      c.header('X-RateLimit-Remaining', String(limit - count - 1));
      c.header('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + window));
      
      await next();
    } catch (error) {
      // If error is from our rate limiter, rethrow, otherwise let errorHandler deal with it
      if (error.name === 'ApiError' && error.statusCode === 429) {
        throw error;
      }
      
      // If the rate limiter itself fails, log and continue
      console.error('Rate limiter error:', error);
      await next();
    }
  };
};

/**
 * IP-based rate limiter
 * 
 * @param limit Requests per window
 * @param window Time window in seconds
 */
export const ipRateLimiter = (limit: number = 60, window: number = 60): MiddlewareHandler => {
  return rateLimiter({
    limit,
    window,
    keyGenerator: (c: Context) => {
      const ip = c.req.header('CF-Connecting-IP') || 
                 c.req.header('X-Forwarded-For') || 
                 'unknown';
      return `ratelimit:ip:${ip}:${c.req.path}`;
    }
  });
};

/**
 * User-based rate limiter
 * 
 * @param limit Requests per window
 * @param window Time window in seconds
 */
export const userRateLimiter = (limit: number = 100, window: number = 60): MiddlewareHandler => {
  return rateLimiter({
    limit,
    window,
    keyGenerator: async (c: Context) => {
      // Try to get user ID from JWT payload
      try {
        const userId = c.get('jwtPayload')?.id || 'anonymous';
        return `ratelimit:user:${userId}:${c.req.path}`;
      } catch {
        // Fall back to IP if user ID is not available
        const ip = c.req.header('CF-Connecting-IP') || 
                   c.req.header('X-Forwarded-For') || 
                   'unknown';
        return `ratelimit:ip:${ip}:${c.req.path}`;
      }
    }
  });
};