// Version corrigée: regex en littéraux, écouteurs branchés, logs clairs.
(function(){
  console.log('[m3u8-watcher] init');
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

  // Force muted pour faciliter le démarrage de la lecture
  video.muted = true;

  function setInfo(t){ info.textContent = t; console.log('[m3u8-watcher]', t); }

  // HLS
  let hls = null;
  function destroyHls(){ if(hls){ try{ hls.destroy(); }catch(e){} hls = null; } }

  async function setSource(url){
    if(!url){ setInfo('URL m3u8 manquante.'); return; }
    setInfo('Injection: ' + url);
    destroyHls();

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
      hls.on(Hls.Events.ERROR, (evt, data)=>{
        console.error('Hls error', data);
        setInfo('Erreur Hls.js: ' + (data && data.details || 'inconnue'));
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, ()=>{
        video.play().then(()=> setInfo('Lecture Hls.js démarrée.')).catch(e=>{
          setInfo('Flux chargé. Appuyez sur Play.');
        });
      });
    }else{
      setInfo('Hls.js non supporté et lecture native indisponible.');
    }
  }

  // Extraction d'une URL .m3u8 dans du HTML
  function extractM3U8(html){
    if(!html) return null;
    // Littéraux regex sans échappements JS inutiles
    const r1 = /https?:\/\/[\w\-._~:/?#\[\]@!$&'()*+,;=%]+\.m3u8[^'"\s<>]*/ig;
    const match = html.match(r1);
    if(match && match.length) return match[0];
    // variantes: .mp4.m3u8 ou .fmp4.*
    const r2 = /https?:\/\/[\w\-._~:/?#\[\]@!$&'()*+,;=%]+\.fmp4[^'"\s<>]*/ig;
    const alt = html.match(r2);
    return alt && alt.length ? alt[0] : null;
  }

  async function fetchText(url){
    // Simple fetch. Selon l'origine, l'accès au HTML peut être restreint par le serveur distant.
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

  // Brancher les boutons
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

  // Auto-injection à la saisie
  m3u8Input.addEventListener('change', ()=>{
    const u = m3u8Input.value.trim();
    if(u) setSource(u);
  });
})();