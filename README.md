# m3u8-watcher-player

Petit projet pour:
- surveiller une page web pour détecter une URL `.m3u8`
- injecter cette URL dans un lecteur HLS (Hls.js)
- option de proxy local si CORS bloque la récupération de la page

## Fichiers
- `index.html` : interface et lecteur
- `app.js` : logique de détection, polling et injection
- `style.css` : styles simples
- `server.js` : proxy Node.js optionnel (utilise node-fetch). Ne pas exposer publiquement sans sécurisation.
- `README.md` : ce fichier

## Utilisation rapide
1. Ouvrez `index.html` dans un navigateur moderne.
2. Collez l'URL de la page à surveiller (ex: `https://www.freeshot.live/live-tv/cmtv/330`).
3. (Optionnel) Collez une URL m3u8 initiale.
4. Cliquez sur "Démarrer la surveillance".
5. Le script va interroger la page toutes les 15s et tenter d'extraire une URL `.m3u8`.
6. Si une URL changée est détectée elle sera injectée dans le player.

## CORS
Si `fetch` vers la page est bloqué par CORS, vous avez deux options:
- Lancer le proxy local fourni:
  - `npm init -y`
  - `npm install express node-fetch`
  - `node server.js`
  - Activez le proxy dans `app.js` en passant `useProxy = true`
- Récupérer l'HTML côté serveur et exposer une API sécurisée.

## Remarques de sécurité et légalité
Assurez-vous d'avoir le droit d'accéder et redistribuer les flux vidéo que vous utilisez.
Ce dépôt est fourni à titre d'outil technique. L'utilisation abusive de flux protégés n'est pas couverte.

