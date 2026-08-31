document.getElementById('signinButton').addEventListener('click', () => {
  chrome.tabs.create({ url: window.ECHO_CONFIG.WEBSITE_URL });
});

// The website hands the extension its token via externally_connectable messaging
// (see background.js) once the user signs in, from whichever tab they did it in — so
// react to storage instead of polling a tab we don't control.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.authToken?.newValue) {
    window.location.href = '../dashBoard/dashBoard.html';
  }
});
