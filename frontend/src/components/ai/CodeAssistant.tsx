import React, { useState } from 'react';
import axios from 'axios';
import { URL } from '../../config';
import Card from '../Card';
import Heading from '../Heading';
import SpinLoader from '../SpinLoader';

interface AssistantResponse {
  message: string;
  relatedResources?: {
    title: string;
    url: string;
    description: string;
  }[];
}

interface SolutionAnalysis {
  feedback: string;
  optimizations: string[];
  timeComplexity: string;
  spaceComplexity: string;
  alternativeApproaches?: string[];
}

const CodeAssistant: React.FC = () => {
  const [mode, setMode] = useState<'chat' | 'analyze'>('chat');
  const [message, setMessage] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('cpp');
  const [problemId, setProblemId] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AssistantResponse | null>(null);
  const [analysis, setAnalysis] = useState<SolutionAnalysis | null>(null);
  const [error, setError] = useState('');

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    setLoading(true);
    setError('');
    setResponse(null);
    
    try {
      const response = await axios.post(
        `${URL}/ai/assistant/chat`,
        {
          message: message.trim(),
          context: {}
        },
        {
          headers: {
            Authorization: localStorage.getItem("token")
          }
        }
      );
      
      if (response.data.success) {
        setResponse(response.data.response);
      } else {
        setError(response.data.message || "Failed to get assistant response");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "An error occurred");
      console.error("Error getting assistant response:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    
    setLoading(true);
    setError('');
    setAnalysis(null);
    
    try {
      const response = await axios.post(
        `${URL}/ai/assistant/analyze-solution`,
        {
          code: code.trim(),
          language,
          problemId: problemId.trim() || null
        },
        {
          headers: {
            Authorization: localStorage.getItem("token")
          }
        }
      );
      
      if (response.data.success) {
        setAnalysis(response.data.analysis);
      } else {
        setError(response.data.message || "Failed to analyze solution");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "An error occurred");
      console.error("Error analyzing solution:", err);
    } finally {
      setLoading(false);
    }
  };

  const renderChatForm = () => (
    <form onSubmit={handleChatSubmit} className="mt-3">
      <div className="mb-4">
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
          Your Question
        </label>
        <textarea
          id="message"
          rows={4}
          className="w-full border rounded-lg p-2"
          placeholder="Ask anything about competitive programming, algorithms, or contest preparation..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
      </div>
      
      <button
        type="submit"
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        disabled={loading || !message.trim()}
      >
        {loading ? <SpinLoader /> : "Ask Assistant"}
      </button>
    </form>
  );

  const renderAnalyzeForm = () => (
    <form onSubmit={handleAnalyzeSubmit} className="mt-3">
      <div className="mb-4">
        <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
          Your Code
        </label>
        <textarea
          id="code"
          rows={8}
          className="w-full border rounded-lg p-2 font-mono text-sm"
          placeholder="Paste your solution code here..."
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
            Language
          </label>
          <select
            id="language"
            className="w-full border rounded-lg p-2"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="cpp">C++</option>
            <option value="java">Java</option>
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="csharp">C#</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="problemId" className="block text-sm font-medium text-gray-700 mb-1">
            Problem ID (Optional)
          </label>
          <input
            type="text"
            id="problemId"
            className="w-full border rounded-lg p-2"
            placeholder="e.g., 1500A"
            value={problemId}
            onChange={(e) => setProblemId(e.target.value)}
          />
        </div>
      </div>
      
      <button
        type="submit"
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        disabled={loading || !code.trim()}
      >
        {loading ? <SpinLoader /> : "Analyze Solution"}
      </button>
    </form>
  );

  const renderResponse = () => {
    if (error) {
      return (
        <div className="mt-4 p-3 border border-red-300 rounded-lg bg-red-50 text-red-800">
          {error}
        </div>
      );
    }
    
    if (mode === 'chat' && response) {
      return (
        <div className="mt-6 border-t pt-4">
          <h3 className="font-medium text-lg mb-3">Assistant Response</h3>
          
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <p className="whitespace-pre-line">{response.message}</p>
          </div>
          
          {response.relatedResources && response.relatedResources.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Related Resources</h4>
              <ul className="space-y-2">
                {response.relatedResources.map((resource, idx) => (
                  <li key={idx} className="border-l-4 border-blue-400 pl-3">
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {resource.title}
                    </a>
                    <p className="text-sm text-gray-600">{resource.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }
    
    if (mode === 'analyze' && analysis) {
      return (
        <div className="mt-6 border-t pt-4">
          <h3 className="font-medium text-lg mb-3">Solution Analysis</h3>
          
          <div className="mb-4">
            <h4 className="font-medium">Feedback</h4>
            <p className="bg-blue-50 rounded-lg p-3 mt-1">{analysis.feedback}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="font-medium">Time Complexity</h4>
              <p className="bg-gray-100 rounded-lg p-2 mt-1 font-mono">{analysis.timeComplexity}</p>
            </div>
            <div>
              <h4 className="font-medium">Space Complexity</h4>
              <p className="bg-gray-100 rounded-lg p-2 mt-1 font-mono">{analysis.spaceComplexity}</p>
            </div>
          </div>
          
          <div className="mb-4">
            <h4 className="font-medium">Optimizations</h4>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              {analysis.optimizations.map((opt, idx) => (
                <li key={idx}>{opt}</li>
              ))}
            </ul>
          </div>
          
          {analysis.alternativeApproaches && analysis.alternativeApproaches.length > 0 && (
            <div>
              <h4 className="font-medium">Alternative Approaches</h4>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                {analysis.alternativeApproaches.map((approach, idx) => (
                  <li key={idx}>{approach}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }
    
    return null;
  };

  return (
    <Card width="full">
      <div className="flex flex-col w-full">
        <Heading text="AI Coding Assistant" />
        
        <div className="flex flex-wrap gap-4 mt-2">
          <button
            className={`px-4 py-2 rounded-lg font-medium ${
              mode === 'chat'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            } transition-colors`}
            onClick={() => setMode('chat')}
          >
            Ask a Question
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium ${
              mode === 'analyze'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            } transition-colors`}
            onClick={() => setMode('analyze')}
          >
            Analyze My Solution
          </button>
        </div>
        
        <div className="mt-4">
          {mode === 'chat' ? renderChatForm() : renderAnalyzeForm()}
        </div>
        
        {renderResponse()}
      </div>
    </Card>
  );
};

export default CodeAssistant;