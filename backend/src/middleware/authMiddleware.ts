import { Context, MiddlewareHandler } from 'hono';
import { verify } from 'hono/jwt';
import { unauthorized, forbidden } from './errorHandler';

/**
 * Authentication middleware for Hono
 * 
 * This middleware verifies the JWT token in the Authorization header and sets the decoded payload in the context.
 */
export const authMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    try {
      // Get Authorization header
      const authHeader = c.req.header('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw unauthorized('Missing or invalid Authorization header');
      }
      
      // Extract token
      const token = authHeader.split(' ')[1];
      
      // Verify token
      const decoded = await verify(token, c.env.JWT_SECRET);
      
      // Set decoded payload in context
      c.set('jwtPayload', decoded);
      
      await next();
    } catch (error) {
      if (error.name === 'JwtError') {
        throw unauthorized('Invalid or expired token');
      }
      throw error;
    }
  };
};

/**
 * Role-based authorization middleware
 * 
 * This middleware checks if the authenticated user has the required role.
 * It must be used after the authMiddleware.
 * 
 * @param roles Allowed roles
 */
export const roleMiddleware = (roles: string[]): MiddlewareHandler => {
  return async (c, next) => {
    try {
      // Get JWT payload
      const payload = c.get('jwtPayload');
      
      if (!payload) {
        throw unauthorized('Authentication required');
      }
      
      // Check if user has required role
      if (!payload.role || !roles.includes(payload.role)) {
        throw forbidden('Insufficient permissions');
      }
      
      await next();
    } catch (error) {
      if (error.name === 'ApiError') {
        throw error;
      }
      throw forbidden('Access denied');
    }
  };
};