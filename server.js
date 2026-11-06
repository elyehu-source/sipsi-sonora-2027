const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, 'http://localhost:3000');

  // API endpoints para persistencia en disco duro de cursos y configuración
  if (reqUrl.pathname === '/api/guardar-cursos' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const cursos = Array.isArray(payload) ? payload : (payload.cursosList || []);
        const filePath = path.resolve(process.cwd(), 'cursos_exportados.json');
        fs.writeFileSync(filePath, JSON.stringify(cursos, null, 2), 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, count: cursos.length }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  if (reqUrl.pathname === '/api/cargar-cursos' && req.method === 'GET') {
    try {
      const filePath = path.resolve(process.cwd(), 'cursos_exportados.json');
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store, no-cache' });
        res.end(data);
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end('[]');
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  let pathname = decodeURIComponent(reqUrl.pathname).replace(/^\/+/, '');

  if (pathname === '' || pathname === '/') {
    pathname = 'index.html';
  }

  const filePath = path.resolve(process.cwd(), pathname);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const indexPath = path.resolve(process.cwd(), 'index.html');
      fs.readFile(indexPath, (errIndex, dataIndex) => {
        if (errIndex) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        });
        res.end(dataIndex);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const headers = {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    };

    if (ext === '.xlsx') {
      headers['Content-Disposition'] = `attachment; filename="${path.basename(filePath)}"`;
    }

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      } else {
        res.writeHead(200, headers);
        res.end(data);
      }
    });
  });
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
