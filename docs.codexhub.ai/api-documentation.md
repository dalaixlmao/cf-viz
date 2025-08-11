# CFviz API Documentation

## Overview

The CFviz API provides endpoints for user authentication, Codeforces data retrieval, and AI-powered features for competitive programmers. This document outlines the available endpoints, request formats, and response structures.

## Base URL

```
https://api.cfviz.com/api/v1
```

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

### Authentication Endpoints

#### Register User

Create a new user account.

```
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "handle": "codeforcesHandle"
}

Response: 201 Created
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 123,
      "email": "user@example.com",
      "handle": "codeforcesHandle"
    },
    "token": "jwt-token"
  }
}
```

#### Login User

Log in with existing credentials.

```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}

Response: 200 OK
{
  "status": "success",
  "message": "User logged in successfully",
  "data": {
    "user": {
      "id": 123,
      "email": "user@example.com",
      "handle": "codeforcesHandle"
    },
    "token": "jwt-token"
  }
}
```

#### Verify Token

Verify if a token is valid.

```
POST /auth/verify
Authorization: Bearer <token>

Response: 200 OK
{
  "status": "success",
  "message": "Token is valid",
  "data": {
    "userId": 123
  }
}
```

## User Endpoints

### User Profile

#### Get User Profile

Get the current authenticated user's profile.

```
GET /users/profile
Authorization: Bearer <token>

Response: 200 OK
{
  "status": "success",
  "data": {
    "id": 123,
    "email": "user@example.com",
    "handle": "codeforcesHandle",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

#### Update User Profile

Update the current user's profile information.

```
PUT /users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "handle": "newHandle",
  "email": "newemail@example.com"
}

Response: 200 OK
{
  "status": "success",
  "message": "Profile updated successfully",
  "data": {
    "id": 123,
    "email": "newemail@example.com",
    "handle": "newHandle",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

#### Change Password

Update the current user's password.

```
PUT /users/password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "currentpassword",
  "newPassword": "newpassword"
}

Response: 200 OK
{
  "status": "success",
  "message": "Password updated successfully"
}
```

#### Get User Dashboard

Get the user's dashboard data, including Codeforces profile, submission stats, tag performance, and recommendations.

```
GET /users/dashboard
Authorization: Bearer <token>

Response: 200 OK
{
  "status": "success",
  "data": {
    "userInfo": {
      "handle": "codeforcesHandle",
      "firstName": "John",
      "lastName": "Doe",
      "rank": "candidate master",
      "maxRank": "master",
      "rating": 1900,
      "maxRating": 2100,
      "avatar": "url-to-avatar",
      "titlePhoto": "url-to-title-photo",
      "country": "United States"
    },
    "submissionStats": {
      "totalSubmissions": 500,
      "acceptedSubmissions": 350
    },
    "tagData": [
      {
        "tag": "dp",
        "solved": 50,
        "attempted": 70,
        "successRate": 0.71
      },
      // More tags...
    ],
    "performanceMetrics": [
      {
        "tag": "dp",
        "strengthScore": 7,
        "problemsSolved": 50,
        "problemsAttempted": 70
      },
      // More metrics...
    ],
    "recommendations": [
      {
        "problemId": "1234A",
        "name": "Problem Title",
        "tags": ["dp", "greedy"],
        "difficulty": "MEDIUM",
        "reason": "This problem will help you improve your dynamic programming skills.",
        "url": "https://codeforces.com/problemset/problem/1234/A"
      },
      // More recommendations...
    ]
  }
}
```

## Codeforces Endpoints

### User Information

#### Get User Info

Get basic information about a Codeforces user by handle.

```
GET /codeforces/user/:handle

Response: 200 OK
{
  "status": "success",
  "data": {
    "userInfo": {
      "handle": "tourist",
      "firstName": "Gennady",
      "lastName": "Korotkevich",
      "rating": 3800,
      "maxRating": 3850,
      "rank": "legendary grandmaster",
      "maxRank": "legendary grandmaster",
      "avatar": "url-to-avatar",
      "titlePhoto": "url-to-title-photo",
      "country": "Belarus",
      "organization": "ITMO University"
    }
  }
}
```

#### Get User Submissions

Get a list of submissions for a Codeforces user.

```
GET /codeforces/submissions/:handle
Query Parameters:
  count: integer (default: 100)
  page: integer (optional)

Response: 200 OK
{
  "status": "success",
  "data": {
    "submissions": [
      {
        "id": 123456789,
        "contestId": 1234,
        "problem": {
          "name": "Problem Title",
          "index": "A",
          "tags": ["dp", "greedy"]
        },
        "verdict": "OK",
        "creationTimeSeconds": 1609459200
      },
      // More submissions...
    ],
    "pagination": {
      "total": 500,
      "page": 1,
      "pageSize": 20,
      "totalPages": 25
    }
  }
}
```

#### Get User Contests

Get a list of contests a user has participated in.

```
GET /codeforces/contests/:handle

Response: 200 OK
{
  "status": "success",
  "data": {
    "contests": [
      {
        "contestId": 1234,
        "contestName": "Codeforces Round #720 (Div. 2)",
        "rank": 56,
        "oldRating": 1850,
        "newRating": 1900,
        "ratingChange": 50,
        "ratingUpdateTimeSeconds": 1609459200
      },
      // More contests...
    ]
  }
}
```

#### Get Upcoming Contests

Get a list of upcoming Codeforces contests.

```
GET /codeforces/upcoming-contests

Response: 200 OK
{
  "status": "success",
  "data": {
    "contests": [
      {
        "id": 1234,
        "name": "Codeforces Round #750 (Div. 2)",
        "startTimeSeconds": 1640995200,
        "durationSeconds": 7200,
        "phase": "BEFORE"
      },
      // More contests...
    ]
  }
}
```

#### Get Problem Set

Get the complete Codeforces problem set.

```
GET /codeforces/problemset

Response: 200 OK
{
  "status": "success",
  "data": {
    "problemCount": 7500,
    "problems": [
      {
        "contestId": 1234,
        "index": "A",
        "name": "Problem Title",
        "tags": ["dp", "greedy"],
        "rating": 1500
      },
      // More problems...
    ],
    "problemStatistics": [
      {
        "contestId": 1234,
        "index": "A",
        "solvedCount": 10000
      },
      // More statistics...
    ]
  }
}
```

#### Get Problem by ID

Get details about a specific problem.

```
GET /codeforces/problem/:contestId/:index

Response: 200 OK
{
  "status": "success",
  "data": {
    "problem": {
      "contestId": 1234,
      "index": "A",
      "name": "Problem Title",
      "tags": ["dp", "greedy"],
      "rating": 1500
    }
  }
}
```

#### Invalidate Cache

Invalidate the cache for a specific user's data (requires authentication).

```
POST /codeforces/invalidate-cache/:handle
Authorization: Bearer <token>

Response: 200 OK
{
  "status": "success",
  "message": "Cache invalidated for user codeforcesHandle"
}
```

## AI Features

### Recommendations

#### Get Personalized Problem Recommendations

Get AI-generated problem recommendations based on the user's performance.

```
GET /ai/recommendations
Authorization: Bearer <token>
Query Parameters:
  limit: integer (default: 5)

Response: 200 OK
{
  "status": "success",
  "data": {
    "recommendations": [
      {
        "problemId": "1234A",
        "contestId": 1234,
        "index": "A",
        "name": "Problem Title",
        "tags": ["dp", "greedy"],
        "rating": 1500,
        "matchingWeakTags": ["dp"],
        "difficulty": "MEDIUM",
        "url": "https://codeforces.com/problemset/problem/1234/A",
        "explanation": "This problem focuses on dynamic programming concepts that you've struggled with recently. Solving it will help strengthen your DP skills, especially for optimization problems."
      },
      // More recommendations...
    ]
  }
}
```

#### Get Contest Predictions

Get AI-generated predictions for upcoming contests.

```
GET /ai/contest-predictions
Authorization: Bearer <token>

Response: 200 OK
{
  "status": "success",
  "data": {
    "predictions": [
      {
        "contestId": 1234,
        "contestName": "Codeforces Round #750 (Div. 2)",
        "contestDate": "2022-01-01",
        "contestTime": "15:00:00",
        "startTimeSeconds": 1640995200,
        "predictedRank": 250,
        "predictedRatingChange": 25,
        "confidence": 0.7,
        "recommendedProblems": ["dp", "greedy", "math"],
        "preparationAdvice": "Focus on practicing dynamic programming problems with mathematical components. Review past Div. 2 contests for similar problem patterns and time yourself to improve speed on implementation problems.",
        "url": "https://codeforces.com/contests/1234"
      },
      // More predictions...
    ]
  }
}
```

#### Get Performance Analysis

Get AI-generated analysis of the user's performance across different problem categories.

```
GET /ai/performance-analysis
Authorization: Bearer <token>

Response: 200 OK
{
  "status": "success",
  "data": {
    "strengths": [
      {
        "tag": "math",
        "score": 0.85,
        "solved": 45,
        "attempted": 50
      },
      // More strengths...
    ],
    "weaknesses": [
      {
        "tag": "dp",
        "score": 0.45,
        "solved": 15,
        "attempted": 30
      },
      // More weaknesses...
    ],
    "recentProgress": {
      "improvementRate": 0.12,
      "topImprovedTags": ["greedy", "bfs", "dfs"]
    }
  }
}
```

#### AI Assistant Chat

Get help from the AI assistant for competitive programming concepts.

```
POST /ai/assistant/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "How do I solve problems involving minimum spanning trees?",
  "context": {
    "problemId": "1234A",
    "code": "// Optional code snippet"
  }
}

Response: 200 OK
{
  "status": "success",
  "data": {
    "response": "Minimum spanning trees (MSTs) are used to find a tree that connects all vertices in a graph with the minimum possible total edge weight. The two most common algorithms for MSTs are Kruskal's and Prim's algorithms.\n\nKruskal's Algorithm:\n1. Sort all edges in non-decreasing order of weight\n2. Pick the smallest edge that doesn't form a cycle\n3. Repeat until you have (V-1) edges\n\nPrim's Algorithm:\n1. Start with any vertex\n2. Add the minimum weight edge that connects a vertex in the tree to a vertex outside\n3. Repeat until all vertices are included\n\nUse Kruskal's with Union-Find when edges are sparse, and Prim's with a priority queue for dense graphs.",
    "followupQuestions": [
      "What's the time complexity of Kruskal's vs Prim's algorithm?",
      "Can you show an example implementation of Union-Find for Kruskal's?",
      "How do I handle disconnected graphs when finding MSTs?"
    ]
  }
}
```

## Error Responses

All API endpoints return consistent error responses in the following format:

```
{
  "status": "error",
  "message": "Error message",
  "code": "ERROR_CODE",
  "details": { /* Optional additional error details */ }
}
```

Common error codes include:

- `BAD_REQUEST` - Invalid request parameters (HTTP 400)
- `UNAUTHORIZED` - Authentication required or invalid (HTTP 401)
- `FORBIDDEN` - Permission denied (HTTP 403)
- `NOT_FOUND` - Resource not found (HTTP 404)
- `RATE_LIMIT_EXCEEDED` - Too many requests (HTTP 429)
- `SERVICE_UNAVAILABLE` - External service unavailable (HTTP 503)
- `INTERNAL_SERVER_ERROR` - Unexpected server error (HTTP 500)

## Rate Limits

API endpoints have rate limits to prevent abuse:

- Authentication endpoints: 30 requests per minute per IP
- User endpoints: 50 requests per minute per user
- Codeforces endpoints: 30 requests per minute per IP
- AI endpoints: 20 requests per minute per user (more restrictive due to OpenAI API costs)

When rate limited, you'll receive a 429 response with a `Retry-After` header indicating the number of seconds to wait before retrying.