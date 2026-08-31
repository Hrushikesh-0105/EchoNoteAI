import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useUser, useAuth } from "@clerk/clerk-react";
import { ArrowLeft, Copy, Printer } from 'lucide-react';
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
      <div className="min-h-screen bg-noise flex items-center justify-center">
        <p className="font-heading font-bold text-xl text-text animate-pulse">Generating your scrapbook...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-noise flex flex-col items-center justify-center gap-4">
        <div className="card-brutal border-l-8 border-l-primary px-4 py-3">
          <p className="font-heading font-bold text-text">{error}</p>
        </div>
        <Link to="/dashboard" className="font-heading font-bold text-primary hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-noise flex flex-col items-center justify-center gap-4">
        <div className="card-brutal px-4 py-3">
          <p className="font-heading font-bold text-text">No summary found for this session.</p>
        </div>
        <Link to="/dashboard" className="font-heading font-bold text-primary hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-noise py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-heading font-extrabold text-3xl text-text">{title || "Session Summary"}</h1>
          <Link to="/dashboard" className="flex items-center gap-1 font-heading font-bold text-text hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
            Back to Dashboard
          </Link>
        </div>

        <div className="card-brutal relative bg-note overflow-hidden">
          <div className="washi-tape bg-accent -top-3 left-12 rotate-[-4deg]" />

          <div className="border-b-4 border-text px-6 py-4">
            <p className="text-sm font-bold text-text/60">Session title: {title}</p>
          </div>

          <div className="px-6 py-8">
            <article className="prose prose-headings:font-heading max-w-none">
              <ReactMarkdown>{summary}</ReactMarkdown>
            </article>
            <TextToSpeech text={summary} />
          </div>

          <div className="border-t-4 border-text px-6 py-4 flex justify-between items-center">
            <button
              onClick={() => { navigator.clipboard.writeText(summary) }}
              className="flex items-center gap-2 font-heading font-bold text-text hover:text-primary transition-colors"
            >
              <Copy className="w-4 h-4" strokeWidth={2.5} />
              Copy to clipboard
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 font-heading font-bold text-text hover:text-primary transition-colors"
            >
              <Printer className="w-4 h-4" strokeWidth={2.5} />
              Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SummaryPage;
