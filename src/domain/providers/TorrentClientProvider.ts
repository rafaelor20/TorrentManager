import { TorrentClient } from '../client/TorrentClient.js';
import { TorrentClientConfig } from '../models/TorrentClientConfig.js';

export interface TorrentClientProviderInfo {
  id: string;
  nome: string;
  descricao?: string;
  versao?: string;
  autor?: string;
}

/**
 * Interface that defines the contract for BitTorrent client Providers / Plugins.
 * Each implementation (qBittorrent, Transmission, Deluge, etc.) must provide a corresponding provider.
 */
export interface TorrentClientProvider {
  /**
   * Unique provider identifier (e.g. 'qbittorrent', 'transmission', 'deluge')
   */
  readonly id: string;

  /**
   * Human-readable provider display name (e.g. 'qBittorrent', 'Transmission')
   */
  readonly nome: string;

  /**
   * Brief description of provider and supported technology
   */
  readonly descricao?: string;

  /**
   * Plugin/provider version
   */
  readonly versao?: string;

  /**
   * Creates a new TorrentClient instance with provided configuration
   */
  criarCliente(config?: Partial<TorrentClientConfig>): TorrentClient;

  /**
   * Returns descriptive metadata for the provider
   */
  obterMetadados(): TorrentClientProviderInfo;

  /**
   * Validates whether a given configuration meets the provider's minimum requirements
   */
  validarConfig?(config: Partial<TorrentClientConfig>): boolean;
}
