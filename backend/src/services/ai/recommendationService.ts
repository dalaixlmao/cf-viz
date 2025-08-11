import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import { OpenAI } from 'openai';
import { CodeforcesApiService } from '../codeforces/codeforcesApiService';

/**
 * Service for generating personalized recommendations
 */
export class RecommendationService {
  private prisma: PrismaClient;
  private openai: OpenAI;
  private codeforcesService: CodeforcesApiService;
  
  constructor(databaseUrl: string, openaiApiKey: string, cache: KVNamespace) {
    this.prisma = new PrismaClient({
      datasourceUrl: databaseUrl
    }).$extends(withAccelerate());
    
    this.openai = new OpenAI({
      apiKey: openaiApiKey
    });
    
    this.codeforcesService = new CodeforcesApiService(cache);
  }
  
  /**
   * Generate personalized problem recommendations for a user
   * 
   * @param userId User ID in our database
   * @param handle Codeforces handle
   * @param limit Maximum number of recommendations to generate
   * @returns Array of recommended problems with explanations
   */
  async generateRecommendations(userId: number, handle: string, limit: number = 5) {
    try {
      // Step 1: Get user's submission history from Codeforces
      const submissions = await this.codeforcesService.getUserSubmissions(handle, 500);
      
      // Step 2: Analyze performance by tag
      const tagPerformance = this.analyzeTagPerformance(submissions);
      
      // Step 3: Identify weak and strong areas
      const { weakTags, strongTags } = this.identifyStrengthsAndWeaknesses(tagPerformance);
      
      // Step 4: Get problem set from Codeforces
      const problemSet = await this.codeforcesService.getProblemSet();
      
      // Step 5: Find solved problems to exclude from recommendations
      const solvedProblemIds = new Set(
        submissions
          .filter((sub: any) => sub.verdict === "OK")
          .map((sub: any) => `${sub.problem.contestId}${sub.problem.index}`)
      );
      
      // Step 6: Filter potential problems for recommendation
      const weakTagNames = weakTags.map(tag => tag.tag);
      const potentialProblems = problemSet.problems.filter((problem: any) => {
        // Skip if already solved
        if (solvedProblemIds.has(`${problem.contestId}${problem.index}`)) {
          return false;
        }
        
        // Include if it has at least one weak tag
        return problem.tags.some((tag: string) => weakTagNames.includes(tag));
      });
      
      // Step 7: Score and rank problems
      const scoredProblems = this.scoreProblemsByRelevance(
        potentialProblems,
        tagPerformance,
        weakTags,
        strongTags
      );
      
      // Step 8: Select top recommendations
      const topRecommendations = scoredProblems
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, limit);
      
      // Step 9: Enrich recommendations with AI explanations
      const enrichedRecommendations = await this.enrichRecommendationsWithAI(
        topRecommendations,
        weakTags,
        handle
      );
      
      // Step 10: Store recommendations in database
      await this.storeRecommendations(userId, enrichedRecommendations);
      
      return enrichedRecommendations;
    } catch (error) {
      console.error("Error generating recommendations:", error);
      throw error;
    }
  }
  
  /**
   * Generate contest predictions for a user
   * 
   * @param userId User ID in our database
   * @param handle Codeforces handle
   * @returns Array of contest predictions
   */
  async generateContestPredictions(userId: number, handle: string) {
    try {
      // Step 1: Get user's rating history
      const userInfo = await this.codeforcesService.getUserInfo(handle);
      const userRating = userInfo.rating || 0;
      const userMaxRating = userInfo.maxRating || 0;
      
      // Step 2: Get contest history
      const contestHistory = await this.codeforcesService.getUserContests(handle);
      
      // Step 3: Get upcoming contests
      const upcomingContests = await this.codeforcesService.getUpcomingContests();
      
      // Step 4: Get user's performance by tag
      const submissions = await this.codeforcesService.getUserSubmissions(handle, 500);
      const tagPerformance = this.analyzeTagPerformance(submissions);
      const { weakTags } = this.identifyStrengthsAndWeaknesses(tagPerformance);
      
      // Step 5: Generate predictions
      const predictions = [];
      
      for (const contest of upcomingContests.slice(0, 3)) {
        const prediction = this.predictContestPerformance(
          contest,
          contestHistory,
          userRating,
          userMaxRating,
          tagPerformance
        );
        
        // Enrich with AI-generated advice
        const enrichedPrediction = await this.generateContestAdvice(
          prediction,
          weakTags,
          handle
        );
        
        // Store prediction in database
        await this.storePrediction(userId, enrichedPrediction);
        
        predictions.push(enrichedPrediction);
      }
      
      return predictions;
    } catch (error) {
      console.error("Error generating contest predictions:", error);
      throw error;
    }
  }
  
  /**
   * Analyze user's performance by problem tag
   * 
   * @param userId User ID in our database
   * @param handle Codeforces handle
   * @returns Performance analysis data
   */
  async analyzePerformance(userId: number, handle: string) {
    try {
      // Get user's submission history
      const submissions = await this.codeforcesService.getUserSubmissions(handle, 500);
      
      // Analyze tag performance
      const tagPerformance = this.analyzeTagPerformance(submissions);
      
      // Identify strengths and weaknesses
      const { weakTags, strongTags } = this.identifyStrengthsAndWeaknesses(tagPerformance);
      
      // Calculate recent progress
      const recentProgress = this.calculateRecentProgress(submissions);
      
      // Store metrics in database
      await this.storePerformanceMetrics(userId, tagPerformance);
      
      return {
        strengths: strongTags,
        weaknesses: weakTags,
        recentProgress
      };
    } catch (error) {
      console.error("Error analyzing performance:", error);
      throw error;
    }
  }
  
  /**
   * Analyze tag performance from submissions
   */
  private analyzeTagPerformance(submissions: any[]) {
    const tagStats: Record<string, { 
      solved: number, 
      attempted: number, 
      totalRating: number,
      averageRating: number,
      recentSuccess: number 
    }> = {};
    
    // Track problems we've already counted
    const processedProblems = new Set();
    
    // Process submissions (most recent first)
    for (const submission of submissions) {
      if (!submission.problem || !submission.problem.tags) continue;
      
      const problemKey = `${submission.problem.contestId}-${submission.problem.index}`;
      const isAccepted = submission.verdict === "OK";
      const problemRating = submission.problem.rating || 0;
      
      // Process each tag in the problem
      for (const tag of submission.problem.tags) {
        if (!tagStats[tag]) {
          tagStats[tag] = { 
            solved: 0, 
            attempted: 0, 
            totalRating: 0,
            averageRating: 0,
            recentSuccess: 0
          };
        }
        
        // If we haven't processed this problem for this tag yet
        const tagProblemKey = `${tag}-${problemKey}`;
        if (!processedProblems.has(tagProblemKey)) {
          tagStats[tag].attempted++;
          
          if (isAccepted) {
            tagStats[tag].solved++;
            tagStats[tag].totalRating += problemRating;
            
            // Consider recent submissions (last 10) for recency bias
            if (tagStats[tag].attempted <= 10) {
              tagStats[tag].recentSuccess++;
            }
          }
          
          processedProblems.add(tagProblemKey);
        }
      }
    }
    
    // Calculate average ratings
    for (const tag in tagStats) {
      if (tagStats[tag].solved > 0) {
        tagStats[tag].averageRating = Math.round(
          tagStats[tag].totalRating / tagStats[tag].solved
        );
      }
    }
    
    return tagStats;
  }
  
  /**
   * Identify strengths and weaknesses from tag performance
   */
  private identifyStrengthsAndWeaknesses(tagPerformance: Record<string, any>) {
    const tags = Object.keys(tagPerformance);
    
    // Calculate success rate for each tag
    const tagScores = tags.map(tag => {
      const stats = tagPerformance[tag];
      const successRate = stats.solved / stats.attempted;
      const recentSuccessWeight = stats.recentSuccess / Math.min(10, stats.attempted);
      const attemptWeight = Math.min(1, stats.attempted / 10); // More attempts = more reliable data
      
      // Combined score considering success rate, recency, and number of attempts
      const score = (successRate * 0.6) + (recentSuccessWeight * 0.3) + (attemptWeight * 0.1);
      
      return {
        tag,
        score,
        successRate,
        attempted: stats.attempted,
        solved: stats.solved,
        averageRating: stats.averageRating
      };
    }).filter(item => item.attempted >= 2); // Filter out tags with too few attempts
    
    // Sort by score
    tagScores.sort((a, b) => b.score - a.score);
    
    // Top 30% are strengths, bottom 30% are weaknesses
    const strengthCount = Math.max(1, Math.floor(tagScores.length * 0.3));
    const weaknessCount = Math.max(1, Math.floor(tagScores.length * 0.3));
    
    const strongTags = tagScores.slice(0, strengthCount);
    const weakTags = tagScores.slice(-weaknessCount).reverse();
    
    return { weakTags, strongTags };
  }
  
  /**
   * Calculate recent progress metrics
   */
  private calculateRecentProgress(submissions: any[]) {
    // Calculate improvement rate based on problem difficulty over time
    const recentSubmissions = submissions.slice(0, 50);
    const olderSubmissions = submissions.slice(50, 100);
    
    // Group by tag
    const recentTagRatings: Record<string, number[]> = {};
    const olderTagRatings: Record<string, number[]> = {};
    
    // Process recent submissions
    for (const submission of recentSubmissions) {
      if (!submission.problem || !submission.problem.tags || submission.verdict !== "OK") continue;
      
      const rating = submission.problem.rating || 0;
      if (rating === 0) continue;
      
      for (const tag of submission.problem.tags) {
        if (!recentTagRatings[tag]) recentTagRatings[tag] = [];
        recentTagRatings[tag].push(rating);
      }
    }
    
    // Process older submissions
    for (const submission of olderSubmissions) {
      if (!submission.problem || !submission.problem.tags || submission.verdict !== "OK") continue;
      
      const rating = submission.problem.rating || 0;
      if (rating === 0) continue;
      
      for (const tag of submission.problem.tags) {
        if (!olderTagRatings[tag]) olderTagRatings[tag] = [];
        olderTagRatings[tag].push(rating);
      }
    }
    
    // Calculate average rating by tag
    const tagProgress: Record<string, { 
      tag: string, 
      recentAvg: number, 
      olderAvg: number,
      improvement: number 
    }> = {};
    
    for (const tag in recentTagRatings) {
      const recentAvg = recentTagRatings[tag].reduce((sum, val) => sum + val, 0) / recentTagRatings[tag].length;
      const olderAvg = olderTagRatings[tag]?.reduce((sum, val) => sum + val, 0) / olderTagRatings[tag]?.length || 0;
      
      if (olderAvg > 0) {
        const improvement = recentAvg - olderAvg;
        tagProgress[tag] = { tag, recentAvg, olderAvg, improvement };
      }
    }
    
    // Sort by improvement
    const sortedProgress = Object.values(tagProgress).sort((a, b) => b.improvement - a.improvement);
    
    // Calculate overall improvement rate
    const recentSuccessRate = recentSubmissions.filter(s => s.verdict === "OK").length / recentSubmissions.length;
    const olderSuccessRate = olderSubmissions.filter(s => s.verdict === "OK").length / olderSubmissions.length;
    const successRateImprovement = recentSuccessRate - olderSuccessRate;
    
    return {
      improvementRate: successRateImprovement,
      topImprovedTags: sortedProgress.slice(0, 3).map(t => t.tag)
    };
  }
  
  /**
   * Score problems for relevance to user's needs
   */
  private scoreProblemsByRelevance(
    problems: any[],
    tagPerformance: Record<string, any>,
    weakTags: any[],
    strongTags: any[]
  ) {
    const weakTagNames = weakTags.map(tag => tag.tag);
    const strongTagNames = strongTags.map(tag => tag.tag);
    
    return problems.map(problem => {
      let score = 0;
      
      // Base score starts at 50
      score += 50;
      
      // Calculate tag match score
      for (const tag of problem.tags) {
        // Prioritize weak tags
        if (weakTagNames.includes(tag)) {
          score += 15;
          
          // Find the weak tag details
          const weakTag = weakTags.find(t => t.tag === tag);
          if (weakTag) {
            // Lower success rate = higher recommendation score
            score += 10 * (1 - weakTag.successRate);
          }
        }
        
        // Slightly deprioritize strong tags
        if (strongTagNames.includes(tag)) {
          score -= 5;
        }
      }
      
      // Adjust based on problem rating if available
      if (problem.rating) {
        // Calculate average solved problem rating across all tags
        let avgSolvedRating = 0;
        let totalSolved = 0;
        
        for (const tag in tagPerformance) {
          if (tagPerformance[tag].solved > 0) {
            avgSolvedRating += tagPerformance[tag].totalRating;
            totalSolved += tagPerformance[tag].solved;
          }
        }
        
        if (totalSolved > 0) {
          avgSolvedRating /= totalSolved;
          
          // Prioritize problems slightly above user's average solved rating
          const ratingDiff = problem.rating - avgSolvedRating;
          if (ratingDiff > 0 && ratingDiff <= 300) {
            score += 20;
          } else if (ratingDiff > 300 && ratingDiff <= 500) {
            score += 10;
          } else if (ratingDiff < 0) {
            score -= 10; // Penalize problems below user's level
          } else if (ratingDiff > 500) {
            score -= 20; // Heavily penalize problems far above user's level
          }
        }
      }
      
      return {
        ...problem,
        score
      };
    });
  }
  
  /**
   * Enrich recommendations with AI explanations
   */
  private async enrichRecommendationsWithAI(
    recommendations: any[],
    weakTags: any[],
    handle: string
  ) {
    try {
      // Format recommendations with AI-generated explanations
      const enrichedRecommendations = [];
      
      for (const problem of recommendations) {
        // Format matching weak tags
        const matchingWeakTags = problem.tags.filter(
          (tag: string) => weakTags.some(weakTag => weakTag.tag === tag)
        );
        
        // Generate explanation with OpenAI
        const explanation = await this.generateExplanation(
          problem,
          matchingWeakTags,
          handle
        );
        
        enrichedRecommendations.push({
          problemId: `${problem.contestId}${problem.index}`,
          contestId: problem.contestId,
          index: problem.index,
          name: problem.name,
          tags: problem.tags,
          rating: problem.rating,
          matchingWeakTags,
          difficulty: this.getDifficultyLevel(problem.rating),
          url: `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`,
          explanation
        });
      }
      
      return enrichedRecommendations;
    } catch (error) {
      console.error("Error enriching recommendations with AI:", error);
      // Return basic recommendations without AI explanations
      return recommendations.map(problem => ({
        problemId: `${problem.contestId}${problem.index}`,
        contestId: problem.contestId,
        index: problem.index,
        name: problem.name,
        tags: problem.tags,
        rating: problem.rating,
        difficulty: this.getDifficultyLevel(problem.rating),
        url: `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`,
        explanation: `This problem will help you improve in ${problem.tags.join(", ")}.`
      }));
    }
  }
  
  /**
   * Generate explanation for a problem recommendation
   */
  private async generateExplanation(
    problem: any,
    matchingWeakTags: string[],
    handle: string
  ) {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert competitive programming coach helping user ${handle} improve their skills. Provide a brief, personalized recommendation explaining why this problem would benefit them.`
          },
          {
            role: "user",
            content: `Generate a concise (2-3 sentences) explanation for why I should solve this problem to improve my competitive programming skills.
            
Problem: ${problem.name} (Rating: ${problem.rating || "Not rated"})
Tags: ${problem.tags.join(", ")}
Weak areas to improve: ${matchingWeakTags.join(", ")}

Focus on how solving this specific problem will help me improve in my weak areas.`
          }
        ],
        temperature: 0.7,
        max_tokens: 150
      });
      
      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error("Error generating explanation:", error);
      return `This problem will help you improve in ${matchingWeakTags.join(", ")}.`;
    }
  }
  
  /**
   * Predict user's performance in an upcoming contest
   */
  private predictContestPerformance(
    contest: any,
    contestHistory: any[],
    currentRating: number,
    maxRating: number,
    tagPerformance: any
  ) {
    // Default values
    let predictedRank = null;
    let predictedRatingChange = null;
    let confidence = 0.5; // Default confidence
    
    // If we have contest history, use it to predict
    if (contestHistory.length > 0) {
      // Calculate average rank percentile and rating change from past contests
      let totalRankPercentile = 0;
      let totalRatingChange = 0;
      let validContests = 0;
      
      // Consider only recent contests (last 10)
      const recentContests = contestHistory.slice(-10);
      
      for (const pastContest of recentContests) {
        if (pastContest.rank && pastContest.ratingUpdateTimeSeconds) {
          totalRankPercentile += pastContest.rank / pastContest.newRating; // Approximation
          totalRatingChange += pastContest.newRating - pastContest.oldRating;
          validContests++;
        }
      }
      
      if (validContests > 0) {
        // Make prediction based on past performance
        const avgRankPercentile = totalRankPercentile / validContests;
        const avgRatingChange = totalRatingChange / validContests;
        
        // Estimate contest size (using average Codeforces contest size)
        const estimatedContestSize = 10000;
        
        // Predict rank and rating change
        predictedRank = Math.floor(avgRankPercentile * estimatedContestSize);
        predictedRatingChange = Math.round(avgRatingChange);
        
        // Adjust confidence based on number of past contests
        confidence = Math.min(0.85, 0.5 + (validContests * 0.05));
      }
    }
    
    // Return prediction data
    return {
      contestId: contest.id,
      contestName: contest.name,
      startTimeSeconds: contest.startTimeSeconds,
      predictedRank,
      predictedRatingChange,
      confidence,
      recommendedProblems: this.determineRecommendedProblemTypes(tagPerformance)
    };
  }
  
  /**
   * Determine problem types to recommend for contest preparation
   */
  private determineRecommendedProblemTypes(tagPerformance: any) {
    // Identify the weakest tags that need practice
    const sortedTags = Object.entries(tagPerformance)
      .filter(([_, stats]: [string, any]) => stats.attempted >= 3) // Consider only tags with enough attempts
      .map(([tag, stats]: [string, any]) => ({
        tag,
        successRate: stats.solved / stats.attempted
      }))
      .sort((a, b) => a.successRate - b.successRate); // Sort by success rate ascending
    
    // Return the 3 weakest tags
    return sortedTags.slice(0, 3).map(item => item.tag);
  }
  
  /**
   * Generate contest preparation advice using AI
   */
  private async generateContestAdvice(
    prediction: any,
    weakTags: any[],
    handle: string
  ) {
    try {
      // Format the contest start time
      const contestDate = new Date(prediction.startTimeSeconds * 1000);
      const formattedDate = contestDate.toLocaleDateString();
      const formattedTime = contestDate.toLocaleTimeString();
      
      // Prepare weak tags for the prompt
      const weakTagNames = weakTags.map(tag => tag.tag).slice(0, 3);
      
      // Generate advice with OpenAI
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert competitive programming coach helping user ${handle} prepare for an upcoming contest.`
          },
          {
            role: "user",
            content: `Generate brief, practical advice (3-4 sentences) for how I should prepare for this upcoming contest:
            
Contest: ${prediction.contestName}
Date: ${formattedDate} at ${formattedTime}
My weak areas: ${weakTagNames.join(", ")}

Focus on specific practice strategies for the next few days before the contest.`
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      });
      
      const advice = response.choices[0].message.content.trim();
      
      // Return enriched prediction
      return {
        ...prediction,
        contestDate: formattedDate,
        contestTime: formattedTime,
        preparationAdvice: advice,
        url: `https://codeforces.com/contests/${prediction.contestId}`
      };
    } catch (error) {
      console.error("Error generating contest advice:", error);
      
      // Return prediction with default advice
      const contestDate = new Date(prediction.startTimeSeconds * 1000);
      return {
        ...prediction,
        contestDate: contestDate.toLocaleDateString(),
        contestTime: contestDate.toLocaleTimeString(),
        preparationAdvice: `Focus on practicing problems related to ${prediction.recommendedProblems.join(", ")} before the contest.`,
        url: `https://codeforces.com/contests/${prediction.contestId}`
      };
    }
  }
  
  /**
   * Store recommendations in database
   */
  private async storeRecommendations(userId: number, recommendations: any[]) {
    try {
      for (const rec of recommendations) {
        // Check if problem exists in database
        let problem = await this.prisma.problem.findFirst({
          where: {
            contestId: rec.contestId,
            index: rec.index
          }
        });
        
        // If problem doesn't exist, create it
        if (!problem) {
          problem = await this.prisma.problem.create({
            data: {
              problemId: rec.problemId,
              contestId: rec.contestId,
              index: rec.index,
              name: rec.name,
              tags: rec.tags,
              rating: rec.rating || null
            }
          });
        }
        
        // Create or update recommendation
        await this.prisma.recommendation.upsert({
          where: {
            userId_problemId: {
              userId,
              problemId: problem.id
            }
          },
          update: {
            reasonCode: "WEAK_TAG",
            reasonText: rec.explanation,
            difficulty: rec.difficulty
          },
          create: {
            userId,
            problemId: problem.id,
            reasonCode: "WEAK_TAG",
            reasonText: rec.explanation,
            difficulty: rec.difficulty
          }
        });
      }
    } catch (error) {
      console.error("Error storing recommendations:", error);
      // Continue even if storage fails
    }
  }
  
  /**
   * Store contest prediction in database
   */
  private async storePrediction(userId: number, prediction: any) {
    try {
      await this.prisma.contestPrediction.upsert({
        where: {
          userId_contestId: {
            userId,
            contestId: prediction.contestId
          }
        },
        update: {
          contestName: prediction.contestName,
          predictedRank: prediction.predictedRank,
          predictedRatingChange: prediction.predictedRatingChange,
          confidence: prediction.confidence,
          recommendedProblems: prediction.recommendedProblems
        },
        create: {
          userId,
          contestId: prediction.contestId,
          contestName: prediction.contestName,
          predictedRank: prediction.predictedRank,
          predictedRatingChange: prediction.predictedRatingChange,
          confidence: prediction.confidence,
          recommendedProblems: prediction.recommendedProblems
        }
      });
    } catch (error) {
      console.error("Error storing prediction:", error);
      // Continue even if storage fails
    }
  }
  
  /**
   * Store performance metrics in database
   */
  private async storePerformanceMetrics(userId: number, tagPerformance: Record<string, any>) {
    try {
      for (const tag in tagPerformance) {
        const stats = tagPerformance[tag];
        
        // Skip tags with too few attempts
        if (stats.attempted < 2) continue;
        
        // Calculate strength score (0-10)
        const successRate = stats.solved / stats.attempted;
        const strengthScore = Math.round(successRate * 10);
        
        // Store or update performance metric
        await this.prisma.performanceMetric.upsert({
          where: {
            userId_tag: {
              userId,
              tag
            }
          },
          update: {
            problemsSolved: stats.solved,
            problemsAttempted: stats.attempted,
            averageRating: stats.averageRating || null,
            strengthScore,
            lastUpdated: new Date()
          },
          create: {
            userId,
            tag,
            problemsSolved: stats.solved,
            problemsAttempted: stats.attempted,
            averageRating: stats.averageRating || null,
            strengthScore,
            lastUpdated: new Date()
          }
        });
      }
    } catch (error) {
      console.error("Error storing performance metrics:", error);
      // Continue even if storage fails
    }
  }
  
  /**
   * Determine difficulty level based on problem rating
   */
  private getDifficultyLevel(rating: number | null): string {
    if (!rating) return "MEDIUM";
    
    if (rating < 1200) return "EASY";
    if (rating < 1900) return "MEDIUM";
    return "HARD";
  }
}