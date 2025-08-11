import { MiddlewareHandler } from 'hono';

type CacheOptions = {
  ttl?: number; // Cache TTL in seconds
  keyPrefix?: string; // Cache key prefix
  cacheControl?: string; // Cache control header
  varyBy?: string[]; // List of headers to vary cache by
};

/**
 * Cache middleware for Hono
 * 
 * This middleware caches responses in Cloudflare KV store and serves them directly
 * for subsequent requests to the same endpoint with the same parameters.
 * 
 * @param options Cache options
 */
export const cache = (options: CacheOptions = {}): MiddlewareHandler => {
  const {
    ttl = 60, // Default: 1 minute
    keyPrefix = 'cfviz:cache:',
    cacheControl = `max-age=${ttl}, s-maxage=${ttl}`,
    varyBy = [],
  } = options;

  return async (c, next) => {
    // Skip caching for non-GET requests
    if (c.req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    let cacheKey = `${keyPrefix}${c.req.path}`;

    // Add query parameters to the key
    const url = new URL(c.req.url);
    if (url.search) {
      cacheKey += url.search;
    }

    // Add varyBy headers to the key
    if (varyBy.length > 0) {
      const varyValues = varyBy
        .map((header) => c.req.header(header))
        .filter(Boolean)
        .join(':');
      
      if (varyValues) {
        cacheKey += `:${varyValues}`;
      }
    }

    // Check if the resource is cached
    const cache = c.env.CACHE;
    const cachedResponse = await cache.get(cacheKey);
    
    if (cachedResponse) {
      try {
        const parsedResponse = JSON.parse(cachedResponse);
        return c.json(parsedResponse.data, parsedResponse.status);
      } catch (error) {
        // If parsing fails, ignore cache and continue
        console.error('Cache parsing error:', error);
      }
    }

    // Execute the handler
    await next();

    // Cache the response if it's successful
    if (c.res.status >= 200 && c.res.status < 300) {
      try {
        // Get response body
        const responseData = await c.res.json();
        
        // Store in cache
        await cache.put(
          cacheKey, 
          JSON.stringify({
            data: responseData,
            status: c.res.status,
            timestamp: Date.now()
          }), 
          { expirationTtl: ttl }
        );
        
        // Set cache control header
        c.header('Cache-Control', cacheControl);
      } catch (error) {
        // If caching fails, just continue without caching
        console.error('Cache storage error:', error);
      }
    }
  };
};

/**
 * Utility function to invalidate cache entries
 * 
 * @param cache KV namespace
 * @param keyPattern Pattern to match cache keys for invalidation
 */
export const invalidateCache = async (
  cache: KVNamespace, 
  keyPattern: string
): Promise<number> => {
  let invalidatedCount = 0;
  
  // List keys that match the pattern
  // Note: In a real implementation, you'd need pagination for large key sets
  const keys = await cache.list({ prefix: keyPattern });
  
  // Delete all matching keys
  const deletePromises = keys.keys.map(key => {
    invalidatedCount++;
    return cache.delete(key.name);
  });
  
  await Promise.all(deletePromises);
  return invalidatedCount;
};