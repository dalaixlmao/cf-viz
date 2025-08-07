import { Hono } from "hono";
import { userAuthCheck } from "../../middleware/userAuthMiddleware";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { generateRecommendations, generateContestPredictions } from "../../controllers/ai/recommendationEngine";
import { analyzePerformance } from "../../controllers/ai/performanceAnalyzer";

export const aiRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JwtPassword: string;
    OPENAI_API_KEY: string;
  };
}>();

// Get personalized problem recommendations
aiRouter.get("/recommendations", userAuthCheck, async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const userId = c.get('jwtPayload');
    const limit = parseInt(c.req.query('limit') || '5');
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      c.status(404);
      return c.json({ message: "User not found" });
    }
    
    // Get recommendations based on user's performance data
    const recommendations = await generateRecommendations(
      prisma,
      user.handle,
      userId,
      limit,
      c.env.OPENAI_API_KEY
    );

    return c.json({ 
      success: true, 
      recommendations 
    });
  } catch (error: any) {
    console.error("Recommendation error:", error);
    c.status(500);
    return c.json({ 
      success: false, 
      message: "Failed to generate recommendations",
      error: error.message 
    });
  }
});

// Get contest predictions and preparation advice
aiRouter.get("/contest-predictions", userAuthCheck, async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const userId = c.get('jwtPayload');
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      c.status(404);
      return c.json({ message: "User not found" });
    }
    
    // Get predictions for upcoming contests
    const predictions = await generateContestPredictions(
      prisma,
      user.handle,
      userId,
      c.env.OPENAI_API_KEY
    );

    return c.json({ 
      success: true, 
      predictions 
    });
  } catch (error: any) {
    console.error("Contest prediction error:", error);
    c.status(500);
    return c.json({ 
      success: false, 
      message: "Failed to generate contest predictions",
      error: error.message 
    });
  }
});

// Get user performance analysis by tags/categories
aiRouter.get("/performance-analysis", userAuthCheck, async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const userId = c.get('jwtPayload');
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      c.status(404);
      return c.json({ message: "User not found" });
    }
    
    // Analyze user's performance across different problem categories
    const performanceData = await analyzePerformance(
      prisma,
      user.handle,
      userId
    );

    return c.json({ 
      success: true, 
      performanceData 
    });
  } catch (error: any) {
    console.error("Performance analysis error:", error);
    c.status(500);
    return c.json({ 
      success: false, 
      message: "Failed to analyze performance data",
      error: error.message 
    });
  }
});

export default aiRouter;