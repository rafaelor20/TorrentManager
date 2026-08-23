import { TorrentClient, ConnectionStatus, BatchPriorityResult } from '../../../domain/client/TorrentClient.js';
import { Torrent } from '../../../domain/models/Torrent.js';
import { TorrentFile, FilePriority } from '../../../domain/models/TorrentFile.js';
import { TorrentClientConfig } from '../../../domain/models/TorrentClientConfig.js';
import { TorrentClientProvider, TorrentClientProviderInfo } from '../../../domain/providers/TorrentClientProvider.js';

/**
 * Cliente demonstrativo em memória que comprova a arquitetura de plugins e extensibilidade
 */
export class MockTorrentClient implements TorrentClient {
  private conectado: boolean = false;
  private nome: string = 'MockTorrent (Demonstrativo)';

  private mockTorrents: Torrent[] = [
    {
      id: 'mock-torrent-001',
      hash: 'mock-torrent-001',
      name: 'Exemplo Mock Dataset 50k Files',
      size: 1024 * 1024 * 1024 * 5,
      progress: 0.75,
      status: 'downloading',
      downloadSpeed: 15 * 1024 * 1024,
      uploadSpeed: 2 * 1024 * 1024,
      eta: 3600,
    },
  ];

  private mockArquivos: TorrentFile[] = [
    { index: 0, name: 'video_sample_1080p.mp4', path: 'video_sample_1080p.mp4', size: 1024 * 1024 * 800, progress: 1, priority: 1, isAvailable: true },
    { index: 1, name: 'subtitles_pt_br.srt', path: 'subtitles_pt_br.srt', size: 45000, progress: 1, priority: 1, isAvailable: true },
    { index: 2, name: 'bonus_features.mkv', path: 'bonus_features.mkv', size: 1024 * 1024 * 400, progress: 0, priority: 0, isAvailable: false },
  ];

  obterNome(): string {
    return this.nome;
  }

  obterId(): string {
    return 'mock';
  }

  estaConectado(): boolean {
    return this.conectado;
  }

  async conectar(_config?: TorrentClientConfig): Promise<boolean> {
    this.conectado = true;
    return true;
  }

  async desconectar(): Promise<void> {
    this.conectado = false;
  }

  async listarTorrents(): Promise<Torrent[]> {
    return [...this.mockTorrents];
  }

  async listarArquivos(_torrentHash: string): Promise<TorrentFile[]> {
    return [...this.mockArquivos];
  }

  async alterarPrioridades(
    _torrentHash: string,
    fileIndices: number[],
    prioridade: FilePriority
  ): Promise<boolean> {
    const indicesSet = new Set(fileIndices);
    this.mockArquivos.forEach(f => {
      if (indicesSet.has(f.index)) {
        f.priority = prioridade;
      }
    });
    return true;
  }

  async aplicarPrioridadesEmLote(
    torrentHash: string,
    marcados: number[],
    desmarcados: number[],
    apagarDesativados: boolean = false
  ): Promise<BatchPriorityResult> {
    await this.alterarPrioridades(torrentHash, marcados, 1);
    await this.alterarPrioridades(torrentHash, desmarcados, 0);
    return {
      sucesso: true,
      marcadosAlterados: marcados.length,
      desmarcadosAlterados: desmarcados.length,
      arquivosApagados: apagarDesativados ? desmarcados.length : 0,
      espacoLiberadoBytes: apagarDesativados ? 1024 * 1024 * 400 : 0,
    };
  }

  obterInfo(): Record<string, any> {
    return {
      appVersion: 'Mock v1.0',
      webApiVersion: 'v1.0-mock',
      urlBase: 'memory://mock-client',
    };
  }

  obterStatusConexao(): ConnectionStatus {
    return {
      conectado: this.conectado,
      cliente: this.nome,
      detalhes: this.conectado ? 'Cliente mock ativo em memória.' : 'Desconectado',
    };
  }
}

/**
 * Provedor do MockTorrentClient
 */
export class MockTorrentProvider implements TorrentClientProvider {
  readonly id = 'mock';
  readonly nome = 'Mock Client';
  readonly descricao = 'Provedor demonstrativo em memória para testes e validação de plugins.';
  readonly versao = '1.0.0';

  criarCliente(_config?: Partial<TorrentClientConfig>): TorrentClient {
    return new MockTorrentClient();
  }

  obterMetadados(): TorrentClientProviderInfo {
    return {
      id: this.id,
      nome: this.nome,
      descricao: this.descricao,
      versao: this.versao,
      autor: 'Plugin Community',
    };
  }
}
