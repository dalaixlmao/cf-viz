# CFviz - AI-Enhanced Competitive Programming Dashboard

CFviz is a powerful tool for competitive programmers that visualizes your Codeforces performance and provides AI-powered features to help you improve. Track your progress, analyze your strengths and weaknesses, and receive personalized recommendations for practice problems and contest preparation.

## Features

### Core Features
- Codeforces profile visualization and statistics
- Problem tag analysis and performance metrics
- User authentication and profile management

### AI-Powered Features
- **Personalized Problem Recommendations** - Get problem suggestions based on your specific strengths and weaknesses
- **Performance Insights** - AI analysis of your solving patterns and detailed breakdown by problem categories
- **Contest Predictions** - Forecast your potential performance in upcoming contests with preparation advice
- **AI Coding Assistant** - Get help with competitive programming concepts and code optimization
- **Smart Caching** - Efficient data retrieval even when Codeforces API is unavailable

## Tech Stack

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- React Router
- Axios
- React Google Charts

### Backend
- Cloudflare Workers
- Hono.js
- Prisma with PostgreSQL
- OpenAI API integration
- Cloudflare KV for caching

## Getting Started

### Prerequisites
- Node.js (v16+)
- npm or yarn
- Cloudflare Workers account
- PostgreSQL database
- OpenAI API key

### Environment Variables

#### Backend
Create a `.env` file in the backend directory with:

```
DATABASE_URL=your_postgres_connection_string
DIRECT_URL=your_direct_postgres_connection_string
JWT_PASSWORD=your_jwt_secret
OPENAI_API_KEY=your_openai_api_key
```

### Installation

#### Backend
```bash
cd backend
npm install
npx prisma db push
npm run dev
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## AI Features Usage

### Problem Recommendations
Navigate to the AI Features section and check the "Recommended Problems" tab to see personalized problem suggestions based on your weak areas.

### Performance Insights
The "Performance Insights" tab provides detailed analysis of your performance across different problem categories and tags.

### Contest Predictions
View upcoming contests with personalized predictions about your potential performance and tailored preparation advice.

### AI Coding Assistant
Use the assistant to:
1. Ask questions about competitive programming concepts, algorithms, and strategies
2. Analyze your solutions for optimization opportunities and complexity improvements

## Deployment

### Backend
```bash
cd backend
npm run deploy
```

### Frontend
```bash
cd frontend
npm run build
```
Then deploy the `dist` directory to your hosting service of choice (Vercel, Netlify, etc.)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Acknowledgments

- Codeforces for providing the API
- OpenAI for powering the AI features