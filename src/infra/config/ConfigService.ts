import fs from 'fs';
import path from 'path';
import { TorrentClientConfig } from '../../domain/models/TorrentClientConfig.js';

export interface AppConfig {
  server: {
    port: number;
    host: string;
  };
  qbittorrent: TorrentClientConfig;
  language?: string;
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
  language: 'en',
};

/**
 * Validates and converts a value to a valid TCP network port (1 to 65535).
 * Returns fallback if the value is invalid.
 */
function normalizarPorta(valor: unknown, fallback: number = 3000): number {
  if (valor === undefined || valor === null || valor === '') {
    return fallback;
  }
  const num = Number(valor);
  if (!isNaN(num) && Number.isInteger(num) && num > 0 && num <= 65535) {
    return num;
  }
  return fallback;
}

export class ConfigService {
  private static configPath: string = path.resolve(process.cwd(), 'data/config.json');
  private static cachedConfig: AppConfig | null = null;
  private static loadedEnvPath: string | null = null;
  private static envCarregado: boolean = false;

  /**
   * Gets the directory where the executable or runtime is located
   */
  static obterDiretorioExecutavel(): string {
    try {
      if (process.execPath) {
        return path.dirname(process.execPath);
      }
    } catch {
      // Fallback
    }
    return process.cwd();
  }

  /**
   * Loads environment variables from a .env file located
   * in the same folder as the executable or in the current working directory.
   *
   * Supports:
   * - PORT=3000 or SERVER_PORT=... or APP_PORT=...
   * - Keys and values with or without quotes (" or ')
   * - Lines starting with export: "export PORT=8080"
   * - Comments with # and blank lines
   */
  static carregarEnv(caminhoPersonalizado?: string): Record<string, string> {
    const variaveisLidas: Record<string, string> = {};

    // Candidate locations for the .env file (prioritizing executable directory)
    const execDir = this.obterDiretorioExecutavel();
    const cwdDir = process.cwd();

    const caminhosCandidatos = [
      caminhoPersonalizado,
      process.env.ENV_PATH,
      process.env.ENV_FILE,
      path.join(execDir, '.env'),
      path.join(cwdDir, '.env'),
    ].filter((c): c is string => Boolean(c && typeof c === 'string'));

    // Remove duplicates preserving priority order
    const caminhosUnicos = Array.from(new Set(caminhosCandidatos));

    for (const envFile of caminhosUnicos) {
      if (fs.existsSync(envFile)) {
        try {
          const stats = fs.statSync(envFile);
          if (stats.isFile()) {
            const conteudo = fs.readFileSync(envFile, 'utf-8');
            const linhas = conteudo.split(/\r?\n/);

            for (const linha of linhas) {
              const trimmed = linha.trim();
              // Ignore empty lines or comments starting with #
              if (!trimmed || trimmed.startsWith('#')) {
                continue;
              }

              // Remove leading 'export ' if present (e.g., export PORT=3000)
              const linhaLimpa = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
              const separadorIdx = linhaLimpa.indexOf('=');

              if (separadorIdx > 0) {
                const chave = linhaLimpa.slice(0, separadorIdx).trim();
                let valor = linhaLimpa.slice(separadorIdx + 1).trim();

                // If the value starts with quotes (double or single)
                if (valor.startsWith('"') || valor.startsWith("'")) {
                  const quoteChar = valor[0];
                  const closingIdx = valor.indexOf(quoteChar, 1);
                  if (closingIdx !== -1) {
                    valor = valor.slice(1, closingIdx);
                  } else {
                    valor = valor.slice(1);
                  }
                } else {
                  // Without quotes: remove inline comments starting with #
                  const hashIdx = valor.indexOf('#');
                  if (hashIdx !== -1) {
                    valor = valor.slice(0, hashIdx).trim();
                  }
                }

                // Inject into dictionary and process.env so that PORT and other variables take immediate effect
                variaveisLidas[chave] = valor;
                process.env[chave] = valor;
              }
            }

            this.loadedEnvPath = envFile;
            this.envCarregado = true;
            // Stop at the first valid .env file found
            break;
          }
        } catch (err) {
          console.warn(`[ConfigService] Error parsing .env file at "${envFile}":`, err);
        }
      }
    }

    this.envCarregado = true;
    return variaveisLidas;
  }

  /**
   * Returns the path of the .env file successfully loaded (or null if none)
   */
  static getEnvPath(): string | null {
    return this.loadedEnvPath;
  }

  /**
   * Gets the path of the persistent configuration file (data/config.json)
   */
  static getPath(): string {
    return this.configPath;
  }

  /**
   * Sets a custom path for the configuration file
   */
  static setPath(newPath: string): void {
    this.configPath = newPath;
    this.cachedConfig = null;
  }

  /**
   * Loads configuration merging .env file, config.json file, and default values.
   * Default port is always 3000 if none other is specified in .env or config.
   */
  static carregar(): AppConfig {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    // Load .env variables from executable directory if not already loaded
    if (!this.envCarregado) {
      this.carregarEnv();
    }

    let fileConfig: Partial<AppConfig> = {};

    // Try to find data/config.json file in current directory or executable directory
    const execDir = this.obterDiretorioExecutavel();
    const possiveisCaminhosJson = [
      this.configPath,
      path.join(execDir, 'data/config.json'),
      path.resolve(process.cwd(), 'data/config.json'),
    ];

    for (const jsonPath of possiveisCaminhosJson) {
      if (fs.existsSync(jsonPath)) {
        try {
          const content = fs.readFileSync(jsonPath, 'utf-8');
          fileConfig = JSON.parse(content);
          this.configPath = jsonPath;
          break;
        } catch (err) {
          console.warn(`[ConfigService] Warning reading ${jsonPath}, using default values.`, err);
        }
      }
    }

    // Read port from .env / process.env variables (PORT, SERVER_PORT, APP_PORT, etc.)
    const portEnvRaw =
      process.env.PORT ||
      process.env.SERVER_PORT ||
      process.env.APP_PORT ||
      process.env.TORRENT_MANAGER_PORT;

    // Normalize port to a valid TCP number (1 to 65535) with default fallback 3000
    let portaFinal = DEFAULT_CONFIG.server.port; // 3000
    if (portEnvRaw !== undefined && portEnvRaw !== '') {
      portaFinal = normalizarPorta(portEnvRaw, DEFAULT_CONFIG.server.port);
    } else if (fileConfig.server?.port !== undefined) {
      portaFinal = normalizarPorta(fileConfig.server.port, DEFAULT_CONFIG.server.port);
    }

    const hostEnv = process.env.HOST || process.env.SERVER_HOST;
    const qbHostEnv = process.env.QBIT_HOST;
    const qbPortEnv = process.env.QBIT_PORT ? normalizarPorta(process.env.QBIT_PORT, 8877) : undefined;
    const qbUserEnv = process.env.QBIT_USER;
    const qbPassEnv = process.env.QBIT_PASSWORD;
    const qbHttpsEnv = process.env.QBIT_HTTPS !== undefined ? process.env.QBIT_HTTPS === 'true' : undefined;
    const qbRefreshEnv = process.env.QBIT_REFRESH ? Number(process.env.QBIT_REFRESH) : undefined;
    const qbTimeoutEnv = process.env.QBIT_TIMEOUT ? Number(process.env.QBIT_TIMEOUT) : undefined;

    const langEnv = process.env.APP_LANG || process.env.LANGUAGE;
    const finalLanguage = (langEnv as string) || fileConfig.language || DEFAULT_CONFIG.language || 'en';

    const mergedConfig: AppConfig = {
      server: {
        port: portaFinal,
        host: hostEnv || fileConfig.server?.host || DEFAULT_CONFIG.server.host,
      },
      qbittorrent: {
        host: qbHostEnv || fileConfig.qbittorrent?.host || DEFAULT_CONFIG.qbittorrent.host,
        port: qbPortEnv || fileConfig.qbittorrent?.port || DEFAULT_CONFIG.qbittorrent.port,
        username: qbUserEnv ?? fileConfig.qbittorrent?.username ?? DEFAULT_CONFIG.qbittorrent.username,
        password: qbPassEnv ?? fileConfig.qbittorrent?.password ?? DEFAULT_CONFIG.qbittorrent.password,
        useHttps: qbHttpsEnv !== undefined ? qbHttpsEnv : (fileConfig.qbittorrent?.useHttps ?? DEFAULT_CONFIG.qbittorrent.useHttps),
        timeoutMs: qbTimeoutEnv ?? fileConfig.qbittorrent?.timeoutMs ?? DEFAULT_CONFIG.qbittorrent.timeoutMs,
        refreshInterval: qbRefreshEnv ?? fileConfig.qbittorrent?.refreshInterval ?? DEFAULT_CONFIG.qbittorrent.refreshInterval,
      },
      language: finalLanguage,
    };

    this.cachedConfig = mergedConfig;
    return mergedConfig;
  }

  /**
   * Saves updated configuration to JSON file persistently
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
      language: novaConfig.language !== undefined ? novaConfig.language : (configAtual.language || 'en'),
    };

    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.configPath, JSON.stringify(configAtualizada, null, 2), 'utf-8');
      this.cachedConfig = configAtualizada;
    } catch (err) {
      console.error(`[ConfigService] Error saving configuration file at ${this.configPath}:`, err);
      throw new Error(`Failed to persist configurations to file: ${(err as Error).message}`);
    }

    return configAtualizada;
  }

  /**
   * Specifically saves qBittorrent configuration
   */
  static salvarQBittorrent(config: Partial<TorrentClientConfig>): AppConfig {
    return this.salvar({ qbittorrent: config as TorrentClientConfig });
  }
}

