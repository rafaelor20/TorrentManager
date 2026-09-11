import { TorrentClient } from '../../domain/client/TorrentClient.js';
import { TorrentClientConfig } from '../../domain/models/TorrentClientConfig.js';
import { TorrentClientProvider, TorrentClientProviderInfo } from '../../domain/providers/TorrentClientProvider.js';
import { QBittorrentProvider } from './qbittorrent/QBittorrentProvider.js';
import { MockTorrentProvider } from './mock/MockTorrentProvider.js';

/**
 * Central registry of BitTorrent client Providers / Plugins.
 * Completely isolates business rules from specific client implementation details.
 */
export class TorrentClientRegistry {
  private static provedores: Map<string, TorrentClientProvider> = new Map();
  private static inicializado: boolean = false;

  /**
   * Initializes the registry with default built-in providers
   */
  private static garantirInicializado(): void {
    if (!this.inicializado) {
      this.inicializado = true;
      this.registrarProvedor(new QBittorrentProvider());
      this.registrarProvedor(new MockTorrentProvider());
    }
  }

  /**
   * Registers a new BitTorrent client provider / plugin
   */
  static registrarProvedor(provedor: TorrentClientProvider): void {
    if (!provedor || !provedor.id) {
      throw new Error('Invalid provider: identifier "id" is required.');
    }
    this.provedores.set(provedor.id.toLowerCase(), provedor);
  }

  /**
   * Gets a provider by its ID
   */
  static obterProvedor(id: string): TorrentClientProvider | undefined {
    this.garantirInicializado();
    return this.provedores.get(id.toLowerCase());
  }

  /**
   * Creates a TorrentClient instance from registered provider ID
   */
  static criarCliente(id: string, config?: Partial<TorrentClientConfig>): TorrentClient {
    this.garantirInicializado();
    const provedor = this.obterProvedor(id);
    if (!provedor) {
      const suportados = this.listarIdsProvedores().join(', ');
      throw new Error(`BitTorrent client provider not found: "${id}". Available providers: [${suportados}].`);
    }
    return provedor.criarCliente(config);
  }

  /**
   * Returns metadata for all registered providers
   */
  static listarProvedores(): TorrentClientProviderInfo[] {
    this.garantirInicializado();
    return Array.from(this.provedores.values()).map(p => p.obterMetadados());
  }

  /**
   * Returns IDs of available providers only
   */
  static listarIdsProvedores(): string[] {
    this.garantirInicializado();
    return Array.from(this.provedores.keys());
  }
}
