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

/**
 * Valida e converte um valor para porta de rede TCP válida (1 a 65535).
 * Retorna o fallback caso o valor seja inválido.
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
   * Obtém o diretório onde o executável ou runtime está localizado
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
   * Carrega variáveis de ambiente a partir de um arquivo .env localizado
   * na mesma pasta do executável ou no diretório de trabalho atual.
   *
   * Suporta:
   * - PORT=3000 ou SERVER_PORT=... ou APP_PORT=...
   * - Chaves e valores com ou sem aspas (" ou ')
   * - Linhas com export: "export PORT=8080"
   * - Comentários com # e linhas em branco
   */
  static carregarEnv(caminhoPersonalizado?: string): Record<string, string> {
    const variaveisLidas: Record<string, string> = {};

    // Locais candidatos para o arquivo .env (priorizando a pasta do executável)
    const execDir = this.obterDiretorioExecutavel();
    const cwdDir = process.cwd();

    const caminhosCandidatos = [
      caminhoPersonalizado,
      process.env.ENV_PATH,
      process.env.ENV_FILE,
      path.join(execDir, '.env'),
      path.join(cwdDir, '.env'),
    ].filter((c): c is string => Boolean(c && typeof c === 'string'));

    // Remove duplicatas mantendo a ordem de prioridade
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
              // Ignora linhas vazias ou comentários iniciados por #
              if (!trimmed || trimmed.startsWith('#')) {
                continue;
              }

              // Remove 'export ' inicial se presente (ex: export PORT=3000)
              const linhaLimpa = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
              const separadorIdx = linhaLimpa.indexOf('=');

              if (separadorIdx > 0) {
                const chave = linhaLimpa.slice(0, separadorIdx).trim();
                let valor = linhaLimpa.slice(separadorIdx + 1).trim();

                // Se o valor começa com aspas (duplas ou simples)
                if (valor.startsWith('"') || valor.startsWith("'")) {
                  const quoteChar = valor[0];
                  const closingIdx = valor.indexOf(quoteChar, 1);
                  if (closingIdx !== -1) {
                    valor = valor.slice(1, closingIdx);
                  } else {
                    valor = valor.slice(1);
                  }
                } else {
                  // Sem aspas: remove comentários inline iniciados por #
                  const hashIdx = valor.indexOf('#');
                  if (hashIdx !== -1) {
                    valor = valor.slice(0, hashIdx).trim();
                  }
                }

                // Injeta no dicionário e no process.env para que PORT e demais variáveis tenham efeito imediato
                variaveisLidas[chave] = valor;
                process.env[chave] = valor;
              }
            }

            this.loadedEnvPath = envFile;
            this.envCarregado = true;
            // Interrompe no primeiro arquivo .env válido encontrado
            break;
          }
        } catch (err) {
          console.warn(`[ConfigService] Erro ao analisar o arquivo .env em "${envFile}":`, err);
        }
      }
    }

    this.envCarregado = true;
    return variaveisLidas;
  }

  /**
   * Retorna o caminho do arquivo .env que foi carregado com sucesso (ou null se nenhum)
   */
  static getEnvPath(): string | null {
    return this.loadedEnvPath;
  }

  /**
   * Obtém o caminho do arquivo de configuração persistente (data/config.json)
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
   * Carrega a configuração mesclando arquivo .env, arquivo config.json e valores padrão.
   * A porta padrão é sempre 3000 caso nenhuma outra seja especificada no .env ou configuração.
   */
  static carregar(): AppConfig {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    // Carrega variáveis do .env na pasta do executável se ainda não tiver sido chamado
    if (!this.envCarregado) {
      this.carregarEnv();
    }

    let fileConfig: Partial<AppConfig> = {};

    // Tenta encontrar o arquivo data/config.json na pasta atual ou na pasta do executável
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
          console.warn(`[ConfigService] Aviso ao ler ${jsonPath}, usando valores padrão.`, err);
        }
      }
    }

    // Lê porta de variáveis do .env / process.env (PORT, SERVER_PORT, APP_PORT, etc.)
    const portEnvRaw =
      process.env.PORT ||
      process.env.SERVER_PORT ||
      process.env.APP_PORT ||
      process.env.TORRENT_MANAGER_PORT;

    // Normaliza a porta para um número TCP válido (1 a 65535) com fallback padrão 3000
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

