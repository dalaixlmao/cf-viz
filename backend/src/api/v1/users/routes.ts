import { Hono } from 'hono';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import { authMiddleware } from '../../../middleware/authMiddleware';
import { requestValidator } from '../../../middleware/requestValidator';
import { cache } from '../../../middleware/cache';
import { userRateLimiter } from '../../../middleware/rateLimiter';
import { badRequest, notFound } from '../../../middleware/errorHandler';
import { CodeforcesApiService } from '../../../services/codeforces/codeforcesApiService';

// Define router
const router = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    CACHE: KVNamespace;
  }
}>();

// Apply rate limiting to user routes
router.use('*', userRateLimiter(50, 60)); // 50 requests per minute for authenticated users

/**
 * Get current user profile
 */
router.get(
  '/profile',
  authMiddleware(),
  async (c) => {
    try {
      // Get user ID from JWT
      const userId = c.get('jwtPayload').id;
      
      // Get user from database
      const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
      }).$extends(withAccelerate());
      
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        throw notFound('User not found');
      }
      
      // Return user profile (excluding password)
      const { password, ...userWithoutPassword } = user;
      
      return c.json({
        status: 'success',
        data: userWithoutPassword
      });
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Update user profile
 */
router.put(
  '/profile',
  authMiddleware(),
  requestValidator({
    body: z.object({
      handle: z.string().min(2, 'Handle must be at least 2 characters').optional(),
      email: z.string().email('Invalid email format').optional(),
    })
  }),
  async (c) => {
    try {
      // Get user ID from JWT
      const userId = c.get('jwtPayload').id;
      
      // Get validated request body
      const { handle, email } = c.get('validatedBody');
      
      // Update user in database
      const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
      }).$extends(withAccelerate());
      
      // Validate Codeforces handle if provided
      if (handle) {
        try {
          const codeforcesService = new CodeforcesApiService(c.env.CACHE);
          await codeforcesService.getUserInfo(handle);
        } catch (error) {
          throw badRequest('Invalid Codeforces handle');
        }
      }
      
      // Check email uniqueness if provided
      if (email) {
        const existingUser = await prisma.user.findUnique({
          where: { email }
        });
        
        if (existingUser && existingUser.id !== userId) {
          throw badRequest('Email already in use');
        }
      }
      
      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(handle && { handle }),
          ...(email && { email })
        }
      });
      
      // Return updated user profile (excluding password)
      const { password, ...userWithoutPassword } = updatedUser;
      
      return c.json({
        status: 'success',
        message: 'Profile updated successfully',
        data: userWithoutPassword
      });
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Get user's Codeforces dashboard data
 */
router.get(
  '/dashboard',
  authMiddleware(),
  cache({ ttl: 900 }), // Cache for 15 minutes
  async (c) => {
    try {
      // Get user ID from JWT
      const userId = c.get('jwtPayload').id;
      
      // Get user from database
      const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
      }).$extends(withAccelerate());
      
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        throw notFound('User not found');
      }
      
      // Get Codeforces data
      const codeforcesService = new CodeforcesApiService(c.env.CACHE);
      
      const [userInfo, submissions] = await Promise.all([
        codeforcesService.getUserInfo(user.handle),
        codeforcesService.getUserSubmissions(user.handle, 200)
      ]);
      
      // Process submissions to get tag data
      const tagData = processTagData(submissions);
      
      // Get performance metrics from database
      const performanceMetrics = await prisma.performanceMetric.findMany({
        where: { userId }
      });
      
      // Get recent recommendations
      const recommendations = await prisma.recommendation.findMany({
        where: { userId },
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: { problem: true }
      });
      
      // Format response
      const response = {
        userInfo: {
          handle: user.handle,
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          rank: userInfo.rank,
          maxRank: userInfo.maxRank,
          rating: userInfo.rating,
          maxRating: userInfo.maxRating,
          avatar: userInfo.avatar,
          titlePhoto: userInfo.titlePhoto,
          country: userInfo.country,
        },
        submissionStats: {
          totalSubmissions: submissions.length,
          acceptedSubmissions: submissions.filter((s: any) => s.verdict === "OK").length,
        },
        tagData,
        performanceMetrics: performanceMetrics.map(metric => ({
          tag: metric.tag,
          strengthScore: metric.strengthScore,
          problemsSolved: metric.problemsSolved,
          problemsAttempted: metric.problemsAttempted,
        })),
        recommendations: recommendations.map(rec => ({
          problemId: rec.problem.problemId,
          name: rec.problem.name,
          tags: rec.problem.tags,
          difficulty: rec.difficulty,
          reason: rec.reasonText,
          url: `https://codeforces.com/problemset/problem/${rec.problem.contestId}/${rec.problem.index}`
        }))
      };
      
      return c.json({
        status: 'success',
        data: response
      });
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Change password
 */
router.put(
  '/password',
  authMiddleware(),
  requestValidator({
    body: z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    })
  }),
  async (c) => {
    try {
      // Get user ID from JWT
      const userId = c.get('jwtPayload').id;
      
      // Get validated request body
      const { currentPassword, newPassword } = c.get('validatedBody');
      
      // Get user from database
      const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
      }).$extends(withAccelerate());
      
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        throw notFound('User not found');
      }
      
      // Verify current password
      // In a real implementation, we would use a proper password hashing library
      if (user.password !== currentPassword) {
        throw badRequest('Current password is incorrect');
      }
      
      // Update password
      // In a real implementation, we would hash the new password
      await prisma.user.update({
        where: { id: userId },
        data: { password: newPassword }
      });
      
      return c.json({
        status: 'success',
        message: 'Password updated successfully'
      });
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Process tag data from submissions
 */
function processTagData(submissions: any[]) {
  const tagStats: Record<string, { solved: number; attempted: number }> = {};
  const processedProblems = new Set();
  
  // Process submissions
  for (const submission of submissions) {
    if (!submission.problem || !submission.problem.tags) continue;
    
    const problemKey = `${submission.problem.contestId}-${submission.problem.index}`;
    const isAccepted = submission.verdict === "OK";
    
    // Process each tag
    for (const tag of submission.problem.tags) {
      if (!tagStats[tag]) {
        tagStats[tag] = { solved: 0, attempted: 0 };
      }
      
      // If we haven't processed this problem for this tag yet
      const tagProblemKey = `${tag}-${problemKey}`;
      if (!processedProblems.has(tagProblemKey)) {
        tagStats[tag].attempted++;
        
        if (isAccepted) {
          tagStats[tag].solved++;
        }
        
        processedProblems.add(tagProblemKey);
      }
    }
  }
  
  // Convert to array and calculate success rate
  return Object.entries(tagStats).map(([tag, stats]) => ({
    tag,
    solved: stats.solved,
    attempted: stats.attempted,
    successRate: stats.attempted > 0 ? stats.solved / stats.attempted : 0
  }));
}

export default router;