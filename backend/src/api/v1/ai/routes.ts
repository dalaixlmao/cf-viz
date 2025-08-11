import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../../../middleware/authMiddleware';
import { requestValidator } from '../../../middleware/requestValidator';
import { cache } from '../../../middleware/cache';
import { userRateLimiter } from '../../../middleware/rateLimiter';
import { badRequest, serviceUnavailable } from '../../../middleware/errorHandler';
import { RecommendationService } from '../../../services/ai/recommendationService';
import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';

// Define router
const router = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    OPENAI_API_KEY: string;
    CACHE: KVNamespace;
  }
}>();

// Apply rate limiting to AI routes (more restrictive due to OpenAI API costs)
router.use('*', userRateLimiter(20, 60)); // 20 requests per minute for authenticated users

/**
 * Get personalized problem recommendations
 */
router.get(
  '/recommendations',
  authMiddleware(),
  requestValidator({
    query: z.object({
      limit: z.string().transform(val => parseInt(val)).optional(),
    }).optional(),
  }),
  cache({ ttl: 3600 }), // Cache for 1 hour
  async (c) => {
    try {
      // Get user ID from JWT
      const userId = c.get('jwtPayload').id;
      
      // Get query parameters
      const query = c.get('validatedQuery') || {};
      const limit = query.limit || 5;
      
      // Get user from database
      const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
      }).$extends(withAccelerate());
      
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        throw badRequest('User not found');
      }
      
      // Generate recommendations
      const recommendationService = new RecommendationService(
        c.env.DATABASE_URL,
        c.env.OPENAI_API_KEY,
        c.env.CACHE
      );
      
      const recommendations = await recommendationService.generateRecommendations(
        userId,
        user.handle,
        limit
      );
      
      return c.json({
        status: 'success',
        data: { recommendations }
      });
    } catch (error) {
      console.error("Recommendation error:", error);
      
      if (error.message.includes('OpenAI API')) {
        throw serviceUnavailable('AI service temporarily unavailable');
      }
      
      throw error;
    }
  }
);

/**
 * Get contest predictions
 */
router.get(
  '/contest-predictions',
  authMiddleware(),
  cache({ ttl: 3600 }), // Cache for 1 hour
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
        throw badRequest('User not found');
      }
      
      // Generate contest predictions
      const recommendationService = new RecommendationService(
        c.env.DATABASE_URL,
        c.env.OPENAI_API_KEY,
        c.env.CACHE
      );
      
      const predictions = await recommendationService.generateContestPredictions(
        userId,
        user.handle
      );
      
      return c.json({
        status: 'success',
        data: { predictions }
      });
    } catch (error) {
      console.error("Contest prediction error:", error);
      
      if (error.message.includes('OpenAI API')) {
        throw serviceUnavailable('AI service temporarily unavailable');
      }
      
      throw error;
    }
  }
);

/**
 * Get performance analysis
 */
router.get(
  '/performance-analysis',
  authMiddleware(),
  cache({ ttl: 3600 }), // Cache for 1 hour
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
        throw badRequest('User not found');
      }
      
      // Analyze performance
      const recommendationService = new RecommendationService(
        c.env.DATABASE_URL,
        c.env.OPENAI_API_KEY,
        c.env.CACHE
      );
      
      const performanceData = await recommendationService.analyzePerformance(
        userId,
        user.handle
      );
      
      return c.json({
        status: 'success',
        data: performanceData
      });
    } catch (error) {
      console.error("Performance analysis error:", error);
      throw error;
    }
  }
);

/**
 * AI assistant chat endpoint
 */
router.post(
  '/assistant/chat',
  authMiddleware(),
  requestValidator({
    body: z.object({
      message: z.string().min(1, 'Message is required'),
      context: z.object({
        problemId: z.string().optional(),
        code: z.string().optional(),
      }).optional(),
    }),
  }),
  async (c) => {
    try {
      // Get validated request body
      const { message, context } = c.get('validatedBody');
      
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
        throw badRequest('User not found');
      }
      
      // Create OpenAI client
      const openai = new OpenAI({
        apiKey: c.env.OPENAI_API_KEY
      });
      
      // Prepare system message based on context
      let systemMessage = `You are an expert competitive programming coach assisting ${user.handle}. Provide concise, helpful responses about algorithms, data structures, and programming techniques.`;
      
      // If problem context is provided, add it to the system message
      if (context?.problemId) {
        systemMessage += ` The user is asking about problem ${context.problemId}.`;
      }
      
      // Create chat completion
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 500
      });
      
      // Extract response
      const response = completion.choices[0].message.content;
      
      // Generate follow-up questions (if any)
      const followupQuestions = await generateFollowupQuestions(
        openai, 
        message, 
        response
      );
      
      return c.json({
        status: 'success',
        data: {
          response,
          followupQuestions
        }
      });
    } catch (error) {
      console.error("AI assistant error:", error);
      
      if (error.message.includes('OpenAI API')) {
        throw serviceUnavailable('AI service temporarily unavailable');
      }
      
      throw error;
    }
  }
);

/**
 * Generate follow-up questions based on the conversation
 */
async function generateFollowupQuestions(openai: any, question: string, answer: string) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: "Generate 2-3 relevant follow-up questions that the user might want to ask next based on their original question and your answer. Return the questions as a concise comma-separated list with no explanations or numbering." 
        },
        { role: "user", content: `Original question: ${question}\n\nYour answer: ${answer}` }
      ],
      temperature: 0.7,
      max_tokens: 150
    });
    
    // Parse comma-separated questions into an array
    const questionsText = completion.choices[0].message.content;
    const questions = questionsText
      .split(/,\s*/)
      .filter(q => q.trim().length > 0)
      .map(q => q.trim().replace(/\?$/, '?'));
    
    return questions.slice(0, 3);
  } catch (error) {
    console.error("Error generating follow-up questions:", error);
    return [];
  }
}

export default router;