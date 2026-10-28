// Electron launcher for the ticker. Logs in to private ESPN fantasy leagues
// by attaching your ESPN cookies (from espn-login.json) to fantasy API requests.
const { app, BrowserWindow, screen, session } = require('electron');
const fs = require('fs');
const path = require('path');

const FANTASY_API = ['https://lm-api-reads.fantasy.espn.com/*'];

function loadEspnLogin() {
  try {
    const { espn_s2, swid } = JSON.parse(fs.readFileSync(path.join(__dirname, 'espn-login.json'), 'utf8'));
    return espn_s2 && swid ? `espn_s2=${espn_s2}; SWID=${swid}` : null;
  } catch (e) {
    return null;
  }
}

function setupEspnLogin() {
  const cookie = loadEspnLogin();
  if (!cookie) {
    console.warn('espn-login.json missing or incomplete: fantasy section only works for public leagues.');
    return;
  }

  session.defaultSession.webRequest.onBeforeSendHeaders({ urls: FANTASY_API }, (details, callback) => {
    callback({ requestHeaders: { ...details.requestHeaders, Cookie: cookie } });
  });

  // ESPN's fantasy API doesn't allow cross-origin reads from a local file, so allow it for this window
  session.defaultSession.webRequest.onHeadersReceived({ urls: FANTASY_API }, (details, callback) => {
    const headers = Object.fromEntries(Object.entries(details.responseHeaders || {})
      .filter(([k]) => k.toLowerCase() !== 'access-control-allow-origin'));
    callback({ responseHeaders: { ...headers, 'Access-Control-Allow-Origin': ['*'] } });
  });
}

function createWindow() {
  const { x, y, width } = screen.getPrimaryDisplay().workArea;
  const win = new BrowserWindow({
    x, y, width, height: 75,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  setupEspnLogin();
  createWindow();
});

app.on('window-all-closed', () => app.quit());
