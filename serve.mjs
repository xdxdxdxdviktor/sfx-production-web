#!/usr/bin/env node
/* Local preview of ./github-pages (behaves like GitHub Pages: directory → index.html, unknown → 404.html). */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), 'github-pages');
const PORT = Number(process.env.PORT || 4173);
const TYPES = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json',
  '.xml':'application/xml','.txt':'text/plain; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp4':'video/mp4','.woff2':'font/woff2','.svg':'image/svg+xml'};

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(ROOT, p);
  if(!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if(fs.existsSync(f) && fs.statSync(f).isDirectory()){
    if(!p.endsWith('/')){ res.writeHead(301, {Location: p + '/'}); return res.end(); }
    f = path.join(f, 'index.html');
  }
  let status = 200;
  if(!fs.existsSync(f)){ f = path.join(ROOT, '404.html'); status = 404; }
  const stat = fs.statSync(f), type = TYPES[path.extname(f)] || 'application/octet-stream';
  const range = req.headers.range;
  if(range && type === 'video/mp4'){
    const [a, b] = range.replace('bytes=','').split('-'); const start = +a, end = b ? +b : stat.size - 1;
    res.writeHead(206, {'Content-Type':type, 'Content-Range':`bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges':'bytes', 'Content-Length':end-start+1});
    return fs.createReadStream(f, {start, end}).pipe(res);
  }
  res.writeHead(status, {'Content-Type':type, 'Content-Length':stat.size, 'Cache-Control':'no-cache'});
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log(`SFX preview: http://localhost:${PORT}/`));
