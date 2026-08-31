import { useState, useEffect, useCallback } from 'react';
import { useUser, useAuth } from "@clerk/clerk-react";
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { listSessions } from '../api/sessionsApi';

function Dashboard() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchSessions = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await listSessions(token);
      setSessions(data.sessions);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError('Failed to load your sessions. Please try again later.');
    }
  }, [getToken]);

  useEffect(() => {
    if (isSignedIn && user) {
      fetchSessions();
    }
  }, [isSignedIn, user, fetchSessions]);

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

        {sessions.length === 0 ? (
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
                <p className="flex items-center gap-1.5 text-sm text-text/60">
                  <CalendarDays className="w-4 h-4" strokeWidth={2.5} />
                  {new Date(session.date).toLocaleDateString()}
                </p>
                <div className="mt-4 flex justify-between items-center">
                  <span
                    className={`px-3 py-1 text-xs font-bold rounded-pill border-2 border-text ${session.summarized ? 'bg-accent text-surface' : 'bg-muted text-text'}`}
                  >
                    {session.summarized ? 'Ready' : 'Processing'}
                  </span>
                  <ArrowRight className="w-5 h-5 text-primary" strokeWidth={2.5} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
