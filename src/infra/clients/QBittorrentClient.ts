import { TorrentClient, ConnectionStatus } from '../../domain/client/TorrentClient.js';
import { Torrent } from '../../domain/models/Torrent.js';
import { TorrentFile, FilePriority } from '../../domain/models/TorrentFile.js';
import { TorrentClientConfig } from '../../domain/models/TorrentClientConfig.js';

export class QBittorrentClient implements TorrentClient {
  private readonly nome: string = 'qBittorrent';
  private config: TorrentClientConfig;
  private conectado: boolean = false;
  private cookieAutenticacao: string | null = null;
  private detalhesUltimaConexao: string = 'Não conectado';

  constructor(config?: Partial<TorrentClientConfig>) {
    this.config = {
      host: config?.host ?? 'localhost',
      port: config?.port ?? 8080,
      username: config?.username ?? 'admin',
      password: config?.password ?? 'adminadmin',
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

  async conectar(configOverride?: TorrentClientConfig): Promise<boolean> {
    if (configOverride) {
      this.config = { ...configOverride };
    }

    try {
      const protocolo = this.config.useHttps ? 'https' : 'http';
      const urlBase = `${protocolo}://${this.config.host}:${this.config.port}`;
      
      // Tentativa de autenticação com a Web API do qBittorrent (/api/v2/auth/login)
      const params = new URLSearchParams();
      if (this.config.username) params.append('username', this.config.username);
      if (this.config.password) params.append('password', this.config.password);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs || 5000);

      try {
        const response = await fetch(`${urlBase}/api/v2/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const cookieHeader = response.headers.get('set-cookie');
          if (cookieHeader) {
            this.cookieAutenticacao = cookieHeader.split(';')[0];
          }
          this.conectado = true;
          this.detalhesUltimaConexao = `Conectado com sucesso a ${urlBase}`;
          return true;
        } else {
          this.conectado = false;
          this.detalhesUltimaConexao = `Falha na autenticação (HTTP ${response.status}): credenciais inválidas ou qBittorrent indisponível`;
          return false;
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        this.conectado = false;
        const msg = err?.name === 'AbortError' ? 'Tempo de conexão esgotado (timeout)' : err?.message || 'Erro de rede';
        this.detalhesUltimaConexao = `Erro ao conectar a ${urlBase}: ${msg}`;
        return false;
      }
    } catch (err: any) {
      this.conectado = false;
      this.detalhesUltimaConexao = `Erro inesperado: ${err?.message || err}`;
      return false;
    }
  }

  async desconectar(): Promise<void> {
    if (!this.conectado) return;
    try {
      const protocolo = this.config.useHttps ? 'https' : 'http';
      const urlBase = `${protocolo}://${this.config.host}:${this.config.port}`;
      await fetch(`${urlBase}/api/v2/auth/logout`, {
        method: 'POST',
        headers: this.cookieAutenticacao ? { Cookie: this.cookieAutenticacao } : {},
      }).catch(() => {});
    } finally {
      this.conectado = false;
      this.cookieAutenticacao = null;
      this.detalhesUltimaConexao = 'Desconectado pelo usuário';
    }
  }

  async listarTorrents(): Promise<Torrent[]> {
    if (!this.conectado) {
      // Se não conectado ou se offline, retorna lista vazia ou lança erro conforme apropriado
      return [];
    }

    try {
      const protocolo = this.config.useHttps ? 'https' : 'http';
      const url = `${protocolo}://${this.config.host}:${this.config.port}/api/v2/torrents/info`;

      const response = await fetch(url, {
        headers: this.cookieAutenticacao ? { Cookie: this.cookieAutenticacao } : {},
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar torrents: HTTP ${response.status}`);
      }

      const lista = (await response.json()) as any[];
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
    } catch {
      return [];
    }
  }

  async listarArquivos(torrentHash: string): Promise<TorrentFile[]> {
    if (!this.conectado) {
      return [];
    }

    try {
      const protocolo = this.config.useHttps ? 'https' : 'http';
      const url = `${protocolo}://${this.config.host}:${this.config.port}/api/v2/torrents/files?hash=${encodeURIComponent(torrentHash)}`;

      const response = await fetch(url, {
        headers: this.cookieAutenticacao ? { Cookie: this.cookieAutenticacao } : {},
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar arquivos do torrent: HTTP ${response.status}`);
      }

      const files = (await response.json()) as any[];
      return files.map((f, idx) => ({
        index: typeof f.index === 'number' ? f.index : idx,
        name: f.name,
        path: f.name,
        size: f.size || 0,
        progress: typeof f.progress === 'number' ? f.progress : 0,
        priority: typeof f.priority === 'number' ? (f.priority as FilePriority) : FilePriority.NORMAL,
        isAvailable: f.is_seed || f.availability > 0,
      }));
    } catch {
      return [];
    }
  }

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
      const url = `${protocolo}://${this.config.host}:${this.config.port}/api/v2/torrents/filePrio`;

      const params = new URLSearchParams();
      params.append('hash', torrentHash);
      params.append('id', fileIndices.join('|'));
      params.append('priority', prioridade.toString());

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...(this.cookieAutenticacao ? { Cookie: this.cookieAutenticacao } : {}),
        },
        body: params.toString(),
      });

      return response.ok;
    } catch {
      return false;
    }
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
