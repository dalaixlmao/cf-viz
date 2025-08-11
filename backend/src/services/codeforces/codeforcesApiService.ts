/**
 * Service for interacting with Codeforces API
 */
export class CodeforcesApiService {
  private baseUrl: string = 'https://codeforces.com/api';
  private cache: KVNamespace;
  
  constructor(cache: KVNamespace) {
    this.cache = cache;
  }
  
  /**
   * Get user information from Codeforces
   * 
   * @param handle Codeforces handle
   * @returns User information
   */
  async getUserInfo(handle: string) {
    const cacheKey = `cf:user:${handle}`;
    
    // Try to get from cache
    const cached = await this.cache.get(cacheKey, 'json');
    if (cached) {
      return cached;
    }
    
    // Fetch from API
    const url = `${this.baseUrl}/user.info?handles=${handle}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Codeforces API error: ${data.comment || 'Unknown error'}`);
    }
    
    // Store in cache for 1 hour
    await this.cache.put(cacheKey, JSON.stringify(data.result[0]), {
      expirationTtl: 3600
    });
    
    return data.result[0];
  }
  
  /**
   * Get user submissions from Codeforces
   * 
   * @param handle Codeforces handle
   * @param count Number of submissions to retrieve (max 10000)
   * @returns User submissions
   */
  async getUserSubmissions(handle: string, count: number = 100) {
    const cacheKey = `cf:submissions:${handle}:${count}`;
    
    // Try to get from cache
    const cached = await this.cache.get(cacheKey, 'json');
    if (cached) {
      return cached;
    }
    
    // Fetch from API
    const url = `${this.baseUrl}/user.status?handle=${handle}&count=${Math.min(count, 10000)}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Codeforces API error: ${data.comment || 'Unknown error'}`);
    }
    
    // Store in cache for 15 minutes
    await this.cache.put(cacheKey, JSON.stringify(data.result), {
      expirationTtl: 900
    });
    
    return data.result;
  }
  
  /**
   * Get contest history for a user
   * 
   * @param handle Codeforces handle
   * @returns Contest history
   */
  async getUserContests(handle: string) {
    const cacheKey = `cf:contests:${handle}`;
    
    // Try to get from cache
    const cached = await this.cache.get(cacheKey, 'json');
    if (cached) {
      return cached;
    }
    
    // Fetch from API
    const url = `${this.baseUrl}/user.rating?handle=${handle}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Codeforces API error: ${data.comment || 'Unknown error'}`);
    }
    
    // Store in cache for 1 hour
    await this.cache.put(cacheKey, JSON.stringify(data.result), {
      expirationTtl: 3600
    });
    
    return data.result;
  }
  
  /**
   * Get upcoming contests
   * 
   * @returns List of upcoming contests
   */
  async getUpcomingContests() {
    const cacheKey = 'cf:upcoming_contests';
    
    // Try to get from cache
    const cached = await this.cache.get(cacheKey, 'json');
    if (cached) {
      return cached;
    }
    
    // Fetch from API
    const url = `${this.baseUrl}/contest.list`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Codeforces API error: ${data.comment || 'Unknown error'}`);
    }
    
    // Filter upcoming contests
    const upcomingContests = data.result.filter((contest: any) => {
      return contest.phase === 'BEFORE';
    });
    
    // Store in cache for 1 hour
    await this.cache.put(cacheKey, JSON.stringify(upcomingContests), {
      expirationTtl: 3600
    });
    
    return upcomingContests;
  }
  
  /**
   * Get problem set from Codeforces
   * 
   * @returns Problem set data
   */
  async getProblemSet() {
    const cacheKey = 'cf:problemset';
    
    // Try to get from cache
    const cached = await this.cache.get(cacheKey, 'json');
    if (cached) {
      return cached;
    }
    
    // Fetch from API
    const url = `${this.baseUrl}/problemset.problems`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Codeforces API error: ${data.comment || 'Unknown error'}`);
    }
    
    // Store in cache for 24 hours
    await this.cache.put(cacheKey, JSON.stringify(data.result), {
      expirationTtl: 86400
    });
    
    return data.result;
  }
  
  /**
   * Get problem by ID
   * 
   * @param contestId Contest ID
   * @param index Problem index
   * @returns Problem data
   */
  async getProblem(contestId: number, index: string) {
    const problemSet = await this.getProblemSet();
    
    const problem = problemSet.problems.find((p: any) => {
      return p.contestId === contestId && p.index === index;
    });
    
    if (!problem) {
      throw new Error(`Problem not found: ${contestId}${index}`);
    }
    
    return problem;
  }
  
  /**
   * Invalidate cache for a specific user
   * 
   * @param handle Codeforces handle
   */
  async invalidateUserCache(handle: string) {
    const keys = [
      `cf:user:${handle}`,
      `cf:submissions:${handle}:100`,
      `cf:contests:${handle}`
    ];
    
    const deletePromises = keys.map(key => this.cache.delete(key));
    await Promise.all(deletePromises);
  }
}