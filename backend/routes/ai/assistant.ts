import { Hono } from "hono";
import { userAuthCheck } from "../../middleware/userAuthMiddleware";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { getAssistantResponse, analyzeSolution } from "../../controllers/ai/assistantService";

export const assistantRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JwtPassword: string;
    OPENAI_API_KEY: string;
  };
}>();

// Get AI assistant help for competition preparation
assistantRouter.post("/chat", userAuthCheck, async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const userId = c.get('jwtPayload');
    const { message, context } = await c.req.json();
    
    if (!message) {
      c.status(400);
      return c.json({ success: false, message: "Message is required" });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      c.status(404);
      return c.json({ success: false, message: "User not found" });
    }
    
    // Get personalized response from the AI assistant
    const response = await getAssistantResponse(
      prisma,
      user.handle,
      message,
      context,
      c.env.OPENAI_API_KEY
    );
    
    return c.json({
      success: true,
      response
    });
  } catch (error: any) {
    console.error("Assistant error:", error);
    c.status(500);
    return c.json({
      success: false,
      message: "Failed to get assistant response",
      error: error.message
    });
  }
});

// Analyze user's solution and provide optimization suggestions
assistantRouter.post("/analyze-solution", userAuthCheck, async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const userId = c.get('jwtPayload');
    const { code, language, problemId } = await c.req.json();
    
    if (!code || !language) {
      c.status(400);
      return c.json({ 
        success: false, 
        message: "Code and language are required" 
      });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      c.status(404);
      return c.json({ success: false, message: "User not found" });
    }
    
    // Analyze the solution and provide feedback
    const analysis = await analyzeSolution(
      code,
      language,
      problemId,
      c.env.OPENAI_API_KEY
    );
    
    return c.json({
      success: true,
      analysis
    });
  } catch (error: any) {
    console.error("Solution analysis error:", error);
    c.status(500);
    return c.json({
      success: false,
      message: "Failed to analyze solution",
      error: error.message
    });
  }
});

export default assistantRouter;