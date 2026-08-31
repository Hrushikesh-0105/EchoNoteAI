import { Link } from 'react-router-dom';
import { useAuth, UserButton } from "@clerk/clerk-react";
import { Mic } from 'lucide-react';

export default function Navbar() {
  const { isSignedIn } = useAuth();

  return (
    <nav className="bg-surface border-b-4 border-text">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          <Link to="/" className="flex items-center gap-2 font-heading font-extrabold text-2xl tracking-tight text-text">
            <Mic className="w-7 h-7" strokeWidth={2.5} />
            EchoNote
          </Link>
          <div className="flex items-center gap-4">
            {!isSignedIn ? (
              <>
                <Link to="/signin" className="px-4 py-2 font-heading font-bold text-text hover:text-primary transition-colors">
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="btn-brutal bg-primary text-text px-5 py-2 rounded-pill font-heading font-bold"
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/dashboard"
                  className="px-4 py-2 font-heading font-bold text-text hover:text-primary transition-colors"
                >
                  Dashboard
                </Link>
                <UserButton afterSignOutUrl="/" />
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
