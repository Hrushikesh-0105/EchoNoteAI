// Receives the extension-scoped auth token from the website (see externally_connectable
// in manifest.json) and stores it for the popup/dashboard to use on API calls. Also
// receives a sign-out signal so a logout on the website doesn't leave a stale,
// still-valid token sitting in the extension.
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message?.type === 'ECHO_AUTH_TOKEN' && message.token) {
    chrome.storage.local.set({ authToken: message.token }, () => sendResponse({ ok: true }));
    return true; // keep the message channel open for the async sendResponse
  }

  if (message?.type === 'ECHO_SIGN_OUT') {
    chrome.storage.local.remove('authToken', () => sendResponse({ ok: true }));
    return true;
  }
});
