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
    desmarcados: number[]
  ): Promise<{ sucesso: boolean; marcadosAlterados: number; desmarcadosAlterados: number }> {
    return this.aplicarPrioridadesConfiguradas(torrentHash, marcados, desmarcados);
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
   * Aplica em lote as prioridades de arquivos marcados (prioridade 1 - Normal)
   * e arquivos desmarcados (prioridade 0 - Não baixar)
   */
  async aplicarPrioridadesConfiguradas(
    torrentHash: string,
    marcadosIndices: number[],
    desmarcadosIndices: number[]
  ): Promise<{ sucesso: boolean; marcadosAlterados: number; desmarcadosAlterados: number }> {
    let okMarcados = true;
    let okDesmarcados = true;

    if (marcadosIndices.length > 0) {
      okMarcados = await this.alterarPrioridades(torrentHash, marcadosIndices, FilePriority.NORMAL);
    }

    if (desmarcadosIndices.length > 0) {
      okDesmarcados = await this.alterarPrioridades(torrentHash, desmarcadosIndices, FilePriority.DO_NOT_DOWNLOAD);
    }

    return {
      sucesso: okMarcados && okDesmarcados,
      marcadosAlterados: marcadosIndices.length,
      desmarcadosAlterados: desmarcadosIndices.length,
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
}
