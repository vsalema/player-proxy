// Script minimal pour surveiller une page, détecter une URL .m3u8 et l'injecter dans le player.
// Fonctionne côté client. Si la requête vers la page est bloquée pour des raisons de CORS,
// utilisez le serveur-proxy fourni dans server.js (exécutez-le localement).

const pageInput = document.getElementById('pageUrl');
const m3u8Input = document.getElementById('m3u8Url');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const manualBtn = document.getElementById('manualInject');
const info = document.getElementById('info');
const video = document.getElementById('video');

let pollInterval = 15000; // ms
let pollTimer = null;
let lastFound = null;
let useProxy = false; // passez à true si vous utilisez server.js (proxy local)
let proxyPrefix = 'http://localhost:3000/fetch?url='; // si vous lancez server.js

// Initialise Hls.js player if nécessaire
let hls = null;
function setSource(url) {
  if (!url) return;
  info.textContent = 'Injection: ' + url;
  // Si le navigateur supporte HLS natif (Safari), on peut simplement assigner
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url;
    video.play().catch(()=>{});
    return;
  }
  if (hls) {
    hls.destroy();
    hls = null;
  }
  if (Hls.isSupported()) {
    hls = new Hls();
    hls.loadSource(url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, function() {
      video.play().catch(()=>{});
    });
  } else {
    info.textContent = 'HLS non supporté dans ce navigateur.';
  }
}

// Extraction d'une URL .m3u8 depuis le HTML récupéré
function extractM3U8(html) {
  // Cherche des URLs contenant .m3u8 ou des formes avec token
  const urlRegex = /https?:\\/\\/[^'"\s>]+\.m3u8[^'"\s>]*/ig;
  const urlRegex2 = /https?:\/\/[^'"\s>]+\.m3u8[^'"\s>]*/ig;
  let m;
  let candidates = [];
  while ((m = urlRegex2.exec(html)) !== null) {
    candidates.push(m[0]);
  }
  if (candidates.length === 0) {
    // fallback: chercher des fragments fmp4, .mp4.m3u8 etc
    const alt = html.match(/https?:\/\/[^'"\s>]+\.fmp4\.[^'"\s>]*/ig);
    if (alt) candidates = candidates.concat(alt);
  }
  return candidates.length ? candidates[0] : null;
}

async function fetchPage(url) {
  try {
    const fetchUrl = (useProxy ? proxyPrefix + encodeURIComponent(url) : url);
    const resp = await fetch(fetchUrl, { mode: 'cors' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const text = await resp.text();
    return text;
  } catch (err) {
    throw err;
  }
}

async function pollOnce() {
  const pageUrl = pageInput.value.trim();
  if (!pageUrl) {
    info.textContent = 'Veuillez saisir l'URL de la page à surveiller.';
    return;
  }
  try {
    info.textContent = 'Récupération de la page...';
    const html = await fetchPage(pageUrl);
    const found = extractM3U8(html);
    if (found && found !== lastFound) {
      lastFound = found;
      m3u8Input.value = found;
      setSource(found);
      info.textContent = 'URL détectée et injectée.';
    } else if (!found) {
      info.textContent = 'Aucune URL .m3u8 détectée sur la page.';
    } else {
      info.textContent = 'Pas de changement d'URL.';
    }
  } catch (err) {
    info.textContent = 'Erreur fetch: ' + err.message + '. Si CORS bloque la requête, lancez le proxy local décrit dans README.';
  }
}

function startPolling() {
  if (pollTimer) return;
  pollOnce();
  pollTimer = setInterval(pollOnce, pollInterval);
  startBtn.disabled = true;
  stopBtn.disabled = false;
  info.textContent = 'Surveillance démarrée.';
}

function stopPolling() {
  if (!pollTimer) return;
  clearInterval(pollTimer);
  pollTimer = null;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  info.textContent = 'Surveillance arrêtée.';
}

startBtn.addEventListener('click', startPolling);
stopBtn.addEventListener('click', stopPolling);
manualBtn.addEventListener('click', () => {
  const u = m3u8Input.value.trim();
  if (u) {
    lastFound = u;
    setSource(u);
  } else {
    info.textContent = 'Rien à injecter.';
  }
});

// Si l'utilisateur colle une URL m3u8 directement, on l'injecte automatiquement
m3u8Input.addEventListener('change', () => {
  const u = m3u8Input.value.trim();
  if (u) {
    lastFound = u;
    setSource(u);
  }
});

// Permet d'ajuster le pollInterval si besoin via console:
// window.pollInterval = 10000;
