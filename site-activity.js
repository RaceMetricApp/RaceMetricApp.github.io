/* Anonymous page activity: no cookies, persistent visitor IDs or account data. */
(() => {
  const optOutKey = 'racemetric-website-counting-off';
  let optedOut = false;
  try { optedOut = localStorage.getItem(optOutKey) === '1'; } catch { /* Storage may be blocked. */ }
  const privacySignal = navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true;
  const control = document.querySelector('[data-website-counting]');
  const status = document.querySelector('[data-website-counting-status]');
  function showPreference() {
    if (control) { control.textContent = optedOut ? 'Allow anonymous website counts' : 'Exclude this browser from website counts'; control.disabled = privacySignal; }
    if (status) status.textContent = privacySignal ? 'Counting is off because your browser sends a privacy preference.' : optedOut ? 'This browser is excluded from website counts.' : 'Anonymous website counting is enabled.';
  }
  const endpoint = 'https://racemetric-race-hub.racemetricapp.workers.dev/website/activity';
  const path = location.pathname === '/index.html' ? '/' : location.pathname;
  const supported = ['racemetric.co.uk', 'www.racemetric.co.uk'].includes(location.hostname) && ['/', '/privacy.html', '/support.html', '/terms.html'].includes(path);
  let id = crypto.randomUUID(), started = false, busy = false, lastActivity = Date.now(), createdAt = Date.now();
  async function send(event) {
    if (!supported || privacySignal || (optedOut && event !== 'leave')) return;
    try {
      const response = await fetch(endpoint, { method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer', keepalive: true, headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ id, path, event }) });
      if (response.ok && event === 'view') started = true;
    } catch { /* Counting must never interrupt the site. */ }
  }
  async function pulse() {
    if (busy || document.hidden || Date.now() - lastActivity > 300000 || optedOut || privacySignal) return;
    if (Date.now() - createdAt >= 86400000) { id = crypto.randomUUID(); started = false; createdAt = Date.now(); }
    busy = true;
    try { await send(started ? 'pulse' : 'view'); } finally { busy = false; }
  }
  control?.addEventListener('click', async () => {
    if (!optedOut && started) await send('leave');
    optedOut = !optedOut;
    try { localStorage.setItem(optOutKey, optedOut ? '1' : '0'); } catch { /* Preference lasts this page if storage is unavailable. */ }
    showPreference();
    if (!optedOut) { id = crypto.randomUUID(); started = false; lastActivity = Date.now(); pulse(); }
  });
  window.addEventListener('storage', event => {
    if (event.key !== optOutKey) return;
    optedOut = event.newValue === '1';
    if (optedOut && started) send('leave');
    showPreference();
    if (!optedOut) { lastActivity = Date.now(); pulse(); }
  });
  for (const event of ['pointerdown', 'keydown', 'scroll']) document.addEventListener(event, () => { lastActivity = Date.now(); }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (started) send('leave'); } else { lastActivity = Date.now(); pulse(); } });
  window.addEventListener('pagehide', () => { if (started) send('leave'); });
  window.addEventListener('pageshow', () => { lastActivity = Date.now(); pulse(); });
  showPreference();
  pulse();
  setInterval(pulse, 30000);
})();
