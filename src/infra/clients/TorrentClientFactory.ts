import { TorrentClient } from '../../domain/client/TorrentClient.js';
import { TorrentClientConfig } from '../../domain/models/TorrentClientConfig.js';
import { QBittorrentClient } from './QBittorrentClient.js';

export type SupportedClientType = 'qbittorrent' | string;

export class TorrentClientFactory {
  /**
   * Cria uma instância de cliente BitTorrent conforme o tipo especificado
   * Permite alternar a implementação com apenas uma linha de código
   */
  static criarCliente(
    tipo: SupportedClientType = 'qbittorrent',
    config?: Partial<TorrentClientConfig>
  ): TorrentClient {
    switch (tipo.toLowerCase()) {
      case 'qbittorrent':
        return new QBittorrentClient(config);
      default:
        throw new Error(`Cliente BitTorrent não suportado: ${tipo}. Atualmente o cliente disponível é o 'qbittorrent'.`);
    }
  }

  /**
   * Retorna os nomes dos clientes suportados
   */
  static obterClientesSuportados(): string[] {
    return ['qbittorrent'];
  }
}
