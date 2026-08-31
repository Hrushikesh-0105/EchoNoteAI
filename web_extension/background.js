// Receives the extension-scoped auth token from the website (see externally_connectable
// in manifest.json) and stores it for the popup/dashboard to use on API calls.
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'ECHO_AUTH_TOKEN' || !message.token) {
    return;
  }

  chrome.storage.local.set({ authToken: message.token }, () => {
    sendResponse({ ok: true });
  });

  return true; // keep the message channel open for the async sendResponse
});
