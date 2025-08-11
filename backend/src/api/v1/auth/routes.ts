import { Hono } from 'hono';
import { z } from 'zod';
import { AuthService } from '../../../services/auth/authService';
import { requestValidator } from '../../../middleware/requestValidator';
import { badRequest, unauthorized } from '../../../middleware/errorHandler';

// Define the router
const router = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  }
}>();

// Define validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  handle: z.string().min(2, 'Handle must be at least 2 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string(),
});

// Register endpoint
router.post(
  '/register',
  requestValidator({ body: registerSchema }),
  async (c) => {
    try {
      // Get validated data
      const { email, password, handle } = c.get('validatedBody');
      
      // Initialize auth service
      const authService = new AuthService(
        c.env.DATABASE_URL,
        c.env.JWT_SECRET
      );
      
      // Register user
      const result = await authService.register(email, password, handle);
      
      return c.json({
        status: 'success',
        message: 'User registered successfully',
        data: {
          user: result.user,
          token: result.token,
        }
      }, 201);
    } catch (error) {
      if (error.message === 'User already exists') {
        throw badRequest('User with this email already exists');
      }
      throw error;
    }
  }
);

// Login endpoint
router.post(
  '/login',
  requestValidator({ body: loginSchema }),
  async (c) => {
    try {
      // Get validated data
      const { email, password } = c.get('validatedBody');
      
      // Initialize auth service
      const authService = new AuthService(
        c.env.DATABASE_URL,
        c.env.JWT_SECRET
      );
      
      // Login user
      const result = await authService.login(email, password);
      
      return c.json({
        status: 'success',
        message: 'User logged in successfully',
        data: {
          user: result.user,
          token: result.token,
        }
      });
    } catch (error) {
      if (error.message === 'Invalid email or password') {
        throw unauthorized('Invalid email or password');
      }
      throw error;
    }
  }
);

// Verify token endpoint
router.post('/verify', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw unauthorized('No token provided');
    }
    
    const token = authHeader.split(' ')[1];
    
    // Initialize auth service
    const authService = new AuthService(
      c.env.DATABASE_URL,
      c.env.JWT_SECRET
    );
    
    // Verify token
    const decoded = await authService.verifyToken(token);
    
    return c.json({
      status: 'success',
      message: 'Token is valid',
      data: { userId: decoded.id }
    });
  } catch (error) {
    throw unauthorized('Invalid or expired token');
  }
});

export default router;