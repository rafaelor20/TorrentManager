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
 * Interface que define o contrato para Provedores / Plugins de clientes BitTorrent.
 * Cada implementação (qBittorrent, Transmission, Deluge, etc.) deve fornecer um provedor correspondente.
 */
export interface TorrentClientProvider {
  /**
   * Identificador único do provedor (ex: 'qbittorrent', 'transmission', 'deluge')
   */
  readonly id: string;

  /**
   * Nome legível do provedor para exibição (ex: 'qBittorrent', 'Transmission')
   */
  readonly nome: string;

  /**
   * Descrição breve do provedor e da tecnologia suportada
   */
  readonly descricao?: string;

  /**
   * Versão do plugin/provedor
   */
  readonly versao?: string;

  /**
   * Cria uma nova instância de TorrentClient com as configurações fornecidas
   */
  criarCliente(config?: Partial<TorrentClientConfig>): TorrentClient;

  /**
   * Retorna os metadados descritivos do provedor
   */
  obterMetadados(): TorrentClientProviderInfo;

  /**
   * Valida se uma dada configuração atende aos requisitos mínimos do provedor
   */
  validarConfig?(config: Partial<TorrentClientConfig>): boolean;
}
