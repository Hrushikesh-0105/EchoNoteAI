document.getElementById('signinButton').addEventListener('click', () => {
  chrome.tabs.create({ url: window.ECHO_CONFIG.WEBSITE_URL });
});

// React to storage changes instead of polling, since we don't control which tab the user signed in from
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.authToken?.newValue) {
    window.location.href = '../dashBoard/dashBoard.html';
  }
});
