import { TorrentClient } from '../../domain/client/TorrentClient.js';
import { TorrentClientConfig } from '../../domain/models/TorrentClientConfig.js';
import { TorrentClientRegistry } from '../providers/TorrentClientRegistry.js';

export type SupportedClientType = 'qbittorrent' | 'mock' | string;

export class TorrentClientFactory {
  /**
   * Cria uma instância de cliente BitTorrent a partir da camada de provedores
   */
  static criarCliente(
    tipo: SupportedClientType = 'qbittorrent',
    config?: Partial<TorrentClientConfig>
  ): TorrentClient {
    return TorrentClientRegistry.criarCliente(tipo, config);
  }

  /**
   * Retorna os nomes e identificadores dos clientes suportados
   */
  static obterClientesSuportados(): string[] {
    return TorrentClientRegistry.listarIdsProvedores();
  }
}

