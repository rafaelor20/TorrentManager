import express, { Router, Request, Response } from 'express';
import { TorrentClient } from '../domain/client/TorrentClient.js';
import { TorrentClientRegistry } from '../infra/providers/TorrentClientRegistry.js';
import { TorrentClientConfig } from '../domain/models/TorrentClientConfig.js';
import { ConfigService, AppConfig } from '../infra/config/ConfigService.js';

export function createRouter(torrentClient: TorrentClient): Router {
  const router = Router();

  router.use(express.json({ limit: '100mb' }));
  router.use(express.urlencoded({ extended: true, limit: '100mb' }));

  // Get general application and client status
  router.get('/status', (_req: Request, res: Response) => {
    const infoCliente = torrentClient.obterInfo ? torrentClient.obterInfo() : null;
    const configAtual = ConfigService.carregar();

    res.json({
      status: 'online',
      mensagem: 'Aplicação iniciada com sucesso',
      versao: '1.0.0',
      clienteAtivo: torrentClient.obterNome(),
      clienteId: torrentClient.obterId ? torrentClient.obterId() : 'qbittorrent',
      statusConexao: torrentClient.obterStatusConexao(),
      infoCliente,
      language: configAtual.language || 'en',
      config: {
        host: configAtual.qbittorrent.host,
        port: configAtual.qbittorrent.port,
        username: configAtual.qbittorrent.username,
        hasPassword: Boolean(configAtual.qbittorrent.password),
        useHttps: configAtual.qbittorrent.useHttps,
        timeoutMs: configAtual.qbittorrent.timeoutMs,
        refreshInterval: configAtual.qbittorrent.refreshInterval ?? 10,
        language: configAtual.language || 'en',
      },
      clientesSuportados: TorrentClientRegistry.listarIdsProvedores(),
      provedores: TorrentClientRegistry.listarProvedores(),
      timestamp: new Date().toISOString(),
    });
  });

  // Get current complete settings
  router.get('/config', (_req: Request, res: Response) => {
    const config = ConfigService.carregar();
    res.json({
      sucesso: true,
      config: {
        server: config.server,
        language: config.language || 'en',
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
      provedores: TorrentClientRegistry.listarProvedores(),
    });
  });

  // Save settings to data/config.json file
  router.post('/config', (req: Request, res: Response) => {
    try {
      const { host, port, username, password, useHttps, timeoutMs, refreshInterval, language } = req.body || {};
      
      const configAtual = ConfigService.carregar();
      const novoQbitConfig: Partial<TorrentClientConfig> = {
        host: typeof host === 'string' ? host : configAtual.qbittorrent.host,
        port: typeof port === 'number' ? port : Number(port) || configAtual.qbittorrent.port,
        username: typeof username === 'string' ? username : configAtual.qbittorrent.username,
        useHttps: typeof useHttps === 'boolean' ? useHttps : configAtual.qbittorrent.useHttps,
        timeoutMs: typeof timeoutMs === 'number' ? timeoutMs : Number(timeoutMs) || configAtual.qbittorrent.timeoutMs,
        refreshInterval: typeof refreshInterval === 'number' ? refreshInterval : Number(refreshInterval) || configAtual.qbittorrent.refreshInterval,
      };

      // Only replace password if a new one is provided
      if (typeof password === 'string' && password !== '') {
        novoQbitConfig.password = password;
      }

      const payloadSalvar: Partial<AppConfig> = {
        qbittorrent: novoQbitConfig as TorrentClientConfig,
      };

      if (typeof language === 'string' && language.trim() !== '') {
        payloadSalvar.language = language.trim();
      }

      const salva = ConfigService.salvar(payloadSalvar);
      
      // Polymorphically update instantiated client
      if (torrentClient.atualizarConfig) {
        torrentClient.atualizarConfig(salva.qbittorrent);
      }

      res.json({
        sucesso: true,
        mensagem: 'Configurações salvas com sucesso no arquivo local!',
        config: {
          language: salva.language || 'en',
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

  // Connect / Test connection with BitTorrent client API
  router.post('/client/connect', async (req: Request, res: Response) => {
    try {
      const { host, port, username, password, useHttps, timeoutMs, refreshInterval, salvarConfig, language } = req.body || {};

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
          const payloadSalvar: Partial<AppConfig> = {
            qbittorrent: overrideConfig as TorrentClientConfig,
          };
          if (typeof language === 'string' && language.trim() !== '') {
            payloadSalvar.language = language.trim();
          }
          ConfigService.salvar(payloadSalvar);
        }
      }

      const conectado = await torrentClient.conectar(overrideConfig as TorrentClientConfig);
      const status = torrentClient.obterStatusConexao();
      const infoCliente = torrentClient.obterInfo ? torrentClient.obterInfo() : null;

      res.json({
        sucesso: conectado,
        status,
        infoCliente,
        mensagem: conectado
          ? `Conexão estabelecida com sucesso ao ${torrentClient.obterNome()}!`
          : status.detalhes || 'Falha ao conectar ao cliente.',
      });
    } catch (err: any) {
      res.status(400).json({
        sucesso: false,
        erro: err?.message || `Erro ao conectar ao ${torrentClient.obterNome()}`,
        status: torrentClient.obterStatusConexao(),
      });
    }
  });

  // Disconnect from BitTorrent client
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

  // List torrents
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

/**
 * Safely streams torrent files in chunks to prevent V8 RangeError: Invalid string length
 * when serializing large file lists (10,000 to 100,000+ files).
 */
function streamTorrentFiles(res: Response, files: any[]): void {
  try {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.write(`{"sucesso":true,"quantidade":${files.length},"files":[`);
    const CHUNK_SIZE = 500;
    for (let i = 0; i < files.length; i += CHUNK_SIZE) {
      const slice = files.slice(i, i + CHUNK_SIZE);
      const jsonChunk = slice.map((item) => JSON.stringify(item)).join(',');
      res.write((i > 0 ? ',' : '') + jsonChunk);
    }
    res.write(']}');
    res.end();
  } catch (err: any) {
    console.error('[Routes] Error streaming torrent files:', err?.message || err);
    if (!res.headersSent) {
      res.status(500).json({
        sucesso: false,
        erro: err?.message || 'Erro ao serializar arquivos',
        quantidade: 0,
        files: [],
      });
    } else {
      res.end();
    }
  }
}

/**
 * Safely streams batch torrent files dictionary in chunks to avoid V8 string length limits.
 */
function streamBatchFiles(res: Response, filesByHash: Record<string, any[]>): void {
  try {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.write('{"sucesso":true,"filesByHash":{');
    const hashes = Object.keys(filesByHash);
    for (let h = 0; h < hashes.length; h++) {
      const hash = hashes[h];
      const files = filesByHash[hash] || [];
      const hashPrefix = h === 0 ? '' : ',';
      res.write(`${hashPrefix}${JSON.stringify(hash)}:[`);
      const CHUNK_SIZE = 500;
      for (let i = 0; i < files.length; i += CHUNK_SIZE) {
        const slice = files.slice(i, i + CHUNK_SIZE);
        const jsonChunk = slice.map((item) => JSON.stringify(item)).join(',');
        res.write((i > 0 ? ',' : '') + jsonChunk);
      }
      res.write(']');
    }
    res.write('}}');
    res.end();
  } catch (err: any) {
    console.error('[Routes] Error streaming batch files:', err?.message || err);
    if (!res.headersSent) {
      res.status(500).json({
        sucesso: false,
        erro: err?.message || 'Erro ao serializar arquivos em lote',
        filesByHash: {},
      });
    } else {
      res.end();
    }
  }
}

  // List torrent files
  router.get('/torrents/:hash/files', async (req: Request, res: Response) => {
    try {
      const hashParam = req.params.hash;
      const hash = Array.isArray(hashParam) ? hashParam[0] : hashParam;
      const files = await torrentClient.listarArquivos(hash);
      streamTorrentFiles(res, files || []);
    } catch (err: any) {
      console.warn(`[Routes] Warning while listing files for hash ${req.params.hash}:`, err?.message || err);
      if (!res.headersSent) {
        res.json({
          sucesso: false,
          erro: err?.message || 'Erro ao listar arquivos',
          quantidade: 0,
          files: [],
        });
      }
    }
  });

  // Efficiently fetch files from multiple torrents in batch
  router.post('/torrents/batch-files', async (req: Request, res: Response) => {
    try {
      const { hashes } = req.body || {};
      if (!Array.isArray(hashes) || hashes.length === 0) {
        return res.json({
          sucesso: true,
          filesByHash: {},
        });
      }

      // Safeguard against unbounded batch sizes (limit to 20 per request)
      const requestedHashes = hashes.slice(0, 20).map(String);
      let filesByHash: Record<string, any[]> = {};

      if (torrentClient.listarArquivosEmLote) {
        try {
          filesByHash = await torrentClient.listarArquivosEmLote(requestedHashes);
        } catch (err: any) {
          console.warn('[Routes] Batch file retrieval failed, using fallback:', err?.message || err);
        }
      }

      // If filesByHash is still empty, populate with safe fallback
      if (!filesByHash || Object.keys(filesByHash).length === 0) {
        filesByHash = {};
        const CONCURRENCY_LIMIT = 4;
        for (let i = 0; i < requestedHashes.length; i += CONCURRENCY_LIMIT) {
          const chunk = requestedHashes.slice(i, i + CONCURRENCY_LIMIT);
          await Promise.all(
            chunk.map(async (h: string) => {
              try {
                const files = await torrentClient.listarArquivos(String(h));
                filesByHash[h] = files || [];
              } catch (err: any) {
                console.warn(`[Routes] Error listing files for hash ${h}:`, err?.message || err);
                filesByHash[h] = [];
              }
            })
          );
        }
      }

      streamBatchFiles(res, filesByHash);
    } catch (err: any) {
      console.error('[Routes] Error in batch-files:', err?.message || err);
      if (!res.headersSent) {
        res.json({
          sucesso: false,
          erro: err?.message || 'Erro ao obter arquivos em lote',
          filesByHash: {},
        });
      }
    }
  });

  // Agnostically apply priorities to torrent files
  router.post('/torrents/:hash/priority', async (req: Request, res: Response) => {
    try {
      req.setTimeout(180000); // 3 minutes timeout for heavy disk I/O on large torrents
      const hashParam = req.params.hash;
      const hash = Array.isArray(hashParam) ? hashParam[0] : hashParam;
      const { marcadosIndices, desmarcadosIndices, prioridade, indices, apagarDesativados } = req.body || {};

      if (!hash) {
        return res.status(400).json({
          sucesso: false,
          erro: 'Hash do torrent é obrigatório.',
        });
      }

      // Support submitting marked (prio 1) and unmarked (prio 0)
      if (Array.isArray(marcadosIndices) || Array.isArray(desmarcadosIndices)) {
        const marcados = Array.isArray(marcadosIndices) ? marcadosIndices.map(Number) : [];
        const desmarcados = Array.isArray(desmarcadosIndices) ? desmarcadosIndices.map(Number) : [];
        const apagarFisicos = Boolean(apagarDesativados);

        let resultado: any;

        if (torrentClient.aplicarPrioridadesEmLote) {
          resultado = await torrentClient.aplicarPrioridadesEmLote(hash, marcados, desmarcados, apagarFisicos);
        } else {
          let okMarcados = true;
          let okDesmarcados = true;
          if (marcados.length > 0) {
            okMarcados = await torrentClient.alterarPrioridades(hash, marcados, 1);
          }
          if (desmarcados.length > 0) {
            okDesmarcados = await torrentClient.alterarPrioridades(hash, desmarcados, 0);
          }
          let exclusaoRes: any;
          if (apagarFisicos && desmarcados.length > 0 && torrentClient.apagarArquivos) {
            exclusaoRes = await torrentClient.apagarArquivos(hash, desmarcados);
          }
          resultado = {
            sucesso: okMarcados && okDesmarcados && (!exclusaoRes || exclusaoRes.sucesso),
            marcadosAlterados: marcados.length,
            desmarcadosAlterados: desmarcados.length,
            arquivosApagados: exclusaoRes?.arquivosApagados ?? 0,
            espacoLiberadoBytes: exclusaoRes?.espacoLiberadoBytes ?? 0,
            detalhesExclusao: exclusaoRes
              ? {
                  apagados: exclusaoRes.apagados,
                  falhas: exclusaoRes.falhas,
                }
              : undefined,
          };
        }

        let mensagem = `Prioridades aplicadas com sucesso no ${torrentClient.obterNome()}! (${resultado.marcadosAlterados} marcados como Normal, ${resultado.desmarcadosAlterados} como Não Baixar).`;
        if (apagarFisicos && resultado.arquivosApagados !== undefined && resultado.arquivosApagados > 0) {
          mensagem += ` ${resultado.arquivosApagados} arquivo(s) apagado(s) do disco local.`;
        }

        return res.json({
          sucesso: resultado.sucesso,
          mensagem,
          detalhes: resultado,
        });
      }

      // Support direct index list with fixed priority
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
      console.error('[Routes] Error applying priorities:', err);
      return res.status(500).json({
        sucesso: false,
        erro: err?.message || 'Erro de comunicação ao aplicar prioridades no cliente BitTorrent.',
      });
    }
  });

  // Open file directory in native OS file manager
  router.post('/torrents/:hash/files/:index/open-folder', async (req: Request, res: Response) => {
    try {
      const hashParam = req.params.hash;
      const hash = Array.isArray(hashParam) ? hashParam[0] : hashParam;
      const indexParam = req.params.index;
      const fileIndex = Number(Array.isArray(indexParam) ? indexParam[0] : indexParam);

      if (!hash || isNaN(fileIndex)) {
        return res.status(400).json({
          sucesso: false,
          erro: 'Hash e índice do arquivo são obrigatórios.',
        });
      }

      if (torrentClient.abrirPastaArquivo) {
        const resultado = await torrentClient.abrirPastaArquivo(hash, fileIndex);
        return res.json(resultado);
      }

      return res.status(501).json({
        sucesso: false,
        erro: 'Operação não suportada pelo cliente atual.',
      });
    } catch (err: any) {
      console.error('[Routes] Error opening file directory:', err);
      return res.status(500).json({
        sucesso: false,
        erro: err?.message || 'Erro ao abrir pasta do arquivo no sistema operacional.',
      });
    }
  });

  return router;
}

