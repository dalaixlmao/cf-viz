import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import * as crypto from 'crypto';
import { sign, verify } from 'hono/jwt';

/**
 * Auth service for user authentication and authorization
 */
export class AuthService {
  private prisma: PrismaClient;
  private jwtSecret: string;
  
  constructor(databaseUrl: string, jwtSecret: string) {
    this.prisma = new PrismaClient({ 
      datasourceUrl: databaseUrl 
    }).$extends(withAccelerate());
    this.jwtSecret = jwtSecret;
  }
  
  /**
   * Register a new user
   * 
   * @param email User email
   * @param password User password (will be hashed)
   * @param handle Codeforces handle
   * @returns User object and JWT token
   */
  async register(email: string, password: string, handle: string) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      throw new Error('User already exists');
    }
    
    // Hash the password
    const hashedPassword = await this.hashPassword(password);
    
    // Create the user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        handle
      }
    });
    
    // Generate JWT token
    const token = await this.generateToken(user.id);
    
    // Return user (without password) and token
    const { password: _, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      token
    };
  }
  
  /**
   * Login a user
   * 
   * @param email User email
   * @param password User password
   * @returns User object and JWT token
   */
  async login(email: string, password: string) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      throw new Error('Invalid email or password');
    }
    
    // Verify password
    const isValid = await this.verifyPassword(password, user.password);
    
    if (!isValid) {
      throw new Error('Invalid email or password');
    }
    
    // Generate JWT token
    const token = await this.generateToken(user.id);
    
    // Return user (without password) and token
    const { password: _, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      token
    };
  }
  
  /**
   * Verify JWT token
   * 
   * @param token JWT token
   * @returns Decoded token payload
   */
  async verifyToken(token: string) {
    try {
      const decoded = await verify(token, this.jwtSecret);
      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
  
  /**
   * Generate JWT token
   * 
   * @param userId User ID
   * @returns JWT token
   */
  private async generateToken(userId: number) {
    const payload = {
      id: userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
    };
    
    return await sign(payload, this.jwtSecret);
  }
  
  /**
   * Hash password using scrypt
   * 
   * @param password Plain text password
   * @returns Hashed password
   */
  private async hashPassword(password: string) {
    // In a real implementation, use a proper password hashing library like Argon2 or bcrypt
    // For this example, we're using Node.js crypto scrypt with salt
    
    // Generate random salt
    const salt = crypto.randomBytes(16).toString('hex');
    
    // Hash the password
    return new Promise<string>((resolve, reject) => {
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        resolve(`${salt}:${derivedKey.toString('hex')}`);
      });
    });
  }
  
  /**
   * Verify password against hashed password
   * 
   * @param password Plain text password
   * @param hashedPassword Hashed password
   * @returns Whether password is valid
   */
  private async verifyPassword(password: string, hashedPassword: string) {
    // In a real implementation, use a proper password hashing library like Argon2 or bcrypt
    // For this example, we're using Node.js crypto scrypt with salt
    
    // Extract salt from stored hash
    const [salt, hash] = hashedPassword.split(':');
    
    // Hash the password with the same salt
    return new Promise<boolean>((resolve, reject) => {
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        resolve(derivedKey.toString('hex') === hash);
      });
    });
  }
}