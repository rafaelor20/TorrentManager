import { Router, Request, Response } from 'express';
import { TorrentClient } from '../domain/client/TorrentClient.js';
import { TorrentClientFactory } from '../infra/clients/TorrentClientFactory.js';
import { TorrentClientConfig } from '../domain/models/TorrentClientConfig.js';

export function createRouter(torrentClient: TorrentClient): Router {
  const router = Router();

  // Endpoint de status geral da aplicação
  router.get('/status', (_req: Request, res: Response) => {
    res.json({
      status: 'online',
      mensagem: 'Aplicação iniciada com sucesso',
      versao: '1.0.0',
      clienteAtivo: torrentClient.obterNome(),
      statusConexao: torrentClient.obterStatusConexao(),
      clientesSuportados: TorrentClientFactory.obterClientesSuportados(),
      timestamp: new Date().toISOString(),
    });
  });

  // Endpoint para testar conexão com o cliente BitTorrent
  router.post('/client/connect', async (req: Request, res: Response) => {
    try {
      const config: Partial<TorrentClientConfig> = req.body || {};
      const sucesso = await torrentClient.conectar(config as TorrentClientConfig);
      const status = torrentClient.obterStatusConexao();

      res.json({
        sucesso,
        status,
        mensagem: sucesso
          ? `Conectado com sucesso ao ${torrentClient.obterNome()}`
          : `Não foi possível conectar ao ${torrentClient.obterNome()}`,
      });
    } catch (err: any) {
      res.status(500).json({
        sucesso: false,
        erro: err?.message || 'Erro interno ao conectar',
      });
    }
  });

  // Endpoint para listar torrents (usando a interface de abstração)
  router.get('/torrents', async (_req: Request, res: Response) => {
    try {
      const torrents = await torrentClient.listarTorrents();
      res.json({
        sucesso: true,
        quantidade: torrents.length,
        torrents,
      });
    } catch (err: any) {
      res.status(500).json({
        sucesso: false,
        erro: err?.message || 'Erro ao listar torrents',
      });
    }
  });

  // Endpoint para listar arquivos de um torrent
  router.get('/torrents/:hash/files', async (req: Request, res: Response) => {
    try {
      const hashParam = req.params.hash;
      const hash = Array.isArray(hashParam) ? hashParam[0] : hashParam;
      const files = await torrentClient.listarArquivos(hash);
      res.json({
        sucesso: true,
        quantidade: files.length,
        files,
      });
    } catch (err: any) {
      res.status(500).json({
        sucesso: false,
        erro: err?.message || 'Erro ao listar arquivos',
      });
    }
  });

  return router;
}
