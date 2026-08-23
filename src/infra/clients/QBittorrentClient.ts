import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import { exec, spawn } from 'child_process';
import { TorrentClient, ConnectionStatus, BatchPriorityResult, FileDeletionResult } from '../../domain/client/TorrentClient.js';
import { Torrent } from '../../domain/models/Torrent.js';
import { TorrentFile, FilePriority } from '../../domain/models/TorrentFile.js';
import { TorrentClientConfig } from '../../domain/models/TorrentClientConfig.js';

export interface QBittorrentInfo {
  appVersion?: string;
  webApiVersion?: string;
  connectedAt?: Date;
  urlBase: string;
  latencyMs?: number;
  cookieActive?: boolean;
}

export class QBittorrentClient implements TorrentClient {
  private readonly nome: string = 'qBittorrent';
  private config: TorrentClientConfig;
  private conectado: boolean = false;
  private cookieAutenticacao: string | null = null;
  private detalhesUltimaConexao: string = 'Não conectado';
  private infoConexao: QBittorrentInfo | null = null;

  constructor(config?: Partial<TorrentClientConfig>) {
    this.config = {
      host: config?.host ?? 'localhost',
      port: config?.port ?? 8877,
      username: config?.username ?? 'admin',
      password: config?.password ?? 'Ozzy261220',
      useHttps: config?.useHttps ?? false,
      timeoutMs: config?.timeoutMs ?? 5000,
    };
  }

  obterNome(): string {
    return this.nome;
  }

  obterId(): string {
    return 'qbittorrent';
  }

  estaConectado(): boolean {
    return this.conectado;
  }

  obterConfig(): TorrentClientConfig {
    return { ...this.config };
  }

  obterInfo(): QBittorrentInfo | null {
    return this.infoConexao ? { ...this.infoConexao } : null;
  }

  atualizarConfig(novaConfig: Partial<TorrentClientConfig>): void {
    this.config = {
      ...this.config,
      ...novaConfig,
    };
  }

  async aplicarPrioridadesEmLote(
    torrentHash: string,
    marcados: number[],
    desmarcados: number[],
    apagarDesativados: boolean = false
  ): Promise<BatchPriorityResult> {
    return this.aplicarPrioridadesConfiguradas(torrentHash, marcados, desmarcados, apagarDesativados);
  }

  obterStatusConexao(): ConnectionStatus {
    return {
      conectado: this.conectado,
      cliente: this.nome,
      detalhes: this.detalhesUltimaConexao,
    };
  }

  private obterUrlBase(): string {
    const protocolo = this.config.useHttps ? 'https' : 'http';
    const hostLimpo = this.config.host.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    return `${protocolo}://${hostLimpo}:${this.config.port}`;
  }

  /**
   * Conecta e autentica na Web API do qBittorrent via HTTP ou HTTPS
   */
  async conectar(configOverride?: TorrentClientConfig): Promise<boolean> {
    const inicio = Date.now();
    if (configOverride) {
      this.config = { ...configOverride };
    }

    const urlBase = this.obterUrlBase();

    try {
      // 1. Enviar requisição de autenticação para /api/v2/auth/login
      const formParams = new URLSearchParams();
      if (this.config.username !== undefined) {
        formParams.append('username', this.config.username);
      }
      if (this.config.password !== undefined) {
        formParams.append('password', this.config.password);
      }

      const resLogin = await this.fazerRequisicao({
        url: `${urlBase}/api/v2/auth/login`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: formParams.toString(),
        timeoutMs: this.config.timeoutMs || 5000,
      });

      const respostaTexto = resLogin.bodyText ? resLogin.bodyText.trim() : '';

      // Verifica se o qBittorrent retornou erro explícito (ex: "Fails.", IP banido ou 403/401)
      if (respostaTexto.includes('Fails.') || (resLogin.statusCode === 403 && respostaTexto.includes('banido'))) {
        this.conectado = false;
        this.cookieAutenticacao = null;
        this.infoConexao = null;
        this.detalhesUltimaConexao = respostaTexto.includes('banido')
          ? respostaTexto
          : `Falha de autenticação: usuário ou senha incorretos para ${urlBase}`;
        throw new Error(this.detalhesUltimaConexao);
      }

      // No qBittorrent, tanto 200 OK (com "Ok.") quanto 204 No Content significam autenticação bem sucedida!
      const isLoginOk = resLogin.statusCode === 200 || resLogin.statusCode === 204;

      if (!isLoginOk && resLogin.statusCode !== 403) {
        this.conectado = false;
        this.cookieAutenticacao = null;
        this.infoConexao = null;
        this.detalhesUltimaConexao = `Resposta inesperada do qBittorrent (HTTP ${resLogin.statusCode}) em ${urlBase}`;
        throw new Error(this.detalhesUltimaConexao);
      }

      // 2. Extrai e armazena os cookies retornados (ex: QBT_SID_<port>=... ou SID=...)
      const setCookieHeader = resLogin.headers['set-cookie'];
      if (setCookieHeader) {
        const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
        this.cookieAutenticacao = cookies.map((c) => c.split(';')[0].trim()).join('; ');
      }

      // 3. Validação do Handshake consultando a versão do app e da Web API
      let appVersion = 'v5.x';
      let webApiVersion = 'v2.x';

      try {
        const [resAppVer, resApiVer] = await Promise.all([
          this.fazerRequisicao({
            url: `${urlBase}/api/v2/app/version`,
            method: 'GET',
            timeoutMs: 4000,
          }),
          this.fazerRequisicao({
            url: `${urlBase}/api/v2/app/webapiVersion`,
            method: 'GET',
            timeoutMs: 4000,
          }),
        ]);

        if (resAppVer.statusCode === 200 && resAppVer.bodyText) {
          appVersion = resAppVer.bodyText.trim();
        }
        if (resApiVer.statusCode === 200 && resApiVer.bodyText) {
          webApiVersion = resApiVer.bodyText.trim();
        }
      } catch {
        // Se a chamada de versão falhar mas o login foi 204/200, mantém a sessão
      }

      const latencyMs = Date.now() - inicio;
      this.conectado = true;
      this.infoConexao = {
        appVersion,
        webApiVersion,
        connectedAt: new Date(),
        urlBase,
        latencyMs,
        cookieActive: Boolean(this.cookieAutenticacao),
      };

      this.detalhesUltimaConexao = `Conectado com sucesso ao qBittorrent ${appVersion} (Web API v${webApiVersion}) em ${urlBase}`;
      return true;
    } catch (err: any) {
      this.conectado = false;
      this.cookieAutenticacao = null;
      this.infoConexao = null;

      let msgAmigavel = err.message || 'Erro desconhecido ao conectar ao qBittorrent';

      if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
        msgAmigavel = `Não foi possível conectar: o qBittorrent não está em execução ou a porta ${this.config.port} está inacessível em ${this.config.host}.`;
      } else if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout') || err.name === 'AbortError') {
        msgAmigavel = `Tempo limite esgotado: o servidor em ${urlBase} não respondeu dentro do limite de ${this.config.timeoutMs}ms.`;
      } else if (err.code === 'ENOTFOUND' || err.message?.includes('ENOTFOUND')) {
        msgAmigavel = `Endereço não encontrado: o host '${this.config.host}' é inválido ou inacessível.`;
      } else if (err.code === 'DEPTH_ZERO_SELF_SIGNED_CERT' || err.message?.includes('self-signed')) {
        msgAmigavel = `Erro de certificado SSL/TLS ao conectar em ${urlBase}. Verifique as configurações de HTTPS.`;
      }

      this.detalhesUltimaConexao = msgAmigavel;
      throw new Error(msgAmigavel);
    }
  }

  /**
   * Encerra a sessão ativa com o qBittorrent
   */
  async desconectar(): Promise<void> {
    if (!this.conectado) return;
    try {
      const urlBase = this.obterUrlBase();
      await this.fazerRequisicao({
        url: `${urlBase}/api/v2/auth/logout`,
        method: 'POST',
        timeoutMs: 2000,
      }).catch(() => {});
    } finally {
      this.conectado = false;
      this.cookieAutenticacao = null;
      this.infoConexao = null;
      this.detalhesUltimaConexao = 'Desconectado pelo usuário';
    }
  }

  /**
   * Lista todos os torrents disponíveis no qBittorrent
   */
  async listarTorrents(): Promise<Torrent[]> {
    if (!this.conectado) {
      const ok = await this.conectar().catch(() => false);
      if (!ok) return [];
    }

    try {
      const urlBase = this.obterUrlBase();
      const response = await this.fazerRequisicao({
        url: `${urlBase}/api/v2/torrents/info`,
        method: 'GET',
        timeoutMs: 8000,
      });

      // Se a sessão expirou no qBittorrent (HTTP 403 Forbidden), tenta renovar
      if (response.statusCode === 403 || response.statusCode === 401) {
        this.conectado = false;
        const reconnected = await this.conectar().catch(() => false);
        if (reconnected) {
          return this.listarTorrents();
        }
        throw new Error('Sessão expirada no qBittorrent.');
      }

      if (response.statusCode !== 200) {
        throw new Error(`Falha ao obter lista de torrents (HTTP ${response.statusCode})`);
      }

      const lista = JSON.parse(response.bodyText) as any[];
      return lista.map((t) => ({
        id: t.hash,
        hash: t.hash,
        name: t.name,
        size: t.size || t.total_size || 0,
        progress: typeof t.progress === 'number' ? t.progress : 0,
        status: this.mapearEstado(t.state),
        downloadSpeed: t.dlspeed || 0,
        uploadSpeed: t.upspeed || 0,
        eta: t.eta || 0,
        addedOn: t.added_on ? new Date(t.added_on * 1000) : undefined,
        completedOn: t.completion_on ? new Date(t.completion_on * 1000) : undefined,
        rawState: t.state,
        savePath: t.save_path,
        contentPath: t.content_path,
        category: t.category || '',
        tags: typeof t.tags === 'string' ? t.tags.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      }));
    } catch (err: any) {
      if (err.message?.includes('403') || err.message?.includes('401')) {
        this.conectado = false;
        this.detalhesUltimaConexao = 'Sessão expirada no qBittorrent';
      }
      throw err;
    }
  }

  /**
   * Lista os arquivos de um torrent específico
   */
  async listarArquivos(torrentHash: string): Promise<TorrentFile[]> {
    if (!this.conectado) {
      const ok = await this.conectar().catch(() => false);
      if (!ok) return [];
    }

    try {
      const urlBase = this.obterUrlBase();
      const response = await this.fazerRequisicao({
        url: `${urlBase}/api/v2/torrents/files?hash=${encodeURIComponent(torrentHash)}`,
        method: 'GET',
        timeoutMs: 10000,
      });

      if (response.statusCode === 403 || response.statusCode === 401) {
        this.conectado = false;
        await this.conectar().catch(() => {});
        return this.listarArquivos(torrentHash);
      }

      if (response.statusCode !== 200) {
        throw new Error(`Falha ao obter arquivos do torrent (HTTP ${response.statusCode})`);
      }

      const files = JSON.parse(response.bodyText) as any[];
      return files.map((f, idx) => {
        const rawPath = String(f.name || '').replace(/\\/g, '/');
        const segments = rawPath.split('/');
        const fileName = segments[segments.length - 1] || rawPath;
        const dirPath = segments.length > 1 ? segments.slice(0, -1).join('/') : './';

        return {
          index: typeof f.index === 'number' ? f.index : idx,
          name: fileName,
          path: dirPath,
          size: f.size || 0,
          progress: typeof f.progress === 'number' ? f.progress : 0,
          priority: typeof f.priority === 'number' ? (f.priority as FilePriority) : FilePriority.NORMAL,
          isAvailable: f.is_seed || f.availability > 0,
          originalName: f.name,
        };
      });
    } catch (err) {
      console.error('[QBittorrentClient] Erro ao listar arquivos:', err);
      throw err;
    }
  }

  /**
   * Altera a prioridade de download de arquivos dentro de um torrent
   * @param torrentHash Identificador hash do torrent
   * @param fileIndices Índices dos arquivos dentro do torrent
   * @param prioridade Nova prioridade a ser atribuída (0 = Não baixar, 1 = Normal, 6 = Alta, 7 = Máxima)
   */
  async alterarPrioridades(
    torrentHash: string,
    fileIndices: number[],
    prioridade: FilePriority
  ): Promise<boolean> {
    if (!torrentHash || fileIndices.length === 0) {
      return true; // Nada a alterar
    }

    if (!this.conectado) {
      const ok = await this.conectar().catch(() => false);
      if (!ok) {
        throw new Error('Não foi possível conectar ao qBittorrent para alterar prioridades.');
      }
    }

    // Se a lista de índices for grande, processa em lotes de 1000 para evitar sobrecarga no qBittorrent WebAPI
    const CHUNK_SIZE = 1000;
    if (fileIndices.length > CHUNK_SIZE) {
      for (let i = 0; i < fileIndices.length; i += CHUNK_SIZE) {
        const chunk = fileIndices.slice(i, i + CHUNK_SIZE);
        const ok = await this.alterarPrioridades(torrentHash, chunk, prioridade);
        if (!ok) return false;
      }
      return true;
    }

    try {
      const urlBase = this.obterUrlBase();
      const params = new URLSearchParams();
      params.append('hash', torrentHash);
      params.append('id', fileIndices.join('|'));
      params.append('priority', prioridade.toString());

      const response = await this.fazerRequisicao({
        url: `${urlBase}/api/v2/torrents/filePrio`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: params.toString(),
        timeoutMs: 8000,
      });

      // Se a sessão expirou no qBittorrent, tenta renovar e reenviar
      if (response.statusCode === 403 || response.statusCode === 401) {
        this.conectado = false;
        const reconnected = await this.conectar().catch(() => false);
        if (reconnected) {
          return this.alterarPrioridades(torrentHash, fileIndices, prioridade);
        }
        throw new Error('Sessão expirada no qBittorrent ao tentar alterar prioridades.');
      }

      // No qBittorrent, tanto 200 OK quanto 204 No Content representam sucesso
      return response.statusCode === 200 || response.statusCode === 204;
    } catch (err: any) {
      console.error('[QBittorrentClient] Erro ao alterar prioridades:', err);
      throw new Error(`Falha ao comunicar com o qBittorrent: ${err.message}`);
    }
  }

  /**
   * Exclui os arquivos físicos correspondentes aos índices especificados do disco local
   */
  async apagarArquivos(
    torrentHash: string,
    fileIndices: number[]
  ): Promise<FileDeletionResult> {
    if (!torrentHash || fileIndices.length === 0) {
      return {
        sucesso: true,
        arquivosApagados: 0,
        espacoLiberadoBytes: 0,
        apagados: [],
        falhas: [],
      };
    }

    const indicesSet = new Set(fileIndices.map(Number));
    const urlBase = this.obterUrlBase();

    // 1. Obter informações de diretório do torrent (save_path, content_path)
    let savePath = '';
    let contentPath = '';

    try {
      const resTorrent = await this.fazerRequisicao({
        url: `${urlBase}/api/v2/torrents/info?hashes=${encodeURIComponent(torrentHash)}`,
        method: 'GET',
        timeoutMs: 8000,
      });

      if (resTorrent.statusCode === 200 && resTorrent.bodyText) {
        const infoList = JSON.parse(resTorrent.bodyText) as any[];
        if (infoList.length > 0) {
          savePath = infoList[0].save_path || '';
          contentPath = infoList[0].content_path || '';
        }
      }
    } catch (err) {
      console.warn('[QBittorrentClient] Aviso ao buscar diretório de download do torrent:', err);
    }

    // 2. Obter lista de arquivos do torrent no qBittorrent
    let filesList: any[] = [];
    try {
      const resFiles = await this.fazerRequisicao({
        url: `${urlBase}/api/v2/torrents/files?hash=${encodeURIComponent(torrentHash)}`,
        method: 'GET',
        timeoutMs: 8000,
      });

      if (resFiles.statusCode === 200 && resFiles.bodyText) {
        filesList = JSON.parse(resFiles.bodyText) as any[];
      }
    } catch (err) {
      console.error('[QBittorrentClient] Erro ao obter lista de arquivos para exclusão:', err);
      throw new Error(`Falha ao obter lista de arquivos do qBittorrent: ${(err as Error).message}`);
    }

    let arquivosApagados = 0;
    let espacoLiberadoBytes = 0;
    const apagados: string[] = [];
    const falhas: { arquivo: string; erro: string }[] = [];

    // 3. Processar e excluir cada arquivo selecionado
    for (let idx = 0; idx < filesList.length; idx++) {
      const f = filesList[idx];
      const fileIndex = typeof f.index === 'number' ? f.index : idx;

      if (!indicesSet.has(fileIndex)) {
        continue;
      }

      const rawFileName = String(f.name || '');
      const normalizedRelative = rawFileName.replace(/[/\\]+/g, path.sep);

      const candidatos: string[] = [];
      if (savePath) {
        candidatos.push(path.resolve(savePath, normalizedRelative));
      }
      if (contentPath) {
        candidatos.push(path.resolve(contentPath, normalizedRelative));
        const parts = normalizedRelative.split(path.sep);
        if (parts.length > 1) {
          const subRel = parts.slice(1).join(path.sep);
          candidatos.push(path.resolve(contentPath, subRel));
        }
      }
      if (path.isAbsolute(normalizedRelative)) {
        candidatos.push(normalizedRelative);
      }

      // Remove duplicatas
      const caminhosUnicos = Array.from(new Set(candidatos));
      let arquivoExcluido = false;

      for (const candPath of caminhosUnicos) {
        const pathsToTry = [candPath, candPath + '.!qB'];

        for (const filePath of pathsToTry) {
          if (fs.existsSync(filePath)) {
            try {
              const stat = await fs.promises.stat(filePath);
              const fileSize = stat.size || 0;

              await fs.promises.unlink(filePath);
              arquivoExcluido = true;
              arquivosApagados++;
              espacoLiberadoBytes += fileSize;
              apagados.push(rawFileName);

              // Tenta remover diretórios pai vazios dentro da pasta do torrent
              let parentDir = path.dirname(filePath);
              const limitPath1 = savePath ? path.resolve(savePath) : '';
              const limitPath2 = contentPath ? path.resolve(contentPath) : '';

              while (
                parentDir &&
                parentDir !== limitPath1 &&
                parentDir !== limitPath2 &&
                ((limitPath1 && parentDir.startsWith(limitPath1)) || (limitPath2 && parentDir.startsWith(limitPath2)))
              ) {
                try {
                  const entries = await fs.promises.readdir(parentDir);
                  if (entries.length === 0) {
                    await fs.promises.rmdir(parentDir);
                    parentDir = path.dirname(parentDir);
                  } else {
                    break;
                  }
                } catch {
                  break;
                }
              }

              break;
            } catch (err: any) {
              falhas.push({ arquivo: rawFileName, erro: err?.message || 'Erro ao excluir arquivo' });
            }
          }
        }

        if (arquivoExcluido) {
          break;
        }
      }
    }

    return {
      sucesso: falhas.length === 0,
      arquivosApagados,
      espacoLiberadoBytes,
      apagados,
      falhas,
    };
  }

  /**
   * Aplica em lote as prioridades de arquivos marcados (prioridade 1 - Normal)
   * e arquivos desmarcados (prioridade 0 - Não baixar), com opção de exclusão física dos desmarcados
   */
  async aplicarPrioridadesConfiguradas(
    torrentHash: string,
    marcadosIndices: number[],
    desmarcadosIndices: number[],
    apagarDesativados: boolean = false
  ): Promise<BatchPriorityResult> {
    let okMarcados = true;
    let okDesmarcados = true;

    if (marcadosIndices.length > 0) {
      okMarcados = await this.alterarPrioridades(torrentHash, marcadosIndices, FilePriority.NORMAL);
    }

    if (desmarcadosIndices.length > 0) {
      okDesmarcados = await this.alterarPrioridades(torrentHash, desmarcadosIndices, FilePriority.DO_NOT_DOWNLOAD);
    }

    let exclusaoResult: FileDeletionResult | undefined;

    if (apagarDesativados && desmarcadosIndices.length > 0) {
      try {
        exclusaoResult = await this.apagarArquivos(torrentHash, desmarcadosIndices);
      } catch (err) {
        console.error('[QBittorrentClient] Erro durante exclusão de arquivos desativados:', err);
      }
    }

    return {
      sucesso: okMarcados && okDesmarcados && (!exclusaoResult || exclusaoResult.sucesso),
      marcadosAlterados: marcadosIndices.length,
      desmarcadosAlterados: desmarcadosIndices.length,
      arquivosApagados: exclusaoResult?.arquivosApagados ?? 0,
      espacoLiberadoBytes: exclusaoResult?.espacoLiberadoBytes ?? 0,
      detalhesExclusao: exclusaoResult
        ? {
            apagados: exclusaoResult.apagados,
            falhas: exclusaoResult.falhas,
          }
        : undefined,
    };
  }

  /**
   * Utilitário HTTP/HTTPS com envio de headers de validação de Host e CSRF
   */
  private fazerRequisicao(opcoes: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
  }): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; bodyText: string }> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(opcoes.url);
      const isHttps = parsedUrl.protocol === 'https:';
      const requestModule = isHttps ? https : http;

      const origin = `${parsedUrl.protocol}//${parsedUrl.host}`;
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TorrentManager/1.0',
        'Accept': '*/*',
        'Origin': origin,
        'Referer': `${origin}/`,
        'Host': parsedUrl.host,
        ...(opcoes.headers || {}),
      };

      if (this.cookieAutenticacao) {
        headers['Cookie'] = this.cookieAutenticacao;
      }

      if (opcoes.body && !headers['Content-Length']) {
        headers['Content-Length'] = Buffer.byteLength(opcoes.body).toString();
      }

      const reqOptions: http.RequestOptions = {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        method: opcoes.method,
        headers,
        timeout: opcoes.timeoutMs || 5000,
        ...(isHttps ? { rejectUnauthorized: false } : {}),
      };

      const req = requestModule.request(reqOptions, (res) => {
        let bodyData = '';
        res.setEncoding('utf-8');

        res.on('data', (chunk) => {
          bodyData += chunk;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            bodyText: bodyData,
          });
        });
      });

      req.on('timeout', () => {
        req.destroy(new Error(`Timeout de conexão (${opcoes.timeoutMs || 5000}ms)`));
      });

      req.on('error', (err) => {
        reject(err);
      });

      if (opcoes.body) {
        req.write(opcoes.body);
      }

      req.end();
    });
  }

  private mapearEstado(estado?: string): any {
    switch (estado) {
      case 'downloading':
      case 'forcedDL':
      case 'stalledDL':
        return 'downloading';
      case 'uploading':
      case 'forcedUP':
      case 'stalledUP':
        return 'uploading';
      case 'pausedDL':
      case 'pausedUP':
      case 'stoppedDL':
      case 'stoppedUP':
        return 'paused';
      case 'queuedDL':
      case 'queuedUP':
        return 'queued';
      case 'checkingDL':
      case 'checkingUP':
      case 'checkingResumeData':
        return 'checking';
      case 'error':
      case 'missingFiles':
        return 'error';
      default:
        return 'unknown';
    }
  }

  /**
   * Abre a pasta do arquivo baixado no gerenciador de arquivos do sistema operacional nativo
   */
  async abrirPastaArquivo(
    torrentHash: string,
    fileIndex: number
  ): Promise<{ sucesso: boolean; mensagem?: string; caminho?: string; naoBaixado?: boolean }> {
    if (!torrentHash) {
      return { sucesso: false, mensagem: 'Hash do torrent não informado.' };
    }

    const urlBase = this.obterUrlBase();

    // 1. Obter informações de diretório do torrent (save_path, content_path)
    let savePath = '';
    let contentPath = '';

    try {
      const resTorrent = await this.fazerRequisicao({
        url: `${urlBase}/api/v2/torrents/info?hashes=${encodeURIComponent(torrentHash)}`,
        method: 'GET',
        timeoutMs: 8000,
      });

      if (resTorrent.statusCode === 200 && resTorrent.bodyText) {
        const infoList = JSON.parse(resTorrent.bodyText) as any[];
        if (infoList.length > 0) {
          savePath = infoList[0].save_path || '';
          contentPath = infoList[0].content_path || '';
        }
      }
    } catch (err) {
      console.warn('[QBittorrentClient] Aviso ao buscar diretório do torrent:', err);
    }

    // 2. Obter informações do arquivo específico
    let targetFile: any = null;
    try {
      const resFiles = await this.fazerRequisicao({
        url: `${urlBase}/api/v2/torrents/files?hash=${encodeURIComponent(torrentHash)}`,
        method: 'GET',
        timeoutMs: 8000,
      });

      if (resFiles.statusCode === 200 && resFiles.bodyText) {
        const filesList = JSON.parse(resFiles.bodyText) as any[];
        targetFile = filesList.find((f, idx) => (typeof f.index === 'number' ? f.index : idx) === fileIndex);
      }
    } catch (err: any) {
      return { sucesso: false, mensagem: `Falha ao obter lista de arquivos: ${err.message}` };
    }

    if (!targetFile) {
      return { sucesso: false, mensagem: `Arquivo de índice #${fileIndex} não encontrado no torrent.` };
    }

    const isComplete = typeof targetFile.progress === 'number' && targetFile.progress >= 0.9999;
    const rawFileName = String(targetFile.name || '');
    const normalizedRelative = rawFileName.replace(/[/\\]+/g, path.sep);

    const candidatos: string[] = [];
    if (savePath) {
      candidatos.push(path.resolve(savePath, normalizedRelative));
    }
    if (contentPath) {
      candidatos.push(path.resolve(contentPath, normalizedRelative));
      const parts = normalizedRelative.split(path.sep);
      if (parts.length > 1) {
        const subRel = parts.slice(1).join(path.sep);
        candidatos.push(path.resolve(contentPath, subRel));
      }
    }
    if (path.isAbsolute(normalizedRelative)) {
      candidatos.push(normalizedRelative);
    }

    let existingFilePath: string | null = null;
    let existingDirectoryPath: string | null = null;

    for (const candPath of candidatos) {
      if (fs.existsSync(candPath)) {
        existingFilePath = candPath;
        existingDirectoryPath = path.dirname(candPath);
        break;
      }
      const dirOfCand = path.dirname(candPath);
      if (fs.existsSync(dirOfCand) && !existingDirectoryPath) {
        existingDirectoryPath = dirOfCand;
      }
    }

    if (!existingFilePath && !isComplete) {
      const progStr = typeof targetFile.progress === 'number' ? (targetFile.progress * 100).toFixed(1) + '%' : '0%';
      return {
        sucesso: false,
        naoBaixado: true,
        mensagem: `O arquivo "${targetFile.name}" está em ${progStr} e ainda não foi totalmente baixado.`,
      };
    }

    const pathToOpen = existingFilePath || existingDirectoryPath || (savePath ? path.resolve(savePath) : null);

    if (!pathToOpen || !fs.existsSync(pathToOpen)) {
      return {
        sucesso: false,
        naoBaixado: !isComplete,
        mensagem: 'O diretório ou arquivo físico não foi encontrado no sistema de arquivos local.',
      };
    }

    // Executa comando no sistema operacional para abrir o explorador
    try {
      await abrirNoExploradorDeArquivos(pathToOpen, Boolean(existingFilePath));
      return {
        sucesso: true,
        caminho: pathToOpen,
        mensagem: `Pasta aberta com sucesso no Explorador: ${pathToOpen}`,
      };
    } catch (err: any) {
      return {
        sucesso: false,
        mensagem: `Erro ao abrir explorador de arquivos: ${err.message}`,
        caminho: pathToOpen,
      };
    }
  }
}

/**
 * Função utilitária agnóstica de sistema operacional para abrir pasta/selecionar arquivo
 */
export function abrirNoExploradorDeArquivos(targetPath: string, isFile: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const platform = process.platform;
    const resolvedPath = path.resolve(targetPath);

    if (platform === 'win32') {
      if (isFile) {
        exec(`explorer.exe /select,"${resolvedPath}"`, () => resolve());
      } else {
        exec(`explorer.exe "${resolvedPath}"`, () => resolve());
      }
    } else if (platform === 'darwin') {
      const args = isFile ? ['-R', resolvedPath] : [resolvedPath];
      const child = spawn('open', args, { detached: true, stdio: 'ignore' });
      child.unref();
      child.on('error', (err) => reject(err));
      resolve();
    } else {
      // Linux / BSD
      const folderToOpen = isFile ? path.dirname(resolvedPath) : resolvedPath;
      const child = spawn('xdg-open', [folderToOpen], { detached: true, stdio: 'ignore' });
      child.unref();
      child.on('error', (err) => reject(err));
      resolve();
    }
  });
}
