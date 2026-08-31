import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { requestExtensionToken } from '../api/authApi';

const EXTENSION_ID = import.meta.env.VITE_EXTENSION_ID;

// While signed in, mints a short-lived extension-scoped token and hands it to the
// browser extension via externally_connectable messaging. No-ops if the extension
// isn't installed or the browser doesn't support chrome.runtime (e.g. non-Chrome).
function SendTokenToExtension() {
  const { isSignedIn, getToken } = useAuth();

  useEffect(() => {
    if (!isSignedIn) return;
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
    if (!EXTENSION_ID || EXTENSION_ID.startsWith('REPLACE_ME')) return;

    async function sendToken() {
      try {
        const clerkToken = await getToken();
        const { token } = await requestExtensionToken(clerkToken);

        chrome.runtime.sendMessage(
          EXTENSION_ID,
          { type: 'ECHO_AUTH_TOKEN', token },
          () => {
            if (chrome.runtime.lastError) {
              console.log('Extension not reachable:', chrome.runtime.lastError.message);
            }
          }
        );
      } catch (error) {
        console.error('Failed to hand token to extension:', error);
      }
    }

    sendToken();
  }, [isSignedIn, getToken]);

  return null;
}

export default SendTokenToExtension;
