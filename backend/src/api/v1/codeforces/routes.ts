import { Hono } from 'hono';
import { z } from 'zod';
import { CodeforcesApiService } from '../../../services/codeforces/codeforcesApiService';
import { requestValidator } from '../../../middleware/requestValidator';
import { authMiddleware } from '../../../middleware/authMiddleware';
import { cache } from '../../../middleware/cache';
import { ipRateLimiter } from '../../../middleware/rateLimiter';
import { badRequest, serviceUnavailable } from '../../../middleware/errorHandler';

// Define router
const router = new Hono<{
  Bindings: {
    CACHE: KVNamespace;
  }
}>();

// Apply rate limiting to all Codeforces routes
router.use('*', ipRateLimiter(30, 60)); // 30 requests per minute

// Get user info
router.get(
  '/user/:handle',
  cache({ ttl: 3600 }), // Cache for 1 hour
  async (c) => {
    try {
      const handle = c.req.param('handle');
      
      if (!handle || handle.trim() === '') {
        throw badRequest('Handle is required');
      }
      
      const codeforcesService = new CodeforcesApiService(c.env.CACHE);
      const userInfo = await codeforcesService.getUserInfo(handle);
      
      return c.json({
        status: 'success',
        data: {
          userInfo
        }
      });
    } catch (error) {
      if (error.message.includes('Codeforces API error')) {
        throw serviceUnavailable(`Failed to fetch user data: ${error.message}`);
      }
      throw error;
    }
  }
);

// Get user submissions
router.get(
  '/submissions/:handle',
  requestValidator({
    query: z.object({
      count: z.string().transform(val => parseInt(val)).optional(),
      page: z.string().transform(val => parseInt(val)).optional(),
    }).optional(),
  }),
  cache({ ttl: 900 }), // Cache for 15 minutes
  async (c) => {
    try {
      const handle = c.req.param('handle');
      const query = c.get('validatedQuery') || {};
      const count = query.count || 100;
      
      if (!handle || handle.trim() === '') {
        throw badRequest('Handle is required');
      }
      
      const codeforcesService = new CodeforcesApiService(c.env.CACHE);
      const submissions = await codeforcesService.getUserSubmissions(handle, count);
      
      // Apply pagination if requested
      let paginatedSubmissions = submissions;
      let paginationInfo = null;
      
      if (query.page) {
        const page = Math.max(1, query.page);
        const pageSize = 20;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        
        paginatedSubmissions = submissions.slice(startIndex, endIndex);
        paginationInfo = {
          total: submissions.length,
          page: page,
          pageSize: pageSize,
          totalPages: Math.ceil(submissions.length / pageSize)
        };
      }
      
      return c.json({
        status: 'success',
        data: {
          submissions: paginatedSubmissions,
          pagination: paginationInfo
        }
      });
    } catch (error) {
      if (error.message.includes('Codeforces API error')) {
        throw serviceUnavailable(`Failed to fetch submission data: ${error.message}`);
      }
      throw error;
    }
  }
);

// Get user contests
router.get(
  '/contests/:handle',
  cache({ ttl: 3600 }), // Cache for 1 hour
  async (c) => {
    try {
      const handle = c.req.param('handle');
      
      if (!handle || handle.trim() === '') {
        throw badRequest('Handle is required');
      }
      
      const codeforcesService = new CodeforcesApiService(c.env.CACHE);
      const contests = await codeforcesService.getUserContests(handle);
      
      return c.json({
        status: 'success',
        data: {
          contests
        }
      });
    } catch (error) {
      if (error.message.includes('Codeforces API error')) {
        throw serviceUnavailable(`Failed to fetch contest data: ${error.message}`);
      }
      throw error;
    }
  }
);

// Get upcoming contests
router.get(
  '/upcoming-contests',
  cache({ ttl: 3600 }), // Cache for 1 hour
  async (c) => {
    try {
      const codeforcesService = new CodeforcesApiService(c.env.CACHE);
      const contests = await codeforcesService.getUpcomingContests();
      
      return c.json({
        status: 'success',
        data: {
          contests
        }
      });
    } catch (error) {
      if (error.message.includes('Codeforces API error')) {
        throw serviceUnavailable(`Failed to fetch upcoming contests: ${error.message}`);
      }
      throw error;
    }
  }
);

// Get problem set
router.get(
  '/problemset',
  cache({ ttl: 86400 }), // Cache for 24 hours
  async (c) => {
    try {
      const codeforcesService = new CodeforcesApiService(c.env.CACHE);
      const problemSet = await codeforcesService.getProblemSet();
      
      return c.json({
        status: 'success',
        data: {
          problemCount: problemSet.problems.length,
          problems: problemSet.problems,
          problemStatistics: problemSet.problemStatistics
        }
      });
    } catch (error) {
      if (error.message.includes('Codeforces API error')) {
        throw serviceUnavailable(`Failed to fetch problem set: ${error.message}`);
      }
      throw error;
    }
  }
);

// Get problem by ID
router.get(
  '/problem/:contestId/:index',
  cache({ ttl: 86400 }), // Cache for 24 hours
  async (c) => {
    try {
      const contestId = parseInt(c.req.param('contestId'));
      const index = c.req.param('index');
      
      if (isNaN(contestId) || !index) {
        throw badRequest('Valid contestId and index are required');
      }
      
      const codeforcesService = new CodeforcesApiService(c.env.CACHE);
      const problem = await codeforcesService.getProblem(contestId, index);
      
      return c.json({
        status: 'success',
        data: {
          problem
        }
      });
    } catch (error) {
      if (error.message.includes('Problem not found')) {
        throw badRequest(error.message);
      }
      if (error.message.includes('Codeforces API error')) {
        throw serviceUnavailable(`Failed to fetch problem: ${error.message}`);
      }
      throw error;
    }
  }
);

// Invalidate cache for a user (authenticated users only)
router.post(
  '/invalidate-cache/:handle',
  authMiddleware(),
  async (c) => {
    try {
      const handle = c.req.param('handle');
      
      if (!handle || handle.trim() === '') {
        throw badRequest('Handle is required');
      }
      
      const codeforcesService = new CodeforcesApiService(c.env.CACHE);
      await codeforcesService.invalidateUserCache(handle);
      
      return c.json({
        status: 'success',
        message: `Cache invalidated for user ${handle}`
      });
    } catch (error) {
      throw error;
    }
  }
);

export default router;