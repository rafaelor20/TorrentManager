import { Router, Request, Response } from 'express';
import { TorrentClient } from '../domain/client/TorrentClient.js';
import { QBittorrentClient } from '../infra/clients/QBittorrentClient.js';
import { TorrentClientFactory } from '../infra/clients/TorrentClientFactory.js';
import { TorrentClientConfig } from '../domain/models/TorrentClientConfig.js';
import { ConfigService } from '../infra/config/ConfigService.js';

export function createRouter(torrentClient: TorrentClient): Router {
  const router = Router();

  // Obter status geral da aplicação e do cliente
  router.get('/status', (_req: Request, res: Response) => {
    const qbInfo = torrentClient instanceof QBittorrentClient ? torrentClient.obterInfo() : null;
    const configAtual = ConfigService.carregar();

    res.json({
      status: 'online',
      mensagem: 'Aplicação iniciada com sucesso',
      versao: '1.0.0',
      clienteAtivo: torrentClient.obterNome(),
      statusConexao: torrentClient.obterStatusConexao(),
      infoCliente: qbInfo,
      config: {
        host: configAtual.qbittorrent.host,
        port: configAtual.qbittorrent.port,
        username: configAtual.qbittorrent.username,
        hasPassword: Boolean(configAtual.qbittorrent.password),
        useHttps: configAtual.qbittorrent.useHttps,
        timeoutMs: configAtual.qbittorrent.timeoutMs,
        refreshInterval: configAtual.qbittorrent.refreshInterval ?? 10,
      },
      clientesSuportados: TorrentClientFactory.obterClientesSuportados(),
      timestamp: new Date().toISOString(),
    });
  });

  // Obter configurações completas atuais
  router.get('/config', (_req: Request, res: Response) => {
    const config = ConfigService.carregar();
    res.json({
      sucesso: true,
      config: {
        server: config.server,
        qbittorrent: {
          host: config.qbittorrent.host,
          port: config.qbittorrent.port,
          username: config.qbittorrent.username,
          hasPassword: Boolean(config.qbittorrent.password),
          useHttps: config.qbittorrent.useHttps,
          timeoutMs: config.qbittorrent.timeoutMs,
          refreshInterval: config.qbittorrent.refreshInterval ?? 10,
        },
      },
    });
  });

  // Salvar configurações no arquivo data/config.json
  router.post('/config', (req: Request, res: Response) => {
    try {
      const { host, port, username, password, useHttps, timeoutMs, refreshInterval } = req.body || {};
      
      const configAtual = ConfigService.carregar();
      const novoQbitConfig: Partial<TorrentClientConfig> = {
        host: typeof host === 'string' ? host : configAtual.qbittorrent.host,
        port: typeof port === 'number' ? port : Number(port) || configAtual.qbittorrent.port,
        username: typeof username === 'string' ? username : configAtual.qbittorrent.username,
        useHttps: typeof useHttps === 'boolean' ? useHttps : configAtual.qbittorrent.useHttps,
        timeoutMs: typeof timeoutMs === 'number' ? timeoutMs : Number(timeoutMs) || configAtual.qbittorrent.timeoutMs,
        refreshInterval: typeof refreshInterval === 'number' ? refreshInterval : Number(refreshInterval) || configAtual.qbittorrent.refreshInterval,
      };

      // Só substitui a senha se enviada uma nova
      if (typeof password === 'string' && password !== '') {
        novoQbitConfig.password = password;
      }

      const salva = ConfigService.salvarQBittorrent(novoQbitConfig);
      
      // Atualiza o cliente instanciado com as novas configurações
      if (torrentClient instanceof QBittorrentClient) {
        torrentClient.atualizarConfig(salva.qbittorrent);
      }

      res.json({
        sucesso: true,
        mensagem: 'Configurações salvas com sucesso no arquivo local!',
        config: {
          host: salva.qbittorrent.host,
          port: salva.qbittorrent.port,
          username: salva.qbittorrent.username,
          hasPassword: Boolean(salva.qbittorrent.password),
          useHttps: salva.qbittorrent.useHttps,
          timeoutMs: salva.qbittorrent.timeoutMs,
          refreshInterval: salva.qbittorrent.refreshInterval,
        },
      });
    } catch (err: any) {
      res.status(500).json({
        sucesso: false,
        erro: err?.message || 'Erro ao persistir configurações no arquivo',
      });
    }
  });

  // Conectar / Testar conexão com a Web API do qBittorrent
  router.post('/client/connect', async (req: Request, res: Response) => {
    try {
      const { host, port, username, password, useHttps, timeoutMs, refreshInterval, salvarConfig } = req.body || {};

      let overrideConfig: Partial<TorrentClientConfig> | undefined;

      if (host || port || username !== undefined || password !== undefined || useHttps !== undefined || refreshInterval !== undefined) {
        const configAtual = ConfigService.carregar();
        overrideConfig = {
          host: host || configAtual.qbittorrent.host,
          port: port ? Number(port) : configAtual.qbittorrent.port,
          username: username !== undefined ? username : configAtual.qbittorrent.username,
          password: password !== undefined ? password : configAtual.qbittorrent.password,
          useHttps: useHttps !== undefined ? Boolean(useHttps) : configAtual.qbittorrent.useHttps,
          timeoutMs: timeoutMs ? Number(timeoutMs) : configAtual.qbittorrent.timeoutMs,
          refreshInterval: refreshInterval ? Number(refreshInterval) : configAtual.qbittorrent.refreshInterval,
        };

        if (salvarConfig) {
          ConfigService.salvarQBittorrent(overrideConfig);
        }
      }

      const conectado = await torrentClient.conectar(overrideConfig as TorrentClientConfig);
      const status = torrentClient.obterStatusConexao();
      const qbInfo = torrentClient instanceof QBittorrentClient ? torrentClient.obterInfo() : null;

      res.json({
        sucesso: conectado,
        status,
        infoCliente: qbInfo,
        mensagem: conectado
          ? `Conexão estabelecida com sucesso ao ${torrentClient.obterNome()}!`
          : status.detalhes || 'Falha ao conectar ao cliente.',
      });
    } catch (err: any) {
      res.status(400).json({
        sucesso: false,
        erro: err?.message || 'Erro ao conectar ao qBittorrent',
        status: torrentClient.obterStatusConexao(),
      });
    }
  });

  // Desconectar do cliente BitTorrent
  router.post('/client/disconnect', async (_req: Request, res: Response) => {
    try {
      if (torrentClient.desconectar) {
        await torrentClient.desconectar();
      }
      res.json({
        sucesso: true,
        mensagem: 'Desconectado com sucesso.',
        status: torrentClient.obterStatusConexao(),
      });
    } catch (err: any) {
      res.status(500).json({
        sucesso: false,
        erro: err?.message || 'Erro ao desconectar',
      });
    }
  });

  // Listar torrents
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

  // Listar arquivos do torrent
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

  // Aplicar prioridades aos arquivos do torrent (Etapa 9)
  router.post('/torrents/:hash/priority', async (req: Request, res: Response) => {
    try {
      const hashParam = req.params.hash;
      const hash = Array.isArray(hashParam) ? hashParam[0] : hashParam;
      const { marcadosIndices, desmarcadosIndices, prioridade, indices } = req.body || {};

      if (!hash) {
        return res.status(400).json({
          sucesso: false,
          erro: 'Hash do torrent é obrigatório.',
        });
      }

      // Suporte a envio de marcados (prio 1) e desmarcados (prio 0)
      if (Array.isArray(marcadosIndices) || Array.isArray(desmarcadosIndices)) {
        const marcados = Array.isArray(marcadosIndices) ? marcadosIndices.map(Number) : [];
        const desmarcados = Array.isArray(desmarcadosIndices) ? desmarcadosIndices.map(Number) : [];

        let resultado;
        if (torrentClient instanceof QBittorrentClient) {
          resultado = await torrentClient.aplicarPrioridadesConfiguradas(hash, marcados, desmarcados);
        } else {
          let okMarcados = true;
          let okDesmarcados = true;
          if (marcados.length > 0) {
            okMarcados = await torrentClient.alterarPrioridades(hash, marcados, 1);
          }
          if (desmarcados.length > 0) {
            okDesmarcados = await torrentClient.alterarPrioridades(hash, desmarcados, 0);
          }
          resultado = {
            sucesso: okMarcados && okDesmarcados,
            marcadosAlterados: marcados.length,
            desmarcadosAlterados: desmarcados.length,
          };
        }

        return res.json({
          sucesso: resultado.sucesso,
          mensagem: `Prioridades aplicadas com sucesso no ${torrentClient.obterNome()}! (${resultado.marcadosAlterados} marcados como Normal, ${resultado.desmarcadosAlterados} como Não Baixar).`,
          detalhes: resultado,
        });
      }

      // Suporte a envio direto de lista de índices com prioridade fixa
      if (Array.isArray(indices) && typeof prioridade === 'number') {
        const ok = await torrentClient.alterarPrioridades(hash, indices.map(Number), prioridade);
        return res.json({
          sucesso: ok,
          mensagem: `Prioridade ${prioridade} aplicada a ${indices.length} arquivos.`,
        });
      }

      return res.status(400).json({
        sucesso: false,
        erro: 'Nenhuma alteração de prioridade informada no corpo da requisição.',
      });
    } catch (err: any) {
      console.error('[Routes] Erro ao aplicar prioridades:', err);
      return res.status(500).json({
        sucesso: false,
        erro: err?.message || 'Erro de comunicação ao aplicar prioridades no cliente BitTorrent.',
      });
    }
  });

  return router;
}
