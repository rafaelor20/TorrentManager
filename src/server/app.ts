import express, { Express } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { TorrentClient } from '../domain/client/TorrentClient.js';
import { createRouter } from './routes.js';

export function createApp(torrentClient: TorrentClient): Express {
  const app = express();

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  // Caminho da pasta public (funciona tanto em desenvolvimento tsx quanto em dist compilado)
  const publicPath = path.resolve(__dirname, '../../public');

  // Middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(publicPath));

  // Rotas da API
  app.use('/api', createRouter(torrentClient));

  // Fallback SPA / Interface Web
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });

  return app;
}
