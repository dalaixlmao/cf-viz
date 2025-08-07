import { Hono } from "hono";
import { userAuthCheck } from "../../middleware/userAuthMiddleware";

export const cachingRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JwtPassword: string;
    CACHE: KVNamespace; // Cloudflare KV for caching
  };
}>();

/**
 * Cache middleware for Codeforces API requests
 * - Checks for cached response before making API calls
 * - Caches API responses for a configurable TTL
 */
async function cacheMiddleware(c: any, next: any) {
  // Extract the request path and query parameters
  const requestUrl = c.req.url;
  const cacheKey = `cf_api:${requestUrl}`;

  // Check if we have a cached response
  const cachedResponse = await c.env.CACHE.get(cacheKey);
  
  if (cachedResponse) {
    // Return cached response
    return c.json(JSON.parse(cachedResponse));
  }
  
  // No cache hit, proceed with the request
  await next();
  
  // After the request is processed, cache the response
  // We get the response by copying the response object
  const response = c.res;
  const originalResponseJson = await response.clone().json();
  
  // Only cache successful responses
  if (response.status === 200) {
    // Cache TTL varies by endpoint type
    let cacheTtl = 300; // Default 5 minutes
    
    // Longer cache for static data like problem sets
    if (requestUrl.includes('problemset.problems')) {
      cacheTtl = 3600; // 1 hour
    }
    // Very short cache for user submissions or contest standings
    else if (requestUrl.includes('user.status') || requestUrl.includes('contest.standings')) {
      cacheTtl = 60; // 1 minute
    }
    
    // Store in cache
    await c.env.CACHE.put(
      cacheKey,
      JSON.stringify(originalResponseJson),
      { expirationTtl: cacheTtl }
    );
  }
}

/**
 * Cached proxy endpoint for Codeforces API
 * Allows frontend to make API calls through our backend with caching
 */
cachingRouter.get("/cf-api/*", userAuthCheck, cacheMiddleware, async (c) => {
  try {
    // Extract the path after "/cf-api/"
    const cfPath = c.req.path.replace('/cf-api/', '');
    const queryString = new URL(c.req.url).search;
    
    // Build the Codeforces API URL
    const apiUrl = `https://codeforces.com/api/${cfPath}${queryString}`;
    
    // Make the request to Codeforces API
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data.status !== "OK") {
      c.status(502);
      return c.json({ 
        success: false, 
        message: "Error from Codeforces API",
        error: data.comment || "Unknown error" 
      });
    }
    
    return c.json({ 
      success: true, 
      data: data.result
    });
  } catch (error: any) {
    console.error("CF API proxy error:", error);
    c.status(500);
    return c.json({ 
      success: false,
      message: "Failed to fetch data from Codeforces API",
      error: error.message
    });
  }
});

/**
 * Cache management endpoints
 */

// Invalidate specific cache entry
cachingRouter.delete("/cache/:key", userAuthCheck, async (c) => {
  try {
    const key = `cf_api:${c.req.param('key')}`;
    await c.env.CACHE.delete(key);
    
    return c.json({
      success: true,
      message: `Cache entry ${key} invalidated`
    });
  } catch (error: any) {
    c.status(500);
    return c.json({
      success: false,
      message: "Failed to invalidate cache",
      error: error.message
    });
  }
});

// Get cache status
cachingRouter.get("/cache-status", userAuthCheck, async (c) => {
  try {
    // We don't have a way to list all keys in KV from within a Worker
    // Instead, we'll check for common cache keys
    const commonKeys = [
      "cf_api:problemset.problems",
      "cf_api:contest.list"
    ];
    
    const status = {};
    
    for (const key of commonKeys) {
      const value = await c.env.CACHE.get(key);
      status[key] = value ? "cached" : "not cached";
    }
    
    return c.json({
      success: true,
      status
    });
  } catch (error: any) {
    c.status(500);
    return c.json({
      success: false,
      message: "Failed to get cache status",
      error: error.message
    });
  }
});

export default cachingRouter;