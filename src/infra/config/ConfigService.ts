import fs from 'fs';
import path from 'path';
import { TorrentClientConfig } from '../../domain/models/TorrentClientConfig.js';

export interface AppConfig {
  server: {
    port: number;
    host: string;
  };
  qbittorrent: TorrentClientConfig;
}

export const DEFAULT_CONFIG: AppConfig = {
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  qbittorrent: {
    host: 'localhost',
    port: 8877,
    username: 'admin',
    password: 'Ozzy261220',
    useHttps: false,
    timeoutMs: 5000,
    refreshInterval: 10,
  },
};

export class ConfigService {
  private static configPath: string = path.resolve(process.cwd(), 'data/config.json');
  private static cachedConfig: AppConfig | null = null;

  /**
   * Obtém o caminho do arquivo de configuração
   */
  static getPath(): string {
    return this.configPath;
  }

  /**
   * Define um caminho personalizado para o arquivo de configuração
   */
  static setPath(newPath: string): void {
    this.configPath = newPath;
    this.cachedConfig = null;
  }

  /**
   * Carrega a configuração mesclando arquivo, variáveis de ambiente e padrões
   */
  static carregar(): AppConfig {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    let fileConfig: Partial<AppConfig> = {};

    try {
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        fileConfig = JSON.parse(content);
      }
    } catch (err) {
      console.warn(`[ConfigService] Não foi possível ler ${this.configPath}, usando valores padrão.`, err);
    }

    // Mescla com variáveis de ambiente se disponíveis
    const portEnv = process.env.PORT ? Number(process.env.PORT) : undefined;
    const qbHostEnv = process.env.QBIT_HOST;
    const qbPortEnv = process.env.QBIT_PORT ? Number(process.env.QBIT_PORT) : undefined;
    const qbUserEnv = process.env.QBIT_USER;
    const qbPassEnv = process.env.QBIT_PASSWORD;
    const qbHttpsEnv = process.env.QBIT_HTTPS !== undefined ? process.env.QBIT_HTTPS === 'true' : undefined;
    const qbRefreshEnv = process.env.QBIT_REFRESH ? Number(process.env.QBIT_REFRESH) : undefined;

    const mergedConfig: AppConfig = {
      server: {
        port: portEnv || fileConfig.server?.port || DEFAULT_CONFIG.server.port,
        host: fileConfig.server?.host || DEFAULT_CONFIG.server.host,
      },
      qbittorrent: {
        host: qbHostEnv || fileConfig.qbittorrent?.host || DEFAULT_CONFIG.qbittorrent.host,
        port: qbPortEnv || fileConfig.qbittorrent?.port || DEFAULT_CONFIG.qbittorrent.port,
        username: qbUserEnv ?? fileConfig.qbittorrent?.username ?? DEFAULT_CONFIG.qbittorrent.username,
        password: qbPassEnv ?? fileConfig.qbittorrent?.password ?? DEFAULT_CONFIG.qbittorrent.password,
        useHttps: qbHttpsEnv !== undefined ? qbHttpsEnv : (fileConfig.qbittorrent?.useHttps ?? DEFAULT_CONFIG.qbittorrent.useHttps),
        timeoutMs: fileConfig.qbittorrent?.timeoutMs ?? DEFAULT_CONFIG.qbittorrent.timeoutMs,
        refreshInterval: qbRefreshEnv ?? fileConfig.qbittorrent?.refreshInterval ?? DEFAULT_CONFIG.qbittorrent.refreshInterval,
      },
    };

    this.cachedConfig = mergedConfig;
    return mergedConfig;
  }

  /**
   * Salva a configuração atualizada no arquivo JSON de forma persistente
   */
  static salvar(novaConfig: Partial<AppConfig>): AppConfig {
    const configAtual = this.carregar();
    const configAtualizada: AppConfig = {
      server: {
        ...configAtual.server,
        ...novaConfig.server,
      },
      qbittorrent: {
        ...configAtual.qbittorrent,
        ...novaConfig.qbittorrent,
      },
    };

    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.configPath, JSON.stringify(configAtualizada, null, 2), 'utf-8');
      this.cachedConfig = configAtualizada;
    } catch (err) {
      console.error(`[ConfigService] Erro ao salvar arquivo de configuração em ${this.configPath}:`, err);
      throw new Error(`Falha ao persistir configurações no arquivo: ${(err as Error).message}`);
    }

    return configAtualizada;
  }

  /**
   * Salva especificamente a configuração do qBittorrent
   */
  static salvarQBittorrent(config: Partial<TorrentClientConfig>): AppConfig {
    return this.salvar({ qbittorrent: config as TorrentClientConfig });
  }
}
