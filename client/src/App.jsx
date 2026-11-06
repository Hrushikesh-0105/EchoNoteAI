import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ClerkProvider, SignIn, SignUp, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import SummaryPage from './pages/SummaryPage';
import Navbar from './components/Navbar';
import SendTokenToExtension from './components/SendTokenToExtension';
import ClearTokenFromExtension from './components/ClearTokenFromExtension';
import SyncUserOnSignIn from './components/SyncUserOnSignIn';


const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Approximates the app's brutal/retro design system within Clerk's theming API.
const clerkAppearance = {
  variables: {
    colorPrimary: '#FF8C42',
    colorText: '#1A1A1A',
    colorBackground: '#FFFFFF',
    fontFamily: '"Space Grotesk", sans-serif',
    borderRadius: '12px',
  },
  elements: {
    card: 'border-4 border-text shadow-brutal rounded-chunky',
    headerTitle: 'font-heading font-extrabold',
    formButtonPrimary: 'btn-brutal font-heading font-bold normal-case',
  },
};

export default function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey} appearance={clerkAppearance}>
      <Router>
          <div className="app min-h-screen bg-noise">
            <Navbar />
            <SignedIn>
              <SendTokenToExtension />
              <SyncUserOnSignIn />
            </SignedIn>
            <SignedOut>
              <ClearTokenFromExtension />
            </SignedOut>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route
                path="/dashboard"
                element={
                  <>
                    <SignedIn>
                      <Dashboard />
                    </SignedIn>
                    <SignedOut>
                      <RedirectToSignIn />
                    </SignedOut>
                  </>
                }
              />
              <Route
                path="/summary/:sessionId"
                element={
                  <>
                    <SignedIn>
                      <SummaryPage />
                    </SignedIn>
                    <SignedOut>
                      <RedirectToSignIn />
                    </SignedOut>
                  </>
                }
              />
              <Route
                path="/signin/*"
                element={
                  <div className="flex items-center justify-center min-h-screen py-12">
                    <SignIn routing="path" path="/signin" />
                  </div>
                }
              />
              <Route
                path="/signup/*"
                element={
                  <div className="flex items-center justify-center min-h-screen py-12">
                    <SignUp routing="path" path="/signup" />
                  </div>
                }
              />
            </Routes>
          </div>
      </Router>
    </ClerkProvider>
  )
}

