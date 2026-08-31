import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useUser, useAuth } from "@clerk/clerk-react";
import TextToSpeech from '../components/TTS';
import ReactMarkdown from 'react-markdown';
import { getSessionSummary } from '../api/sessionsApi';

function SummaryPage() {
  const { sessionId } = useParams();
  const { user } = useUser();
  const { getToken } = useAuth();
  const [summary, setSummary] = useState(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async () => {
    if (!sessionId || !user) return;

    try {
      setLoading(true);
      const token = await getToken();
      const data = await getSessionSummary(token, sessionId);
      setSummary(data.summary);
      setTitle(data.title);
    } catch (err) {
      console.error("Error fetching summary:", err);
      setError("Failed to load the summary. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [sessionId, user, getToken]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
        <Link to="/dashboard" className="mt-4 text-blue-500 hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p>No summary found for this session.</p>
        </div>
        <Link to="/dashboard" className="mt-4 text-blue-500 hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{summary.title || "Session Summary"}</h1>
          <Link to="/dashboard" className="text-blue-500 hover:text-blue-700 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
        
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <p className="text-sm text-gray-500">
              Session title: {title}
            </p>
          </div>
          
          <div className="px-6 py-8">
            <article className="prose prose-blue lg:prose-lg max-w-none">
              <ReactMarkdown>{summary}</ReactMarkdown>
              <TextToSpeech text={summary}/>
            </article>
          </div>
          
          <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
            <button 
              onClick={() => {navigator.clipboard.writeText(summary)}}
              className="text-blue-500 hover:text-blue-700 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
              Copy to clipboard
            </button>
            <button 
              onClick={() => window.print()}
              className="text-blue-500 hover:text-blue-700 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
              </svg>
              Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SummaryPage;
