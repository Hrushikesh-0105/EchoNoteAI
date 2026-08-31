import { useState, useEffect, useCallback } from 'react';
import { useUser, useAuth } from "@clerk/clerk-react";
import { useNavigate } from 'react-router-dom';
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
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Sessions</h1>

      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg">You don't have any sessions yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <div
              key={session._id}
              onClick={() => handleSessionClick(session._id)}
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-100"
            >
              <h3 className="text-lg font-semibold mb-2">{session.title}</h3>
              <p className="text-gray-500 text-sm">
                {new Date(session.date).toLocaleDateString()}
              </p>
              <div className="mt-4 flex justify-between items-center">
                <span className={`px-2 py-1 text-xs rounded-full ${session.summarized ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {session.summarized ? 'Ready' : 'Processing'}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
