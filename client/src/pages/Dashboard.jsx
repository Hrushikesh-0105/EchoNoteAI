import { useState, useEffect, useCallback } from 'react';
import { useUser, useAuth } from "@clerk/clerk-react";
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock, Image } from 'lucide-react';
import { listSessions } from '../api/sessionsApi';
import SessionStatusBadge from '../components/SessionStatusBadge';
import DeleteSessionButton from '../components/DeleteSessionButton';
import { formatDuration, sessionDuration } from '../utils/formatTime';

function Dashboard() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [nextBefore, setNextBefore] = useState(null); // cursor for the next (older) page, null when there's none
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchSessions = useCallback(async (before) => {
    setLoading(true);
    try {
      const token = await getToken();
      const data = await listSessions(token, { before });
      setSessions((previous) => (before ? [...previous, ...data.sessions] : data.sessions));
      setNextBefore(data.nextBefore);
      setError(null);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError('Failed to load your sessions. Please try again later.');
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [getToken]);

  useEffect(() => {
    if (isSignedIn && user) {
      fetchSessions();
    }
  }, [isSignedIn, user, fetchSessions]);

  const handleSessionDeleted = (sessionId) => {
    setSessions((previous) => previous.filter((session) => session._id !== sessionId));
  };

  const handleSessionClick = (sessionId) => {
    navigate(`/summary/${sessionId}`);
  };

  if (!isLoaded || !isSignedIn) {
    return <div className="flex items-center justify-center min-h-screen font-heading font-bold text-text">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-noise">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-heading font-extrabold text-3xl text-text mb-8">Your Sessions</h1>

        {error && (
          <div className="card-brutal border-l-8 border-l-primary mb-6 px-4 py-3">
            <p className="font-heading font-bold text-text">{error}</p>
          </div>
        )}

        {loaded && sessions.length === 0 && !error ? (
          <div className="card-brutal text-center py-16">
            <p className="font-heading font-bold text-lg text-text">You don't have any sessions yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sessions.map((session, i) => (
              <div
                key={session._id}
                onClick={() => handleSessionClick(session._id)}
                className="card-brutal relative p-6 cursor-pointer transition-transform duration-300 hover:rotate-0 hover:shadow-brutal-lg"
                style={{ transform: `rotate(${i % 2 === 0 ? -1 : 1}deg)` }}
              >
                <div className="washi-tape bg-accent -top-3 left-8 rotate-[-4deg]" />
                <h3 className="font-heading font-bold text-lg text-text mb-2">{session.title}</h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text/60">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4" strokeWidth={2.5} />
                    {new Date(session.startedAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" strokeWidth={2.5} />
                    {formatDuration(sessionDuration(session))}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Image className="w-4 h-4" strokeWidth={2.5} />
                    {session.imageCount} screenshot{session.imageCount === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <SessionStatusBadge session={session} />
                  <div className="flex items-center gap-2">
                    <DeleteSessionButton session={session} onDeleted={handleSessionDeleted} compact />
                    <ArrowRight className="w-5 h-5 text-primary" strokeWidth={2.5} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {nextBefore && (
          <div className="mt-10 text-center">
            <button
              onClick={() => fetchSessions(nextBefore)}
              disabled={loading}
              className="btn-brutal bg-surface text-text px-6 py-2 rounded-pill font-heading font-bold"
            >
              {loading ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
