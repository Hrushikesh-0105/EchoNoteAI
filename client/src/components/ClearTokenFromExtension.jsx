import { useEffect } from 'react';

const EXTENSION_ID = import.meta.env.VITE_EXTENSION_ID;

// While signed out, tells the extension to drop its stored token — otherwise a
// sign-out on the website leaves the extension holding a still-valid token (it's a
// self-contained, independently-signed JWT, not tied to the Clerk session) until it
// naturally expires. No-ops if the extension isn't installed.
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
