import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { URL } from '../../config';
import Card from '../Card';
import Heading from '../Heading';
import SpinLoader from '../SpinLoader';

interface ContestPrediction {
  contestId: number;
  contestName: string;
  contestDate: string;
  contestTime: string;
  predictedRank?: number;
  predictedRatingChange?: number;
  confidence: number;
  recommendedProblems: string[];
  preparationAdvice: string;
  url: string;
}

const ContestPredictions: React.FC = () => {
  const [predictions, setPredictions] = useState<ContestPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchContestPredictions();
  }, []);

  const fetchContestPredictions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${URL}/ai/recommendations/contest-predictions`, {
        headers: {
          Authorization: localStorage.getItem("token")
        }
      });

      if (response.data.success) {
        setPredictions(response.data.predictions);
      } else {
        setError(response.data.message || "Failed to get contest predictions");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "An error occurred");
      console.error("Error fetching contest predictions:", err);
    } finally {
      setLoading(false);
    }
  };

  const getRatingChangeDisplay = (change?: number) => {
    if (change === undefined) return "N/A";
    return change > 0 ? `+${change}` : `${change}`;
  };

  const getRatingChangeColor = (change?: number) => {
    if (change === undefined) return "text-gray-600";
    return change >= 0 ? "text-green-600" : "text-red-600";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.5) return "Medium";
    return "Low";
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-100 text-green-800";
    if (confidence >= 0.5) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
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
        <Heading text="Upcoming Contest Predictions" />
        
        {predictions.length === 0 ? (
          <p className="text-center text-gray-500 my-4">No upcoming contests found or not enough history to make predictions.</p>
        ) : (
          <div className="space-y-6 mt-3">
            {predictions.map((prediction) => (
              <div key={prediction.contestId} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row justify-between items-start mb-3">
                  <div>
                    <a 
                      href={prediction.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="font-medium text-lg text-blue-600 hover:underline"
                    >
                      {prediction.contestName}
                    </a>
                    <div className="text-sm text-gray-600 mt-1">
                      {prediction.contestDate} at {prediction.contestTime}
                    </div>
                  </div>
                  
                  <a 
                    href={prediction.url}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="mt-2 md:mt-0 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    View Contest
                  </a>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div className="border rounded p-3">
                    <div className="text-sm text-gray-600">Predicted Rank</div>
                    <div className="font-semibold text-lg">
                      {prediction.predictedRank || "N/A"}
                    </div>
                  </div>
                  
                  <div className="border rounded p-3">
                    <div className="text-sm text-gray-600">Predicted Rating Change</div>
                    <div className={`font-semibold text-lg ${getRatingChangeColor(prediction.predictedRatingChange)}`}>
                      {getRatingChangeDisplay(prediction.predictedRatingChange)}
                    </div>
                  </div>
                  
                  <div className="border rounded p-3">
                    <div className="text-sm text-gray-600">Prediction Confidence</div>
                    <div className="flex items-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getConfidenceColor(prediction.confidence)}`}>
                        {getConfidenceLabel(prediction.confidence)}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({Math.round(prediction.confidence * 100)}%)
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Preparation Advice</h4>
                  <p className="text-gray-700">{prediction.preparationAdvice}</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Recommended Problem Types</h4>
                  <div className="flex flex-wrap gap-2">
                    {prediction.recommendedProblems.map((problem, idx) => (
                      <span key={idx} className="px-2 py-1 rounded bg-gray-100 text-gray-800 text-sm">
                        {problem}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default ContestPredictions;