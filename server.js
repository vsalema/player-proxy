// server.js - simple proxy to fetch remote pages to avoid CORS issues.
// Usage: node server.js
// Endpoint: /fetch?url=<encodedURL>
// WARNING: this is a development helper. Do not expose to public without restrictions.

const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = 3000;

app.get('/fetch', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('missing url');
  try {
    const r = await fetch(url, { timeout: 10000, headers: { 'User-Agent': 'm3u8-watcher/1.0' }});
    const text = await r.text();
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(text);
  } catch (err) {
    res.status(500).send('fetch error: ' + err.message);
  }
});

app.listen(PORT, () => console.log('Proxy running on http://localhost:' + PORT));
