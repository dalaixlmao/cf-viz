import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';
import { cache } from './middleware/cache';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { requestValidator } from './middleware/requestValidator';
import authRoutes from './api/v1/auth/routes';
import userRoutes from './api/v1/users/routes';
import codeforcesRoutes from './api/v1/codeforces/routes';
import aiRoutes from './api/v1/ai/routes';

// Define application bindings
interface Bindings {
  DATABASE_URL: string;
  DIRECT_URL: string;
  JWT_SECRET: string;
  OPENAI_API_KEY: string;
  CACHE: KVNamespace;
  ENVIRONMENT: string;
}

// Create the Hono app
const app = new Hono<{ Bindings: Bindings }>();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', errorHandler());
app.use('*', secureHeaders());
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://cfviz.com'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));

// API routes with versioning
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/users', userRoutes);
app.route('/api/v1/codeforces', codeforcesRoutes);
app.route('/api/v1/ai', aiRoutes);

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Metrics endpoint
app.get('/metrics', (c) => {
  // In a real implementation, collect metrics from a metrics store
  return c.json({
    requestCount: 0,
    errorRate: 0,
    averageResponseTime: 0,
    p95ResponseTime: 0,
  });
});

// Root route
app.get('/', (c) => {
  return c.json({
    message: 'Welcome to CFviz API',
    documentation: '/api/v1/docs',
    health: '/health',
  });
});

// Not found handler
app.notFound((c) => {
  return c.json({
    status: 404,
    message: 'Not Found',
    path: c.req.path,
  }, 404);
});

export default app;