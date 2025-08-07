import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { URL } from '../../config';
import Card from '../Card';
import Heading from '../Heading';
import SpinLoader from '../SpinLoader';

interface TagMetric {
  tag: string;
  problemsSolved: number;
  problemsAttempted: number;
  successRate: number;
  averageRating: number;
  strengthScore: number;
  recentProgress: string;
}

interface PerformanceData {
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
  recommendedFocus: string[];
}

const PerformanceInsights: React.FC = () => {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${URL}/ai/recommendations/performance-analysis`, {
        headers: {
          Authorization: localStorage.getItem("token")
        }
      });

      if (response.data.success) {
        setPerformanceData(response.data.performanceData);
      } else {
        setError(response.data.message || "Failed to get performance data");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "An error occurred");
      console.error("Error fetching performance data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (progress: string) => {
    switch (progress) {
      case 'IMPROVING':
        return 'text-green-600';
      case 'DECLINING':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStrengthColor = (score: number) => {
    if (score >= 8) return 'bg-green-100 text-green-800';
    if (score >= 6) return 'bg-blue-100 text-blue-800';
    if (score >= 4) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const renderTrendIcon = (trend: string) => {
    switch (trend) {
      case 'INCREASING':
        return <span className="text-green-600">↑</span>;
      case 'DECREASING':
        return <span className="text-red-600">↓</span>;
      default:
        return <span className="text-gray-600">→</span>;
    }
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

  if (!performanceData) {
    return (
      <Card width="full">
        <Heading text="Performance Insights" />
        <p className="text-center text-gray-500 my-4">No performance data available. Solve more problems to see insights.</p>
      </Card>
    );
  }

  return (
    <Card width="full">
      <div className="flex flex-col w-full">
        <Heading text="Performance Insights" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-lg mb-2">Strengths</h3>
            <div className="flex flex-wrap gap-2">
              {performanceData.overallStrengths.map((tag, idx) => (
                <span key={idx} className="px-2 py-1 rounded-full text-sm bg-green-100 text-green-800">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-lg mb-2">Areas to Improve</h3>
            <div className="flex flex-wrap gap-2">
              {performanceData.overallWeaknesses.map((tag, idx) => (
                <span key={idx} className="px-2 py-1 rounded-full text-sm bg-red-100 text-red-800">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        
        <div className="border rounded-lg p-4 mt-4">
          <h3 className="font-medium text-lg mb-2">Rating Progression</h3>
          <div className="flex items-center gap-2">
            <span>Trend: </span>
            <span className="font-medium flex items-center">
              {performanceData.ratingProgression.trend} {renderTrendIcon(performanceData.ratingProgression.trend)}
            </span>
          </div>
          
          {performanceData.ratingProgression.timeline.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left">Date</th>
                    <th className="px-2 py-1 text-right">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceData.ratingProgression.timeline.slice(-5).map((entry, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-2 py-1">{entry.date}</td>
                      <td className="px-2 py-1 text-right font-medium">{entry.rating}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="border rounded-lg p-4 mt-4">
          <h3 className="font-medium text-lg mb-2">Topic Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-left">Topic</th>
                  <th className="px-2 py-1 text-center">Solved</th>
                  <th className="px-2 py-1 text-center">Attempted</th>
                  <th className="px-2 py-1 text-center">Success Rate</th>
                  <th className="px-2 py-1 text-center">Strength</th>
                  <th className="px-2 py-1 text-center">Progress</th>
                </tr>
              </thead>
              <tbody>
                {performanceData.tagMetrics.slice(0, 10).map((metric, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-2 py-2">{metric.tag}</td>
                    <td className="px-2 py-2 text-center">{metric.problemsSolved}</td>
                    <td className="px-2 py-2 text-center">{metric.problemsAttempted}</td>
                    <td className="px-2 py-2 text-center">
                      {Math.round(metric.successRate * 100)}%
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStrengthColor(metric.strengthScore)}`}>
                        {metric.strengthScore.toFixed(1)}
                      </span>
                    </td>
                    <td className={`px-2 py-2 text-center ${getProgressColor(metric.recentProgress)}`}>
                      {metric.recentProgress}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="border rounded-lg p-4 mt-4">
          <h3 className="font-medium text-lg mb-2">Recommended Focus Areas</h3>
          <div className="flex flex-wrap gap-2">
            {performanceData.recommendedFocus.map((topic, idx) => (
              <span key={idx} className="px-3 py-2 rounded-lg text-sm bg-blue-100 text-blue-800 font-medium">
                {topic}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PerformanceInsights;