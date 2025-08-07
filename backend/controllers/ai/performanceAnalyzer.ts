import { PrismaClient } from "@prisma/client/edge";

interface TagMetric {
  tag: string;
  problemsSolved: number;
  problemsAttempted: number;
  successRate: number;
  averageRating: number;
  strengthScore: number;
  recentProgress: string;
}

interface ProblemSolveSpeed {
  category: string;
  averageTimeSeconds: number;
  percentile: number;
}

interface PerformanceAnalysis {
  tagMetrics: TagMetric[];
  overallStrengths: string[];
  overallWeaknesses: string[];
  ratingProgression: {
    timeline: {
      date: string;
      rating: number;
    }[];
    trend: string;
  };
  solveSpeed?: ProblemSolveSpeed[];
  recommendedFocus: string[];
}

/**
 * Analyze user's performance across different problem categories
 * 
 * @param prisma - Prisma client instance
 * @param handle - User's Codeforces handle
 * @param userId - Internal user ID
 * @returns Detailed performance analysis
 */
export async function analyzePerformance(
  prisma: PrismaClient,
  handle: string,
  userId: number
): Promise<PerformanceAnalysis> {
  try {
    // Step 1: Get user's submission history from Codeforces
    const submissionsUrl = `https://codeforces.com/api/user.status?handle=${handle}`;
    const submissionsResponse = await fetch(submissionsUrl);
    const submissionsData = await submissionsResponse.json();
    
    if (submissionsData.status !== "OK") {
      throw new Error("Failed to fetch user submissions from Codeforces API");
    }
    
    // Step 2: Get user's rating history
    const ratingHistoryUrl = `https://codeforces.com/api/user.rating?handle=${handle}`;
    const ratingHistoryResponse = await fetch(ratingHistoryUrl);
    const ratingHistoryData = await ratingHistoryResponse.json();
    
    if (ratingHistoryData.status !== "OK") {
      throw new Error("Failed to fetch user rating history from Codeforces API");
    }
    
    // Step 3: Analyze submissions data
    const tagMetrics = await analyzeSubmissionsByTag(submissionsData.result);
    
    // Step 4: Store performance metrics in database
    await storePerformanceMetrics(prisma, userId, tagMetrics);
    
    // Step 5: Identify overall strengths and weaknesses
    const { strengths, weaknesses } = identifyOverallStrengthsWeaknesses(tagMetrics);
    
    // Step 6: Analyze rating progression
    const ratingProgression = analyzeRatingProgression(ratingHistoryData.result);
    
    // Step 7: Recommend focus areas
    const recommendedFocus = determineRecommendedFocus(tagMetrics, ratingProgression);
    
    // Return complete analysis
    return {
      tagMetrics,
      overallStrengths: strengths,
      overallWeaknesses: weaknesses,
      ratingProgression,
      recommendedFocus
    };
  } catch (error) {
    console.error("Error analyzing performance:", error);
    throw error;
  }
}

/**
 * Analyze submission history by problem tag
 * 
 * @param submissions - Array of user submissions from Codeforces API
 * @returns Metrics for each problem tag
 */
async function analyzeSubmissionsByTag(submissions: any[]): Promise<TagMetric[]> {
  // Process submissions to extract tag statistics
  const tagStats: Record<string, {
    solved: number;
    attempted: number;
    ratings: number[];
    recentSolved: number;
    recentAttempted: number;
  }> = {};
  
  // Keep track of unique problems
  const processedProblems = new Set<string>();
  
  // Sort submissions by submission time (most recent first)
  const sortedSubmissions = [...submissions].sort(
    (a, b) => b.creationTimeSeconds - a.creationTimeSeconds
  );
  
  // Track the last 30 days of submissions for recent progress
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
  
  for (const submission of sortedSubmissions) {
    if (!submission.problem || !submission.problem.tags) continue;
    
    const problemKey = `${submission.problem.contestId}-${submission.problem.index}`;
    const isAccepted = submission.verdict === "OK";
    const problemRating = submission.problem.rating || 0;
    const isRecent = submission.creationTimeSeconds > thirtyDaysAgo;
    
    // Process each tag in the problem
    for (const tag of submission.problem.tags) {
      if (!tagStats[tag]) {
        tagStats[tag] = {
          solved: 0,
          attempted: 0,
          ratings: [],
          recentSolved: 0,
          recentAttempted: 0
        };
      }
      
      // If we haven't processed this problem for this tag yet
      const tagProblemKey = `${tag}-${problemKey}`;
      if (!processedProblems.has(tagProblemKey)) {
        tagStats[tag].attempted++;
        if (isRecent) tagStats[tag].recentAttempted++;
        
        if (isAccepted) {
          tagStats[tag].solved++;
          if (problemRating > 0) {
            tagStats[tag].ratings.push(problemRating);
          }
          
          if (isRecent) {
            tagStats[tag].recentSolved++;
          }
        }
        
        processedProblems.add(tagProblemKey);
      }
    }
  }
  
  // Convert tag statistics to metrics
  const tagMetrics: TagMetric[] = [];
  
  for (const tag in tagStats) {
    const stats = tagStats[tag];
    
    // Calculate success rate
    const successRate = stats.attempted > 0 
      ? stats.solved / stats.attempted 
      : 0;
    
    // Calculate average rating of solved problems
    const averageRating = stats.ratings.length > 0 
      ? Math.round(stats.ratings.reduce((sum, rating) => sum + rating, 0) / stats.ratings.length) 
      : 0;
    
    // Calculate strength score (0-10)
    let strengthScore = calculateStrengthScore(stats, successRate, averageRating);
    
    // Determine recent progress
    let recentProgress = "STABLE";
    if (stats.recentAttempted > 0) {
      const recentSuccessRate = stats.recentSolved / stats.recentAttempted;
      if (recentSuccessRate > successRate + 0.1) {
        recentProgress = "IMPROVING";
      } else if (recentSuccessRate < successRate - 0.1) {
        recentProgress = "DECLINING";
      }
    }
    
    tagMetrics.push({
      tag,
      problemsSolved: stats.solved,
      problemsAttempted: stats.attempted,
      successRate,
      averageRating,
      strengthScore,
      recentProgress
    });
  }
  
  // Sort by strength score (descending)
  return tagMetrics.sort((a, b) => b.strengthScore - a.strengthScore);
}

/**
 * Calculate strength score for a tag
 * 
 * @param stats - Tag statistics
 * @param successRate - Success rate for the tag
 * @param averageRating - Average problem rating for the tag
 * @returns Strength score (0-10)
 */
function calculateStrengthScore(
  stats: {
    solved: number;
    attempted: number;
    ratings: number[];
    recentSolved: number;
    recentAttempted: number;
  },
  successRate: number,
  averageRating: number
): number {
  // Base score from success rate (0-7 points)
  let score = successRate * 7;
  
  // Bonus for number of problems solved (0-1.5 points)
  // More problems solved = more reliable assessment
  score += Math.min(1.5, stats.solved / 20);
  
  // Bonus for solving high-rated problems (0-1.5 points)
  if (averageRating > 0) {
    score += Math.min(1.5, (averageRating - 800) / 1000);
  }
  
  // Cap the score at 10
  return Math.min(10, Math.max(0, Math.round(score * 10) / 10));
}

/**
 * Store performance metrics in database
 * 
 * @param prisma - Prisma client instance
 * @param userId - User ID
 * @param tagMetrics - Tag metrics
 */
async function storePerformanceMetrics(
  prisma: PrismaClient,
  userId: number,
  tagMetrics: TagMetric[]
): Promise<void> {
  try {
    // Create or update performance metrics for each tag
    for (const metric of tagMetrics) {
      await prisma.performanceMetric.upsert({
        where: {
          userId_tag: {
            userId: userId,
            tag: metric.tag
          }
        },
        update: {
          problemsSolved: metric.problemsSolved,
          problemsAttempted: metric.problemsAttempted,
          averageRating: metric.averageRating || null,
          strengthScore: metric.strengthScore,
          lastUpdated: new Date()
        },
        create: {
          userId: userId,
          tag: metric.tag,
          problemsSolved: metric.problemsSolved,
          problemsAttempted: metric.problemsAttempted,
          averageRating: metric.averageRating || null,
          strengthScore: metric.strengthScore
        }
      });
    }
  } catch (error) {
    console.error("Error storing performance metrics:", error);
    // Continue even if storage fails
  }
}

/**
 * Identify overall strengths and weaknesses
 * 
 * @param tagMetrics - Tag metrics
 * @returns Object containing strengths and weaknesses
 */
function identifyOverallStrengthsWeaknesses(tagMetrics: TagMetric[]): {
  strengths: string[];
  weaknesses: string[];
} {
  // Filter out tags with too few problems attempted
  const significantTags = tagMetrics.filter(metric => metric.problemsAttempted >= 3);
  
  // Sort by strength score
  const sortedByStrength = [...significantTags].sort(
    (a, b) => b.strengthScore - a.strengthScore
  );
  
  // Top 3 are strengths, bottom 3 are weaknesses
  const strengths = sortedByStrength.slice(0, 3).map(metric => metric.tag);
  
  const weaknesses = sortedByStrength
    .slice(-Math.min(3, sortedByStrength.length))
    .map(metric => metric.tag)
    .reverse();
  
  return { strengths, weaknesses };
}

/**
 * Analyze rating progression
 * 
 * @param ratingHistory - Rating history from Codeforces API
 * @returns Rating progression analysis
 */
function analyzeRatingProgression(ratingHistory: any[]): {
  timeline: { date: string; rating: number }[];
  trend: string;
} {
  // Sort by rating update time
  const sortedHistory = [...ratingHistory].sort(
    (a, b) => a.ratingUpdateTimeSeconds - b.ratingUpdateTimeSeconds
  );
  
  // Create timeline
  const timeline = sortedHistory.map(entry => ({
    date: new Date(entry.ratingUpdateTimeSeconds * 1000).toISOString().split('T')[0],
    rating: entry.newRating
  }));
  
  // Determine trend
  let trend = "STABLE";
  if (sortedHistory.length >= 3) {
    const recentContests = sortedHistory.slice(-3);
    const ratingChanges = recentContests.map(
      entry => entry.newRating - entry.oldRating
    );
    
    const averageChange = ratingChanges.reduce(
      (sum, change) => sum + change, 0
    ) / ratingChanges.length;
    
    if (averageChange >= 50) {
      trend = "INCREASING";
    } else if (averageChange <= -50) {
      trend = "DECREASING";
    }
  }
  
  return { timeline, trend };
}

/**
 * Determine recommended focus areas
 * 
 * @param tagMetrics - Tag metrics
 * @param ratingProgression - Rating progression analysis
 * @returns Array of recommended focus areas
 */
function determineRecommendedFocus(
  tagMetrics: TagMetric[],
  ratingProgression: {
    timeline: { date: string; rating: number }[];
    trend: string;
  }
): string[] {
  const recommendations: string[] = [];
  
  // Filter significant tags (at least 3 problems attempted)
  const significantTags = tagMetrics.filter(metric => metric.problemsAttempted >= 3);
  
  // Find weak tags with reasonable number of attempts
  const weakTags = significantTags
    .filter(metric => metric.strengthScore < 5)
    .sort((a, b) => a.strengthScore - b.strengthScore)
    .slice(0, 2);
  
  for (const tag of weakTags) {
    recommendations.push(tag.tag);
  }
  
  // If rating is decreasing, recommend focusing on fundamentals
  if (ratingProgression.trend === "DECREASING") {
    recommendations.push("implementation");
  }
  
  // If not enough recommendations, add some common important tags
  const commonTags = ["algorithms", "data structures", "dynamic programming"];
  for (const tag of commonTags) {
    if (recommendations.length < 3 && !recommendations.includes(tag)) {
      recommendations.push(tag);
    }
  }
  
  return recommendations.slice(0, 3);
}