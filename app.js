// app.js - version debug / robuste
console.log('[m3u8-watcher] script loaded');

const pageInput = document.getElementById('pageUrl');
const m3u8Input = document.getElementById('m3u8Url');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const manualBtn = document.getElementById('manualInject');
const info = document.getElementById('info');
const video = document.getElementById('video');

let pollInterval = 15000;
let pollTimer = null;
let lastFound = null;
let useProxy = false;
let proxyPrefix = 'http://localhost:3000/fetch?url=';

let hls = null;

function setInfo(text) {
  info.textContent = text;
  console.log('[m3u8-watcher] ' + text);
}

function destroyHls() {
  if (hls) {
    try { hls.destroy(); } catch(e) { console.warn(e); }
    hls = null;
  }
}

async function setSource(url) {
  if (!url) {
    setInfo('URL vide fournie à setSource.');
    return;
  }
  setInfo('Tentative d\'injection: ' + url);
  destroyHls();

  // Si Safari/native HLS
  const native = video.canPlayType('application/vnd.apple.mpegurl') !== '';
  console.log('Native HLS support:', native);

  // Try native first only if present. Otherwise use Hls.js.
  if (native) {
    try {
      video.src = url;
      await video.play();
      setInfo('Lecture lancée (native).');
      return;
    } catch (err) {
      console.warn('Native play failed:', err);
      // fallback to Hls.js
    }
  }

  if (window.Hls && Hls.isSupported()) {
    hls = new Hls();
    hls.on(Hls.Events.ERROR, function(event, data) {
      console.error('Hls error', event, data);
      setInfo('Erreur Hls.js: ' + (data && data.type ? data.type + ' / ' + data.details : 'inconnue'));
    });
    try {
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, function() {
        video.play().then(()=> setInfo('Lecture lancée (Hls.js).')).catch(e => {
          console.warn('Play promise rejected:', e);
          setInfo('Flux chargé mais lecture bloquée par le navigateur (autoplay). Appuyez sur play.');
        });
      });
      return;
    } catch (err) {
      console.error('Hls load error', err);
      setInfo('Impossible de charger le flux via Hls.js: ' + err.message);
    }
  } else {
    setInfo('Hls.js non disponible et lecture native impossible.');
    console.warn('Hls.js absent ou non-supporté');
  }
}

// extraction simple d'URL .m3u8
function extractM3U8(html) {
  if (!html) return null;
  const r = /https?:\\/\\/[^'\"\\s>]+\\.m3u8[^'\"\\s>]*/ig;
  const found = html.match(r);
  return found && found.length ? found[0] : null;
}

async function fetchPage(url) {
  const fetchUrl = (useProxy ? proxyPrefix + encodeURIComponent(url) : url);
  setInfo('Fetch: ' + fetchUrl);
  const resp = await fetch(fetchUrl, { mode: 'cors' });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  return await resp.text();
}

async function pollOnce() {
  const pageUrl = pageInput.value.trim();
  if (!pageUrl) {
    setInfo('Aucune URL de page fournie.');
    return;
  }
  try {
    const html = await fetchPage(pageUrl);
    const found = extractM3U8(html);
    if (found && found !== lastFound) {
      lastFound = found;
      m3u8Input.value = found;
      await setSource(found);
      setInfo('URL détectée et injectée.');
    } else if (!found) {
      setInfo('Aucune URL .m3u8 trouvée.');
    } else {
      setInfo('Pas de changement d\'URL.');
    }
  } catch (err) {
    console.error('fetch error', err);
    setInfo('Fetch échoué: ' + err.message + '. Voir console pour détails. Si CORS, utilisez proxy.');
  }
}

function startPolling() {
  if (pollTimer) return;
  pollOnce();
  pollTimer = setInterval(pollOnce, pollInterval);
  startBtn.disabled = true;
  stopBtn.disabled = false;
  setInfo('Surveillance démarrée.');
}

function stopPolling() {
  if (!pollTimer) return;
  clearInterval(pollTimer);
  pollTimer = null;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  setInfo('Surveillance arrêtée.');
}

startBtn.addEventListener('click', startPolling);
stopBtn.addEventListener('click', stopPolling);

manualBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  const u = m3u8Input.value.trim();
  console.log('Manual inject clicked. URL=', u);
  if (!u) {
    setInfo('Champ m3u8 vide.');
    return;
  }
  lastFound = u;
  await setSource(u);
});

// permissive paste handler: si l'utilisateur colle une m3u8, injecte
m3u8Input.addEventListener('paste', (ev) => {
  setTimeout(()=> {
    const u = m3u8Input.value.trim();
    if (u && u.includes('.m3u8')) {
      console.log('Paste detected, auto-inject:', u);
      lastFound = u;
      setSource(u).catch(console.error);
    }
  }, 50);
});
