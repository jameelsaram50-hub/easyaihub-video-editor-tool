const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Tiny localhost-only HTTP server that streams media files from disk.
 *
 * Both the editor preview and Remotion's headless render browser load pages
 * over http(s), and Chromium refuses to load file:// media from those origins.
 * Serving files over http://127.0.0.1 with Range support lets videos seek in
 * the preview and lets OffthreadVideo read them during export, without turning
 * off webSecurity. A random per-launch token keeps other local pages out.
 */

const MIME_TYPES = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.aac': 'audio/aac',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

const token = crypto.randomBytes(16).toString('hex');
let baseUrl = null;

function handleRequest(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Accept-Ranges', 'bytes');

  if (url.pathname !== '/media' || url.searchParams.get('token') !== token) {
    res.writeHead(403).end();
    return;
  }

  const filePath = url.searchParams.get('path');
  if (!filePath || !path.isAbsolute(filePath)) {
    res.writeHead(400).end();
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404).end();
      return;
    }

    let contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    // Some pipeline placeholders are SVG documents saved with a .png name
    if (contentType.startsWith('image/') && stat.size < 5 * 1024 * 1024) {
      const head = Buffer.alloc(64);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, head, 0, 64, 0);
      fs.closeSync(fd);
      const start = head.toString('utf8').trimStart();
      if (start.startsWith('<svg') || start.startsWith('<?xml')) {
        contentType = 'image/svg+xml';
      }
    }
    const range = req.headers.range;

    if (range) {
      const match = /bytes=(\d*)-(\d*)/.exec(range);
      let start = match && match[1] ? parseInt(match[1], 10) : 0;
      let end = match && match[2] ? parseInt(match[2], 10) : stat.size - 1;
      if (match && !match[1] && match[2]) {
        // Suffix range: last N bytes
        start = Math.max(0, stat.size - parseInt(match[2], 10));
        end = stat.size - 1;
      }
      if (start >= stat.size || end >= stat.size || start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }).end();
        return;
      }
      res.writeHead(206, {
        'Content-Type': contentType,
        'Content-Length': end - start + 1,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': stat.size });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
}

function startMediaServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handleRequest);
    server.on('error', reject);
    // Port 0 = let the OS pick a free port
    server.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve(baseUrl);
    });
  });
}

function getMediaUrl(filePath) {
  if (!baseUrl) throw new Error('Media server has not started yet');
  return `${baseUrl}/media?token=${token}&path=${encodeURIComponent(filePath)}`;
}

module.exports = { startMediaServer, getMediaUrl };
