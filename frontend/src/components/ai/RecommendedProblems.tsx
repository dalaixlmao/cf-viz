import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { URL } from '../../config';
import Card from '../Card';
import Heading from '../Heading';
import SpinLoader from '../SpinLoader';

interface Problem {
  problemId: string;
  name: string;
  tags: string[];
  rating: number;
  difficulty: string;
  url: string;
  explanation: string;
}

const RecommendedProblems: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${URL}/ai/recommendations`, {
        headers: {
          Authorization: localStorage.getItem("token")
        }
      });

      if (response.data.success) {
        setRecommendations(response.data.recommendations);
      } else {
        setError(response.data.message || "Failed to get recommendations");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "An error occurred");
      console.error("Error fetching recommendations:", err);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'bg-green-100 text-green-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'HARD':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating < 1200) return 'text-gray-700';
    if (rating < 1400) return 'text-green-600';
    if (rating < 1600) return 'text-cyan-600';
    if (rating < 1900) return 'text-blue-600';
    if (rating < 2100) return 'text-violet-600';
    if (rating < 2400) return 'text-orange-500';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <SpinLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        {error}
      </div>
    );
  }

  return (
    <Card width="full">
      <div className="flex flex-col w-full">
        <Heading text="Recommended Problems" />
        
        {recommendations.length === 0 ? (
          <p className="text-center text-gray-500 my-4">No recommendations available yet. Solve more problems for personalized recommendations.</p>
        ) : (
          <div className="space-y-4 mt-3">
            {recommendations.map((problem) => (
              <div key={problem.problemId} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                  <div>
                    <a 
                      href={problem.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {problem.name}
                    </a>
                    
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(problem.difficulty)}`}>
                        {problem.difficulty}
                      </span>
                      {problem.rating && (
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 ${getRatingColor(problem.rating)}`}>
                          {problem.rating}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <a 
                    href={problem.url}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="mt-2 md:mt-0 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    Solve
                  </a>
                </div>
                
                <div className="mt-3 text-sm text-gray-600">
                  {problem.explanation}
                </div>
                
                <div className="mt-2 flex flex-wrap gap-1">
                  {problem.tags.map((tag, idx) => (
                    <span key={idx} className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default RecommendedProblems;