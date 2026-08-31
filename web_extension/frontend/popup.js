document.addEventListener('DOMContentLoaded', async () => {
  const { authToken } = await chrome.storage.local.get('authToken');

  if (authToken) {
    window.location.href = 'dashBoard/dashBoard.html';
  } else {
    window.location.href = 'Authentication/signin.html';
  }
});
