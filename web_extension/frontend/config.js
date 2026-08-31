// Central place for the URLs the extension talks to. Loaded as a plain script (via
// window.ECHO_CONFIG) so both classic scripts and ES modules in this extension can read
// it without an import. Swap these for the production origins before packaging a build.
window.ECHO_CONFIG = {
  API_BASE_URL: 'http://localhost:3000',
  WEBSITE_URL: 'http://localhost:5173/',
  SCREENSHOT_INTERVAL_MS: 5000
};
