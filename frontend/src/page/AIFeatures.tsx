import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RecommendedProblems from '../components/ai/RecommendedProblems';
import PerformanceInsights from '../components/ai/PerformanceInsights';
import ContestPredictions from '../components/ai/ContestPredictions';
import CodeAssistant from '../components/ai/CodeAssistant';
import ErrorComponent from '../components/ErrorComponent';

const AIFeatures: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'insights' | 'contests' | 'assistant'>('recommendations');
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Check if user is authenticated
  React.useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/signin");
    }
  }, [navigate]);

  const renderContent = () => {
    switch (activeTab) {
      case 'recommendations':
        return <RecommendedProblems />;
      case 'insights':
        return <PerformanceInsights />;
      case 'contests':
        return <ContestPredictions />;
      case 'assistant':
        return <CodeAssistant />;
      default:
        return <RecommendedProblems />;
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center md:bg-cfbg md:bg-no-repeat md:bg-cover md:bg-white bg-blue-300 md:bg-center">
      <div className="absolute top-14">
        {error !== "" && <ErrorComponent message={error} />}
      </div>
      
      <div className="w-full md:w-4/5 mt-16 md:mt-20 pb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-6">AI-Powered Features</h1>
        
        {/* Navigation tabs */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-6">
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'recommendations'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-800 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('recommendations')}
          >
            Recommended Problems
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'insights'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-800 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('insights')}
          >
            Performance Insights
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'contests'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-800 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('contests')}
          >
            Contest Predictions
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'assistant'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-800 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('assistant')}
          >
            Coding Assistant
          </button>
        </div>
        
        {/* Content area */}
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-md">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AIFeatures;