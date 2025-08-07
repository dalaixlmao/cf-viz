import axios from "axios";
import { PrismaClient } from "@prisma/client/edge";

interface AssistantResponse {
  message: string;
  relatedResources?: {
    title: string;
    url: string;
    description: string;
  }[];
}

interface SolutionAnalysis {
  feedback: string;
  optimizations: string[];
  timeComplexity: string;
  spaceComplexity: string;
  alternativeApproaches?: string[];
}

/**
 * Generate response from AI assistant based on user's message and context
 * 
 * @param prisma - Prisma client instance
 * @param handle - User's Codeforces handle
 * @param message - User's message to the assistant
 * @param context - Additional context (e.g., current problem, upcoming contest)
 * @param apiKey - OpenAI API key
 * @returns AI assistant response with related resources
 */
export async function getAssistantResponse(
  prisma: PrismaClient,
  handle: string,
  message: string,
  context: any,
  apiKey: string
): Promise<AssistantResponse> {
  try {
    // Step 1: Get user's performance data to personalize response
    let performanceData = null;
    try {
      // First, check if we have stored performance metrics in our database
      const metrics = await prisma.performanceMetric.findMany({
        where: {
          user: {
            handle
          }
        }
      });
      
      if (metrics.length > 0) {
        const strengths = metrics
          .filter(metric => metric.strengthScore >= 7)
          .map(metric => metric.tag)
          .slice(0, 3);
          
        const weaknesses = metrics
          .filter(metric => metric.strengthScore <= 4)
          .map(metric => metric.tag)
          .slice(0, 3);
          
        performanceData = { strengths, weaknesses };
      } else {
        // If no metrics in DB, get basic data from Codeforces API
        const userInfoUrl = `https://codeforces.com/api/user.info?handles=${handle}`;
        const userInfoResponse = await fetch(userInfoUrl);
        const userInfoData = await userInfoResponse.json();
        
        performanceData = {
          rating: userInfoData.result[0].rating || "unknown",
          rank: userInfoData.result[0].rank || "unknown"
        };
      }
    } catch (error) {
      console.error("Error fetching performance data:", error);
      // Continue without performance data
      performanceData = { note: "Performance data unavailable" };
    }
    
    // Step 2: Generate assistant response using OpenAI API
    const systemPrompt = constructSystemPrompt(handle, performanceData);
    
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: constructUserPrompt(message, context)
          }
        ],
        temperature: 0.7,
        max_tokens: 800,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        }
      }
    );
    
    // Parse the JSON response
    const jsonResponse = JSON.parse(response.data.choices[0].message.content);
    
    // Step 3: Return formatted assistant response
    return {
      message: jsonResponse.message || "I'm sorry, I couldn't generate a proper response.",
      relatedResources: jsonResponse.relatedResources || []
    };
  } catch (error) {
    console.error("Assistant service error:", error);
    
    // Return fallback response
    return {
      message: "I'm sorry, I encountered an error while processing your request. Please try again later."
    };
  }
}

/**
 * Analyze user's solution code and provide optimization suggestions
 * 
 * @param code - User's solution code
 * @param language - Programming language of the solution
 * @param problemId - Codeforces problem ID (optional)
 * @param apiKey - OpenAI API key
 * @returns Analysis of the solution with optimization suggestions
 */
export async function analyzeSolution(
  code: string,
  language: string,
  problemId: string | null,
  apiKey: string
): Promise<SolutionAnalysis> {
  try {
    // Get problem details if problemId is provided
    let problemDetails = null;
    if (problemId) {
      try {
        // Extract contestId and index from problemId (format: contestIdindex)
        const contestId = problemId.match(/\d+/)?.[0];
        const index = problemId.replace(contestId || "", "");
        
        if (contestId && index) {
          const problemUrl = `https://codeforces.com/api/contest.standings?contestId=${contestId}&from=1&count=1`;
          const problemResponse = await fetch(problemUrl);
          const problemData = await problemResponse.json();
          
          if (problemData.status === "OK") {
            const problem = problemData.result.problems.find(
              (p: any) => p.index === index
            );
            
            if (problem) {
              problemDetails = {
                name: problem.name,
                tags: problem.tags,
                rating: problem.rating
              };
            }
          }
        }
      } catch (error) {
        console.error("Error fetching problem details:", error);
        // Continue without problem details
      }
    }
    
    // Generate code analysis using OpenAI API
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert competitive programming code reviewer. Your goal is to analyze the provided ${language} code solution and provide constructive feedback on optimizations, efficiency improvements, and alternative approaches. Format your response as a JSON object with the following fields:
            - feedback: Overall assessment of the solution
            - optimizations: Array of specific optimization suggestions
            - timeComplexity: Time complexity analysis
            - spaceComplexity: Space complexity analysis
            - alternativeApproaches: Array of alternative solution approaches (if applicable)`
          },
          {
            role: "user",
            content: `Please analyze this ${language} code solution${problemDetails ? ` for problem "${problemDetails.name}" with tags ${problemDetails.tags.join(", ")}` : ""}.
            
\`\`\`${language}
${code}
\`\`\`

Provide specific optimizations, identify algorithmic inefficiencies, and suggest alternative approaches if applicable.`
          }
        ],
        temperature: 0.5,
        max_tokens: 800,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        }
      }
    );
    
    // Parse the JSON response
    const jsonResponse = JSON.parse(response.data.choices[0].message.content);
    
    // Return the analysis
    return {
      feedback: jsonResponse.feedback || "No feedback available.",
      optimizations: jsonResponse.optimizations || [],
      timeComplexity: jsonResponse.timeComplexity || "Unknown",
      spaceComplexity: jsonResponse.spaceComplexity || "Unknown",
      alternativeApproaches: jsonResponse.alternativeApproaches
    };
  } catch (error) {
    console.error("Solution analysis error:", error);
    
    // Return fallback analysis
    return {
      feedback: "I encountered an error while analyzing your solution. Please try again later.",
      optimizations: ["Could not analyze optimizations due to an error"],
      timeComplexity: "Unknown (analysis error)",
      spaceComplexity: "Unknown (analysis error)"
    };
  }
}

/**
 * Construct system prompt for the AI assistant
 * 
 * @param handle - User's Codeforces handle
 * @param performanceData - User's performance data
 * @returns System prompt for OpenAI API
 */
function constructSystemPrompt(handle: string, performanceData: any): string {
  return `You are CP Coach, an expert competitive programming assistant helping user ${handle} improve their skills on Codeforces. 

${performanceData ? `
USER PERFORMANCE DATA:
${JSON.stringify(performanceData, null, 2)}
` : ""}

GUIDELINES:
1. Provide clear, concise advice tailored to the user's level
2. Be specific about algorithms, data structures, and problem-solving techniques
3. Mention relevant Codeforces problem types when applicable
4. For coding questions, explain the approach before showing code
5. For contest preparation, focus on practical strategies
6. Always include relevant resources when appropriate

Respond in JSON format with these fields:
- message: Your main response to the user
- relatedResources: Array of relevant resources (optional), each with title, url, and description fields`;
}

/**
 * Construct user prompt with message and context
 * 
 * @param message - User's message
 * @param context - Additional context
 * @returns User prompt for OpenAI API
 */
function constructUserPrompt(message: string, context: any): string {
  let prompt = message;
  
  // Add context if available
  if (context) {
    if (context.currentProblem) {
      prompt += `\n\nCURRENT PROBLEM: ${JSON.stringify(context.currentProblem, null, 2)}`;
    }
    
    if (context.upcomingContest) {
      prompt += `\n\nUPCOMING CONTEST: ${JSON.stringify(context.upcomingContest, null, 2)}`;
    }
  }
  
  return prompt;
}