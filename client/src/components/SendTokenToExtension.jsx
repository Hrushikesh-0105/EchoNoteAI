import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { requestExtensionToken } from '../api/authApi';

const EXTENSION_ID = import.meta.env.VITE_EXTENSION_ID;

// Hands the extension a scoped auth token via externally_connectable messaging; no-ops if not installed
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
