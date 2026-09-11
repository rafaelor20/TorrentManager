import { TorrentClient } from '../../domain/client/TorrentClient.js';
import { TorrentClientConfig } from '../../domain/models/TorrentClientConfig.js';
import { TorrentClientRegistry } from '../providers/TorrentClientRegistry.js';

export type SupportedClientType = 'qbittorrent' | 'mock' | string;

export class TorrentClientFactory {
  /**
   * Creates a BitTorrent client instance from the provider layer
   */
  static criarCliente(
    tipo: SupportedClientType = 'qbittorrent',
    config?: Partial<TorrentClientConfig>
  ): TorrentClient {
    return TorrentClientRegistry.criarCliente(tipo, config);
  }

  /**
   * Returns names and identifiers of supported clients
   */
  static obterClientesSuportados(): string[] {
    return TorrentClientRegistry.listarIdsProvedores();
  }
}

