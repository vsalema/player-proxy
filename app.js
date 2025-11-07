// ultra-fix: DOMContentLoaded + regex simple sans séquences d'échappement douteuses
document.addEventListener('DOMContentLoaded', () => {
  console.log('[m3u8-watcher v3] ready');

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

  function setInfo(t){ info.textContent = t; console.log('[m3u8-watcher]', t); }

  let hls = null;
  function destroyHls(){ if(hls){ try{ hls.destroy(); }catch(e){} hls = null; } }

  async function setSource(url){
    if(!url){ setInfo('URL m3u8 manquante.'); return; }
    setInfo('Injection: ' + url);
    destroyHls();
    video.muted = true;

    const native = !!video.canPlayType && video.canPlayType('application/vnd.apple.mpegurl') !== '';
    if(native){
      try{
        video.src = url;
        await video.play();
        setInfo('Lecture native démarrée.');
        return;
      }catch(e){
        console.warn('Native failed, fallback Hls.js', e);
      }
    }
    if(window.Hls && Hls.isSupported()){
      hls = new Hls();
      hls.on(Hls.Events.ERROR, (_, data)=>{
        console.error('Hls error', data);
        setInfo('Erreur Hls.js: ' + (data && data.details || 'inconnue'));
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, ()=>{
        video.play().then(()=> setInfo('Lecture Hls.js démarrée.')).catch(()=> setInfo('Flux chargé. Appuyez sur Play.'));
      });
    }else{
      setInfo('Hls.js non supporté et lecture native indisponible.');
    }
  }

  // Regex simple, pas de \w, pas de classes compliquées
  const reM3U8 = /https?:\/\/[^'"\s<>]+\.m3u8[^'"\s<>]*/i;
  const reAlt = /https?:\/\/[^'"\s<>]+\.fmp4[^'"\s<>]*/i;

  function extractM3U8(html){
    if(!html) return null;
    const m = html.match(reM3U8);
    if(m) return m[0];
    const a = html.match(reAlt);
    return a ? a[0] : null;
  }

  async function fetchText(url){
    const resp = await fetch(url);
    if(!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.text();
  }

  async function pollOnce(){
    const pageUrl = pageInput.value.trim();
    if(!pageUrl){ setInfo('Saisir URL de page.'); return; }
    try{
      setInfo('Récupération de la page…');
      const html = await fetchText(pageUrl);
      const found = extractM3U8(html);
      if(found && found !== lastFound){
        lastFound = found;
        m3u8Input.value = found;
        await setSource(found);
        setInfo('URL détectée et injectée.');
      }else if(!found){
        setInfo('Aucune URL .m3u8 trouvée.');
      }else{
        setInfo('Pas de changement d’URL.');
      }
    }catch(e){
      console.error(e);
      setInfo('Récupération impossible: ' + e.message);
    }
  }

  function startPolling(){
    if(pollTimer) return;
    pollOnce();
    pollTimer = setInterval(pollOnce, pollInterval);
    startBtn.disabled = true;
    stopBtn.disabled = false;
    setInfo('Surveillance démarrée.');
  }
  function stopPolling(){
    if(!pollTimer) return;
    clearInterval(pollTimer);
    pollTimer = null;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    setInfo('Surveillance arrêtée.');
  }

  startBtn.addEventListener('click', (e)=>{ e.preventDefault(); startPolling(); });
  stopBtn.addEventListener('click', (e)=>{ e.preventDefault(); stopPolling(); });
  manualBtn.addEventListener('click', async (e)=>{
    e.preventDefault();
    const u = m3u8Input.value.trim();
    console.log('Manual inject:', u);
    if(!u){ setInfo('Champ m3u8 vide.'); return; }
    lastFound = u;
    await setSource(u);
  });

  m3u8Input.addEventListener('change', ()=>{
    const u = m3u8Input.value.trim();
    if(u) setSource(u);
  });
});
