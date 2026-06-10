const express = require('express');
const { createServer } = require('http');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;

const app = next({ dev, dir: './client' });
const handle = app.getRequestHandler();

(async () => {
  try {
    const { createApp } = require('./server/dist/index');
    const apiApp = await createApp();

    await app.prepare();

    const server = createServer((req, res) => {
      if (req.url.startsWith('/api')) {
        return apiApp(req, res);
      }
      return handle(req, res);
    });

    server.listen(port, () => {
      console.log(`> Ready on http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
