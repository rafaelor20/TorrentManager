import { TorrentClientProvider, TorrentClientProviderInfo } from '../../../domain/providers/TorrentClientProvider.js';
import { TorrentClient } from '../../../domain/client/TorrentClient.js';
import { TorrentClientConfig } from '../../../domain/models/TorrentClientConfig.js';
import { QBittorrentClient } from '../../clients/QBittorrentClient.js';

/**
 * Provedor oficial do cliente qBittorrent via Web API v2
 */
export class QBittorrentProvider implements TorrentClientProvider {
  readonly id = 'qbittorrent';
  readonly nome = 'qBittorrent';
  readonly descricao = 'Suporte completo ao cliente qBittorrent via Web API v2 com autenticação SID.';
  readonly versao = '1.0.0';

  criarCliente(config?: Partial<TorrentClientConfig>): TorrentClient {
    return new QBittorrentClient(config);
  }

  obterMetadados(): TorrentClientProviderInfo {
    return {
      id: this.id,
      nome: this.nome,
      descricao: this.descricao,
      versao: this.versao,
      autor: 'TorrentManager Core Team',
    };
  }

  validarConfig(config: Partial<TorrentClientConfig>): boolean {
    if (!config.host || !config.port) {
      return false;
    }
    return true;
  }
}
