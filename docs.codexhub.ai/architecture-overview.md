# CFviz Architecture Overview

This document provides a technical overview of the CFviz application architecture, with a focus on the AI features implementation.

## System Architecture

CFviz follows a modern client-server architecture with a React frontend and a serverless backend built with Cloudflare Workers. The system integrates with both the Codeforces API for competitive programming data and the OpenAI API for intelligent features.

### Architecture Diagram

```
┌───────────────┐        ┌───────────────┐        ┌────────────────┐
│               │        │               │        │                │
│  React        │◄──────►│  Cloudflare   │◄──────►│  PostgreSQL    │
│  Frontend     │        │  Workers API  │        │  Database      │
│               │        │               │        │                │
└───────────────┘        └───────┬───────┘        └────────────────┘
                                 │
                      ┌──────────┴──────────┐
                      │                     │
             ┌────────▼────────┐    ┌───────▼────────┐
             │                 │    │                │
             │  Codeforces     │    │  OpenAI        │
             │  API            │    │  API           │
             │                 │    │                │
             └─────────────────┘    └────────────────┘
```

## Data Flow

1. **User Authentication Flow**:
   - Frontend sends credentials to backend
   - Backend validates and returns JWT token
   - Token stored in localStorage for subsequent requests

2. **Dashboard Data Flow**:
   - Frontend requests user data using stored JWT
   - Backend validates JWT, retrieves handle from database
   - Backend fetches data from Codeforces API, processes it
   - Frontend displays visualizations and statistics

3. **AI Features Flow**:
   - Frontend requests AI-generated recommendations/insights
   - Backend processes user's Codeforces data
   - Backend sends data to OpenAI API with specific prompts
   - Backend processes, stores, and returns AI-enhanced results
   - Frontend displays personalized recommendations and insights

## Component Architecture

### Backend

```
/backend
├── /controllers
│   ├── createData.ts              # Data transformation
│   ├── /ai
│       ├── assistantService.ts    # OpenAI integration for Q&A
│       ├── performanceAnalyzer.ts # Performance metrics calculation
│       └── recommendationEngine.ts # Problem recommendation logic
├── /middleware
│   ├── userAuthMiddleware.ts      # Authentication middleware
│   └── validationMiddleware.ts    # Input validation
├── /prisma
│   └── schema.prisma              # Database schema
├── /routes
│   ├── user.ts                    # User routes
│   ├── /ai
│       ├── assistant.ts           # Assistant API routes
│       ├── caching.ts             # Smart caching routes
│       ├── index.ts               # AI routes aggregation
│       └── recommendation.ts      # Recommendation routes
└── /src
    └── index.ts                   # Main application entry
```

### Frontend

```
/frontend
├── /src
│   ├── /components
│   │   ├── /ai
│   │   │   ├── CodeAssistant.tsx        # AI coding assistant
│   │   │   ├── ContestPredictions.tsx   # Contest predictions
│   │   │   ├── PerformanceInsights.tsx  # Performance analysis
│   │   │   └── RecommendedProblems.tsx  # Problem recommendations
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── ...
│   ├── /page
│   │   ├── AIFeatures.tsx               # AI features page
│   │   ├── Dashboard.tsx
│   │   └── ...
│   └── App.tsx
└── ...
```

## Core Technologies and Libraries

### Frontend
- **React**: UI library
- **TypeScript**: Type-safe JavaScript
- **React Router**: Navigation
- **Axios**: API requests
- **TailwindCSS**: Styling
- **React Google Charts**: Visualization

### Backend
- **Hono.js**: Lightweight framework for Cloudflare Workers
- **Prisma**: Database ORM
- **OpenAI Node SDK**: AI integration
- **Cloudflare KV**: Caching layer
- **Zod**: Input validation
- **JWT**: Authentication

## AI Feature Implementation Details

### Problem Recommendations

1. **Data Collection**:
   - Fetch user's submission history from Codeforces
   - Extract solved/attempted problems with tags and ratings

2. **Analysis**:
   - Calculate success rates per problem tag
   - Identify weak areas (low success rates) and strong areas
   - Consider problem ratings relative to user's level

3. **Recommendation Generation**:
   - Score potential problems based on relevance to weak areas
   - Use OpenAI to generate personalized explanations
   - Store recommendations in database for quick retrieval

### Performance Insights

1. **Data Analysis**:
   - Calculate comprehensive metrics for each problem tag
   - Determine strength scores (0-10) for each category
   - Analyze rating progression and trends

2. **Metric Storage**:
   - Store computed metrics for efficient retrieval
   - Track progress over time for trend analysis

3. **Focus Area Identification**:
   - Algorithmically determine recommended practice areas
   - Prioritize based on weakness severity and contest relevance

### Contest Predictions

1. **Historical Analysis**:
   - Analyze user's past contest performance
   - Calculate average rank percentile and rating changes

2. **Prediction Generation**:
   - Use statistical models to predict future performance
   - Calculate confidence scores based on data reliability
   - Identify problem types to focus on for preparation

3. **Preparation Advice**:
   - Use OpenAI to generate contest-specific preparation advice
   - Tailor recommendations to user's specific weaknesses

### AI Assistant

1. **System Context**:
   - Include user's performance data in OpenAI prompts
   - Maintain consistent assistant personality and tone

2. **Code Analysis**:
   - Extract time and space complexity
   - Identify optimization opportunities
   - Suggest alternative approaches

3. **Response Formatting**:
   - Structure responses as JSON for consistent processing
   - Include related resources where appropriate

### Smart Caching

1. **Cache Implementation**:
   - Use Cloudflare KV as caching layer
   - Different TTL based on data type and volatility

2. **Fallback Mechanism**:
   - Serve cached data when Codeforces API is unavailable
   - Progressive data staleness tolerance

3. **Cache Invalidation**:
   - Automatic expiration based on TTL
   - Manual invalidation endpoints for admin use

## Database Schema

The database schema has been extended to support AI features with the following key models:

- **User**: Core user data with relations to AI-related models
- **Problem**: Problem details imported from Codeforces
- **UserSolution**: User's submitted solutions with analysis
- **Recommendation**: Personalized problem recommendations
- **PerformanceMetric**: Tag-based performance metrics
- **ContestPrediction**: Predictions for upcoming contests

## Security Considerations

- JWT-based authentication for API access
- Environment variables for sensitive API keys
- Input validation on all endpoints
- No personally identifiable information stored beyond what's public on Codeforces

## Future Architecture Enhancements

1. **Model Caching**:
   - Cache OpenAI responses for similar queries
   - Implement vector similarity search for efficient retrieval

2. **Offline Mode**:
   - Enhanced caching for full offline functionality
   - Local storage of critical user data

3. **Performance Optimizations**:
   - Batch processing for expensive operations
   - Precomputing recommendations during low-traffic periods

4. **Scaling**:
   - Sharding strategy for database as user base grows
   - Rate limiting and queue system for AI API calls