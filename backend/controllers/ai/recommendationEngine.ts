import { PrismaClient } from "@prisma/client/edge";
import axios from "axios";

/**
 * Generate personalized problem recommendations for a user based on their performance history
 * 
 * @param prisma - Prisma client instance
 * @param handle - User's Codeforces handle
 * @param userId - Internal user ID
 * @param limit - Maximum number of recommendations to generate
 * @param apiKey - OpenAI API key
 * @returns Array of recommended problems with explanations
 */
export async function generateRecommendations(
  prisma: PrismaClient,
  handle: string,
  userId: number,
  limit: number = 5,
  apiKey: string
) {
  try {
    // Step 1: Get user's submission history from Codeforces
    const submissionsUrl = `https://codeforces.com/api/user.status?handle=${handle}`;
    const submissionsResponse = await fetch(submissionsUrl);
    const submissionsData = await submissionsResponse.json();
    
    if (submissionsData.status !== "OK") {
      throw new Error("Failed to fetch user submissions from Codeforces API");
    }
    
    // Step 2: Extract performance metrics by problem tag
    const tagPerformance = analyzeTagPerformance(submissionsData.result);
    
    // Step 3: Identify weak and strong areas
    const { weakTags, strongTags } = identifyStrengthsAndWeaknesses(tagPerformance);
    
    // Step 4: Fetch potential problems to recommend
    const potentialProblems = await fetchPotentialProblems(weakTags);
    
    // Step 5: Score and rank problems for recommendation
    const scoredProblems = scoreProblemsByRelevance(
      potentialProblems,
      tagPerformance,
      weakTags,
      strongTags
    );
    
    // Step 6: Select top recommendations
    const topRecommendations = scoredProblems
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
      
    // Step 7: Enrich recommendations with AI-generated explanations
    const enrichedRecommendations = await enrichRecommendationsWithAI(
      topRecommendations, 
      weakTags,
      handle,
      apiKey
    );
    
    // Step 8: Store recommendations in database
    await storeRecommendations(prisma, userId, enrichedRecommendations);
    
    return enrichedRecommendations;
  } catch (error) {
    console.error("Error generating recommendations:", error);
    throw error;
  }
}

/**
 * Generate contest predictions for a user based on their performance history
 * 
 * @param prisma - Prisma client instance
 * @param handle - User's Codeforces handle
 * @param userId - Internal user ID
 * @param apiKey - OpenAI API key
 * @returns Contest predictions with preparation advice
 */
export async function generateContestPredictions(
  prisma: PrismaClient,
  handle: string,
  userId: number,
  apiKey: string
) {
  try {
    // Step 1: Get user's rating history and recent performance
    const userInfoUrl = `https://codeforces.com/api/user.info?handles=${handle}`;
    const userInfoResponse = await fetch(userInfoUrl);
    const userInfoData = await userInfoResponse.json();
    
    if (userInfoData.status !== "OK") {
      throw new Error("Failed to fetch user info from Codeforces API");
    }
    
    const userRating = userInfoData.result[0].rating || 0;
    const userMaxRating = userInfoData.result[0].maxRating || 0;
    
    // Step 2: Get user's contest history
    const contestHistoryUrl = `https://codeforces.com/api/user.rating?handle=${handle}`;
    const contestHistoryResponse = await fetch(contestHistoryUrl);
    const contestHistoryData = await contestHistoryResponse.json();
    
    if (contestHistoryData.status !== "OK") {
      throw new Error("Failed to fetch contest history from Codeforces API");
    }
    
    // Step 3: Get upcoming contests
    const contestListUrl = "https://codeforces.com/api/contest.list";
    const contestListResponse = await fetch(contestListUrl);
    const contestListData = await contestListResponse.json();
    
    if (contestListData.status !== "OK") {
      throw new Error("Failed to fetch contest list from Codeforces API");
    }
    
    const upcomingContests = contestListData.result
      .filter((contest: any) => contest.phase === "BEFORE")
      .sort((a: any, b: any) => a.startTimeSeconds - b.startTimeSeconds);
    
    if (upcomingContests.length === 0) {
      return [];
    }
    
    // Step 4: Analyze user's tag performance
    const submissionsUrl = `https://codeforces.com/api/user.status?handle=${handle}`;
    const submissionsResponse = await fetch(submissionsUrl);
    const submissionsData = await submissionsResponse.json();
    
    const tagPerformance = analyzeTagPerformance(submissionsData.result);
    const { weakTags } = identifyStrengthsAndWeaknesses(tagPerformance);
    
    // Step 5: Generate predictions for each upcoming contest
    const predictions = [];
    
    for (const contest of upcomingContests.slice(0, 3)) {
      // Use historical contest performance to predict outcome
      const prediction = predictContestPerformance(
        contest,
        contestHistoryData.result,
        userRating,
        userMaxRating,
        tagPerformance
      );
      
      // Add AI-generated preparation advice
      const enrichedPrediction = await generateContestAdvice(
        prediction,
        weakTags,
        handle,
        apiKey
      );
      
      // Store prediction in database
      await storePrediction(prisma, userId, enrichedPrediction);
      
      predictions.push(enrichedPrediction);
    }
    
    return predictions;
  } catch (error) {
    console.error("Error generating contest predictions:", error);
    throw error;
  }
}

// Helper functions

function analyzeTagPerformance(submissions: any[]) {
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

function identifyStrengthsAndWeaknesses(tagPerformance: Record<string, any>) {
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

async function fetchPotentialProblems(weakTags: any[]) {
  try {
    // Get problems that match weak tags
    const problemsetUrl = "https://codeforces.com/api/problemset.problems";
    const problemsetResponse = await fetch(problemsetUrl);
    const problemsetData = await problemsetResponse.json();
    
    if (problemsetData.status !== "OK") {
      throw new Error("Failed to fetch problemset from Codeforces API");
    }
    
    // Extract weak tag names
    const weakTagNames = weakTags.map(tag => tag.tag);
    
    // Filter problems that contain at least one weak tag
    return problemsetData.result.problems.filter((problem: any) => {
      return problem.tags.some((tag: string) => weakTagNames.includes(tag));
    });
  } catch (error) {
    console.error("Error fetching potential problems:", error);
    throw error;
  }
}

function scoreProblemsByRelevance(
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

async function enrichRecommendationsWithAI(
  recommendations: any[],
  weakTags: any[],
  handle: string,
  apiKey: string
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
      const explanation = await generateExplanation(
        problem,
        matchingWeakTags,
        handle,
        apiKey
      );
      
      enrichedRecommendations.push({
        problemId: `${problem.contestId}${problem.index}`,
        contestId: problem.contestId,
        index: problem.index,
        name: problem.name,
        tags: problem.tags,
        rating: problem.rating,
        matchingWeakTags,
        difficulty: getDifficultyLevel(problem.rating),
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
      difficulty: getDifficultyLevel(problem.rating),
      url: `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`,
      explanation: `This problem will help you improve in ${problem.tags.join(", ")}.`
    }));
  }
}

async function generateExplanation(
  problem: any,
  matchingWeakTags: string[],
  handle: string,
  apiKey: string
) {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
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
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        }
      }
    );
    
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error generating explanation:", error);
    return `This problem will help you improve in ${matchingWeakTags.join(", ")}.`;
  }
}

function predictContestPerformance(
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
    recommendedProblems: determineRecommendedProblemTypes(tagPerformance)
  };
}

function determineRecommendedProblemTypes(tagPerformance: any) {
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

async function generateContestAdvice(
  prediction: any,
  weakTags: any[],
  handle: string,
  apiKey: string
) {
  try {
    // Format the contest start time
    const contestDate = new Date(prediction.startTimeSeconds * 1000);
    const formattedDate = contestDate.toLocaleDateString();
    const formattedTime = contestDate.toLocaleTimeString();
    
    // Prepare weak tags for the prompt
    const weakTagNames = weakTags.map(tag => tag.tag).slice(0, 3);
    
    // Generate advice with OpenAI
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
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
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        }
      }
    );
    
    const advice = response.data.choices[0].message.content.trim();
    
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

async function storeRecommendations(
  prisma: PrismaClient,
  userId: number,
  recommendations: any[]
) {
  try {
    for (const rec of recommendations) {
      // Check if problem exists in database
      let problem = await prisma.problem.findFirst({
        where: {
          contestId: rec.contestId,
          index: rec.index
        }
      });
      
      // If problem doesn't exist, create it
      if (!problem) {
        problem = await prisma.problem.create({
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
      await prisma.recommendation.upsert({
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

async function storePrediction(
  prisma: PrismaClient,
  userId: number,
  prediction: any
) {
  try {
    await prisma.contestPrediction.upsert({
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

function getDifficultyLevel(rating: number | null): string {
  if (!rating) return "MEDIUM";
  
  if (rating < 1200) return "EASY";
  if (rating < 1900) return "MEDIUM";
  return "HARD";
}