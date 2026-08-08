import { TorrentClient } from '../../domain/client/TorrentClient.js';
import { TorrentClientConfig } from '../../domain/models/TorrentClientConfig.js';
import { TorrentClientProvider, TorrentClientProviderInfo } from '../../domain/providers/TorrentClientProvider.js';
import { QBittorrentProvider } from './qbittorrent/QBittorrentProvider.js';
import { MockTorrentProvider } from './mock/MockTorrentProvider.js';

/**
 * Registro central de Provedores / Plugins de clientes BitTorrent.
 * Isola completamente as regras de negócio de qualquer detalhe de implementação de cliente específico.
 */
export class TorrentClientRegistry {
  private static provedores: Map<string, TorrentClientProvider> = new Map();
  private static inicializado: boolean = false;

  /**
   * Inicializa o registro com os provedores padrão integrados
   */
  private static garantirInicializado(): void {
    if (!this.inicializado) {
      this.inicializado = true;
      this.registrarProvedor(new QBittorrentProvider());
      this.registrarProvedor(new MockTorrentProvider());
    }
  }

  /**
   * Registra um novo provedor / plugin de cliente BitTorrent
   */
  static registrarProvedor(provedor: TorrentClientProvider): void {
    if (!provedor || !provedor.id) {
      throw new Error('Provedor inválido: o identificador "id" é obrigatório.');
    }
    this.provedores.set(provedor.id.toLowerCase(), provedor);
  }

  /**
   * Obtém um provedor pelo seu ID
   */
  static obterProvedor(id: string): TorrentClientProvider | undefined {
    this.garantirInicializado();
    return this.provedores.get(id.toLowerCase());
  }

  /**
   * Cria uma instância de TorrentClient a partir do ID do provedor registrado
   */
  static criarCliente(id: string, config?: Partial<TorrentClientConfig>): TorrentClient {
    this.garantirInicializado();
    const provedor = this.obterProvedor(id);
    if (!provedor) {
      const suportados = this.listarIdsProvedores().join(', ');
      throw new Error(`Provedor de cliente BitTorrent não encontrado: "${id}". Provedores disponíveis: [${suportados}].`);
    }
    return provedor.criarCliente(config);
  }

  /**
   * Retorna os metadados de todos os provedores registrados
   */
  static listarProvedores(): TorrentClientProviderInfo[] {
    this.garantirInicializado();
    return Array.from(this.provedores.values()).map(p => p.obterMetadados());
  }

  /**
   * Retorna apenas os IDs dos provedores disponíveis
   */
  static listarIdsProvedores(): string[] {
    this.garantirInicializado();
    return Array.from(this.provedores.keys());
  }
}
