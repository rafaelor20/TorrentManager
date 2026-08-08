import http from 'http';
import https from 'https';
import { TorrentClient, ConnectionStatus } from '../../domain/client/TorrentClient.js';
import { Torrent } from '../../domain/models/Torrent.js';
import { TorrentFile, FilePriority } from '../../domain/models/TorrentFile.js';
import { TorrentClientConfig } from '../../domain/models/TorrentClientConfig.js';

export interface QBittorrentInfo {
  appVersion?: string;
  webApiVersion?: string;
  connectedAt?: Date;
  urlBase: string;
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
      host: config?.host ?? '127.0.0.1',
      port: config?.port ?? 8080,
      username: config?.username ?? 'admin',
      password: config?.password ?? '',
      useHttps: config?.useHttps ?? false,
      timeoutMs: config?.timeoutMs ?? 5000,
    };
  }

  obterNome(): string {
    return this.nome;
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

  obterStatusConexao(): ConnectionStatus {
    return {
      conectado: this.conectado,
      cliente: this.nome,
      detalhes: this.detalhesUltimaConexao,
    };
  }

  /**
   * Conecta e autentica na Web API do qBittorrent via HTTP ou HTTPS
   */
  async conectar(configOverride?: TorrentClientConfig): Promise<boolean> {
    if (configOverride) {
      this.config = { ...configOverride };
    }

    const protocolo = this.config.useHttps ? 'https' : 'http';
    const hostLimpo = this.config.host.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    const urlBase = `${protocolo}://${hostLimpo}:${this.config.port}`;

    try {
      // 1. Tentar login na rota oficial /api/v2/auth/login
      const formBody = new URLSearchParams();
      if (this.config.username !== undefined) {
        formBody.append('username', this.config.username);
      }
      if (this.config.password !== undefined) {
        formBody.append('password', this.config.password);
      }

      const resLogin = await this.fazerRequisicao({
        url: `${urlBase}/api/v2/auth/login`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody.toString(),
        timeoutMs: this.config.timeoutMs || 5000,
      });

      // qBittorrent retorna 200 OK com texto "Ok." ou "Fails." e cabeçalho set-cookie: SID=...
      const respostaTexto = resLogin.bodyText.trim();

      if (respostaTexto === 'Fails.' || resLogin.statusCode === 403) {
        this.conectado = false;
        this.cookieAutenticacao = null;
        this.infoConexao = null;
        this.detalhesUltimaConexao = `Falha de autenticação: usuário ou senha incorretos para ${urlBase}`;
        throw new Error(this.detalhesUltimaConexao);
      }

      if (resLogin.statusCode < 200 || resLogin.statusCode >= 300) {
        this.conectado = false;
        this.cookieAutenticacao = null;
        this.infoConexao = null;
        this.detalhesUltimaConexao = `Resposta inesperada do servidor (HTTP ${resLogin.statusCode}) em ${urlBase}`;
        throw new Error(this.detalhesUltimaConexao);
      }

      // Extrai o cookie da sessão
      const setCookieHeader = resLogin.headers['set-cookie'];
      if (setCookieHeader) {
        const rawCookies = Array.isArray(setCookieHeader) ? setCookieHeader.join('; ') : setCookieHeader;
        const matchSid = rawCookies.match(/SID=[^;]+/);
        if (matchSid) {
          this.cookieAutenticacao = matchSid[0];
        } else {
          this.cookieAutenticacao = rawCookies.split(';')[0];
        }
      }

      // 2. Consulta a versão do qBittorrent e da Web API para validar a sessão
      let appVersion = 'Desconhecida';
      let webApiVersion = 'Desconhecida';

      try {
        const [resAppVer, resApiVer] = await Promise.all([
          this.fazerRequisicao({
            url: `${urlBase}/api/v2/app/version`,
            method: 'GET',
            timeoutMs: 3000,
          }),
          this.fazerRequisicao({
            url: `${urlBase}/api/v2/app/webapiVersion`,
            method: 'GET',
            timeoutMs: 3000,
          }),
        ]);

        if (resAppVer.statusCode === 200 && resAppVer.bodyText) {
          appVersion = resAppVer.bodyText.trim();
        }
        if (resApiVer.statusCode === 200 && resApiVer.bodyText) {
          webApiVersion = resApiVer.bodyText.trim();
        }
      } catch {
        // Se falhar ao buscar versões secundárias, mas o login passou, mantém conectado
      }

      this.conectado = true;
      this.infoConexao = {
        appVersion,
        webApiVersion,
        connectedAt: new Date(),
        urlBase,
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
      const protocolo = this.config.useHttps ? 'https' : 'http';
      const hostLimpo = this.config.host.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
      const urlBase = `${protocolo}://${hostLimpo}:${this.config.port}`;

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
      return [];
    }

    try {
      const protocolo = this.config.useHttps ? 'https' : 'http';
      const hostLimpo = this.config.host.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
      const url = `${protocolo}://${hostLimpo}:${this.config.port}/api/v2/torrents/info`;

      const response = await this.fazerRequisicao({
        url,
        method: 'GET',
        timeoutMs: 8000,
      });

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
      return [];
    }

    try {
      const protocolo = this.config.useHttps ? 'https' : 'http';
      const hostLimpo = this.config.host.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
      const url = `${protocolo}://${hostLimpo}:${this.config.port}/api/v2/torrents/files?hash=${encodeURIComponent(torrentHash)}`;

      const response = await this.fazerRequisicao({
        url,
        method: 'GET',
        timeoutMs: 10000,
      });

      if (response.statusCode !== 200) {
        throw new Error(`Falha ao obter arquivos do torrent (HTTP ${response.statusCode})`);
      }

      const files = JSON.parse(response.bodyText) as any[];
      return files.map((f, idx) => ({
        index: typeof f.index === 'number' ? f.index : idx,
        name: f.name,
        path: f.name,
        size: f.size || 0,
        progress: typeof f.progress === 'number' ? f.progress : 0,
        priority: typeof f.priority === 'number' ? (f.priority as FilePriority) : FilePriority.NORMAL,
        isAvailable: f.is_seed || f.availability > 0,
      }));
    } catch (err) {
      console.error('[QBittorrentClient] Erro ao listar arquivos:', err);
      throw err;
    }
  }

  /**
   * Altera prioridade de arquivos no qBittorrent
   */
  async alterarPrioridades(
    torrentHash: string,
    fileIndices: number[],
    prioridade: FilePriority
  ): Promise<boolean> {
    if (!this.conectado || fileIndices.length === 0) {
      return false;
    }

    try {
      const protocolo = this.config.useHttps ? 'https' : 'http';
      const hostLimpo = this.config.host.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
      const url = `${protocolo}://${hostLimpo}:${this.config.port}/api/v2/torrents/filePrio`;

      const params = new URLSearchParams();
      params.append('hash', torrentHash);
      params.append('id', fileIndices.join('|'));
      params.append('priority', prioridade.toString());

      const response = await this.fazerRequisicao({
        url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
        timeoutMs: 5000,
      });

      return response.statusCode === 200;
    } catch {
      return false;
    }
  }

  /**
   * Utilitário HTTP/HTTPS robusto com suporte a cookies, timeout e SSL
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

      const headers: Record<string, string> = {
        ...(opcoes.headers || {}),
      };

      if (this.cookieAutenticacao) {
        headers['Cookie'] = this.cookieAutenticacao;
      }

      const reqOptions: http.RequestOptions = {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        method: opcoes.method,
        headers,
        timeout: opcoes.timeoutMs || 5000,
        ...(isHttps ? { rejectUnauthorized: false } : {}), // Suporte a certificados autoassinados em redes locais
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
}
