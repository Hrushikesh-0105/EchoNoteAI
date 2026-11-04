// Receives the extension-scoped auth token from the website (externally_connectable) and stores/clears it
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
