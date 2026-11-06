import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from "@clerk/clerk-react";
import { ArrowLeft, CalendarDays, Clock, Copy, Image, Loader2, Printer, RotateCcw } from 'lucide-react';
import TextToSpeech from '../components/TTS';
import SummaryMarkdown from '../components/SummaryMarkdown';
import IntervalTimeline from '../components/IntervalTimeline';
import ScreenshotGallery from '../components/ScreenshotGallery';
import DeleteSessionButton from '../components/DeleteSessionButton';
import { getSession } from '../api/sessionsApi';
import { useSummary } from '../hooks/useSummary';
import { toCopyText } from '../utils/equations';
import { formatDuration, sessionDuration } from '../utils/formatTime';

const TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'screenshots', label: 'Screenshots' },
];

const FAILURE_MESSAGES = {
  no_text: "No readable text was found in this session's screenshots, so there is nothing to summarize.",
  generation_failed: 'Something went wrong while generating the summary.',
  queue_unavailable: "The summary couldn't be started.",
};

// Shown in the Summary and Timeline tabs until the summary is ready
function SummaryStatusPanel({ summary }) {
  const { state, imageCounts, reason, error, retry, reload } = summary;

  if (error) {
    return (
      <div className="card-brutal border-l-8 border-l-primary p-6">
        <p className="font-heading font-bold text-text">Failed to load the summary. Please try again.</p>
        <button onClick={reload} className="mt-4 btn-brutal flex items-center gap-2 bg-surface text-text px-4 py-2 rounded-pill font-heading font-bold">
          <RotateCcw className="w-4 h-4" strokeWidth={2.5} />
          Try again
        </button>
      </div>
    );
  }

  if (state === 'failed') {
    return (
      <div className="card-brutal border-l-8 border-l-primary p-6">
        <p className="font-heading font-bold text-text">{FAILURE_MESSAGES[reason] || "The summary couldn't be generated."}</p>
        {reason !== 'no_text' && (
          <button onClick={retry} className="mt-4 btn-brutal flex items-center gap-2 bg-accent text-surface px-4 py-2 rounded-pill font-heading font-bold">
            <RotateCcw className="w-4 h-4" strokeWidth={2.5} />
            Retry
          </button>
        )}
      </div>
    );
  }

  if (state === 'recording') {
    return (
      <div className="card-brutal p-6">
        <p className="font-heading font-bold text-text">Recording in progress.</p>
        <p className="mt-1 text-text/70">The summary will be ready after the recording stops.</p>
      </div>
    );
  }

  if (state === 'processing' && imageCounts) {
    const done = imageCounts.completed + imageCounts.failed;
    const percent = imageCounts.total ? Math.round((done / imageCounts.total) * 100) : 0;
    return (
      <div className="card-brutal p-6">
        <p className="font-heading font-bold text-text">Reading the screenshots… {done} of {imageCounts.total}</p>
        <div className="mt-4 h-4 rounded-pill border-2 border-text bg-muted overflow-hidden">
          <div className="h-full bg-accent transition-all duration-500" style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="card-brutal p-6 flex items-center gap-3">
      <Loader2 className="w-5 h-5 animate-spin text-primary" strokeWidth={2.5} />
      <p className="font-heading font-bold text-text">
        {state === 'generating' ? 'Generating your summary…' : 'Loading…'}
      </p>
    </div>
  );
}

function SummaryPage() {
  const { sessionId } = useParams();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const summary = useSummary(sessionId);
  const [session, setSession] = useState(null);
  const [sessionError, setSessionError] = useState(null);
  const [tab, setTab] = useState('summary');
  const [copied, setCopied] = useState(false);

  // Session details for the header (refreshed as the summary progresses, e.g. once the recording ends)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const data = await getSession(token, sessionId);
        if (!cancelled) setSession(data.session);
      } catch (err) {
        console.error('Error fetching session:', err);
        if (!cancelled) setSessionError('This session could not be found.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken, sessionId, summary.state]);

  if (sessionError) {
    return (
      <div className="min-h-screen bg-noise flex flex-col items-center justify-center gap-4">
        <div className="card-brutal border-l-8 border-l-primary px-4 py-3">
          <p className="font-heading font-bold text-text">{sessionError}</p>
        </div>
        <Link to="/dashboard" className="font-heading font-bold text-primary hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isReady = summary.state === 'completed';
  const equations = summary.equations || [];
  const title = session?.title || summary.title || 'Session Summary';
  const screenshotCount = summary.imageCounts?.total ?? session?.imageCounts?.total;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(toCopyText(summary.completeSummary, equations));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-noise py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div>
            <h1 className="font-heading font-extrabold text-3xl text-text">{title}</h1>
            {session && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text/60">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4" strokeWidth={2.5} />
                  {new Date(session.startedAt).toLocaleString()}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" strokeWidth={2.5} />
                  {formatDuration(sessionDuration(session))}
                </span>
                {screenshotCount !== undefined && (
                  <span className="flex items-center gap-1.5">
                    <Image className="w-4 h-4" strokeWidth={2.5} />
                    {screenshotCount} screenshot{screenshotCount === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-6 print:hidden">
            {session && (
              <DeleteSessionButton session={session} onDeleted={() => navigate('/dashboard', { replace: true })} />
            )}
            <Link to="/dashboard" className="flex items-center gap-1 font-heading font-bold text-text hover:text-primary transition-colors">
              <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
              Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="flex gap-2 mb-6 print:hidden" role="tablist">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`btn-brutal px-4 py-2 rounded-pill font-heading font-bold ${tab === id ? 'bg-primary text-text' : 'bg-surface text-text'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'summary' && (
          isReady ? (
            <div className="card-brutal relative bg-note overflow-hidden">
              <div className="washi-tape bg-accent -top-3 left-12 rotate-[-4deg]" />
              <div className="px-6 py-8">
                <SummaryMarkdown text={summary.completeSummary} equations={equations} />
                <div className="print:hidden">
                  <TextToSpeech text={summary.completeSummary} equations={equations} />
                </div>
              </div>
              <div className="border-t-4 border-text px-6 py-4 flex justify-between items-center print:hidden">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 font-heading font-bold text-text hover:text-primary transition-colors"
                >
                  <Copy className="w-4 h-4" strokeWidth={2.5} />
                  {copied ? 'Copied!' : 'Copy to clipboard'}
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
          ) : <SummaryStatusPanel summary={summary} />
        )}

        {tab === 'timeline' && (
          isReady && session ? (
            <IntervalTimeline intervals={summary.intervalSummaries || []} equations={equations} startedAt={session.startedAt} />
          ) : <SummaryStatusPanel summary={summary} />
        )}

        {tab === 'screenshots' && session && (
          <ScreenshotGallery sessionId={sessionId} startedAt={session.startedAt} />
        )}
      </div>
    </div>
  );
}

export default SummaryPage;
