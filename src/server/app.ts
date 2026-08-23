import express, { Express } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TorrentClient } from '../domain/client/TorrentClient.js';
import { createRouter } from './routes.js';

export function createApp(torrentClient: TorrentClient): Express {
  const app = express();

  // Resolução resiliente da pasta public para execução normal, compilada ou em binário .exe
  let publicPath = path.resolve(process.cwd(), 'public');

  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const candidatePaths = [
      path.resolve(process.cwd(), 'public'),
      path.resolve(__dirname, '../../public'),
      path.resolve(__dirname, '../public'),
      path.resolve(__dirname, './public'),
      path.resolve(path.dirname(process.execPath), 'public'),
    ];

    for (const candidate of candidatePaths) {
      if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'index.html'))) {
        publicPath = candidate;
        break;
      }
    }
  } catch {
    publicPath = path.resolve(process.cwd(), 'public');
  }

  // Middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(publicPath));

  // Rotas da API
  app.use('/api', createRouter(torrentClient));

  // Rota explícita para favicon.ico (evita que o fallback SPA sirva HTML para requisições de ícone no Windows)
  app.get('/favicon.ico', (_req, res) => {
    const icoPath = path.join(publicPath, 'favicon.ico');
    if (fs.existsSync(icoPath)) {
      res.setHeader('Content-Type', 'image/x-icon');
      res.sendFile(icoPath);
    } else {
      res.status(204).end();
    }
  });

  // Fallback SPA / Interface Web
  app.get('*', (_req, res) => {
    const indexPath = path.join(publicPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Interface Web (public/index.html) não encontrada.');
    }
  });

  return app;
}

