import { useEffect } from 'react';

const EXTENSION_ID = import.meta.env.VITE_EXTENSION_ID;

// Tells the extension to drop its token on sign-out, since the JWT itself can't be revoked server-side
function ClearTokenFromExtension() {
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
    if (!EXTENSION_ID || EXTENSION_ID.startsWith('REPLACE_ME')) return;

    chrome.runtime.sendMessage(EXTENSION_ID, { type: 'ECHO_SIGN_OUT' }, () => {
      if (chrome.runtime.lastError) {
        console.log('Extension not reachable:', chrome.runtime.lastError.message);
      }
    });
  }, []);

  return null;
}

export default ClearTokenFromExtension;
