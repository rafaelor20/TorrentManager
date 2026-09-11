import { Torrent } from '../models/Torrent.js';
import { TorrentFile, FilePriority } from '../models/TorrentFile.js';
import { TorrentClientConfig } from '../models/TorrentClientConfig.js';

export interface ConnectionStatus {
  conectado: boolean;
  cliente: string;
  detalhes?: string;
}

export interface BatchPriorityResult {
  sucesso: boolean;
  marcadosAlterados: number;
  desmarcadosAlterados: number;
  arquivosApagados?: number;
  espacoLiberadoBytes?: number;
  detalhesExclusao?: {
    apagados: string[];
    falhas: { arquivo: string; erro: string }[];
  };
}

export interface FileDeletionResult {
  sucesso: boolean;
  arquivosApagados: number;
  espacoLiberadoBytes: number;
  apagados: string[];
  falhas: { arquivo: string; erro: string }[];
}

/**
 * Agnostic abstraction interface for BitTorrent clients (qBittorrent, Transmission, Deluge, etc.)
 */
export interface TorrentClient {
  /**
   * Returns client identifier name (e.g., 'qBittorrent', 'Transmission', 'Deluge')
   */
  obterNome(): string;

  /**
   * Returns unique identifier of provider/plugin (e.g., 'qbittorrent', 'transmission')
   */
  obterId?(): string;

  /**
   * Checks whether the client is currently connected and authenticated
   */
  estaConectado(): boolean;

  /**
   * Establishes connection and authentication with BitTorrent client API
   */
  conectar(config?: TorrentClientConfig): Promise<boolean>;

  /**
   * Closes active session with BitTorrent client
   */
  desconectar?(): Promise<void>;

  /**
   * Lists all torrents available in client
   */
  listarTorrents(): Promise<Torrent[]>;

  /**
   * Lists files contained within a specific torrent
   * @param torrentHash Torrent hash identifier
   */
  listarArquivos(torrentHash: string): Promise<TorrentFile[]>;

  /**
   * Lists files of multiple torrents in batch
   * @param torrentHashes List of torrent hashes
   */
  listarArquivosEmLote?(torrentHashes: string[]): Promise<Record<string, TorrentFile[]>>;

  /**
   * Changes download priority of files within a torrent
   * @param torrentHash Torrent hash identifier
   * @param fileIndices File indices within the torrent
   * @param prioridade New priority to assign
   */
  alterarPrioridades(
    torrentHash: string,
    fileIndices: number[],
    prioridade: FilePriority
  ): Promise<boolean>;

  /**
   * Applies priorities in batch separating marked (normal download) and unmarked (do not download),
   * with the option to delete disabled physical files from disk.
   */
  aplicarPrioridadesEmLote?(
    torrentHash: string,
    marcados: number[],
    desmarcados: number[],
    apagarDesativados?: boolean
  ): Promise<BatchPriorityResult>;

  /**
   * Deletes physical files from disk associated with specified torrent indices
   */
  apagarArquivos?(
    torrentHash: string,
    fileIndices: number[]
  ): Promise<FileDeletionResult>;

  /**
   * Opens file directory in native operating system file manager
   */
  abrirPastaArquivo?(
    torrentHash: string,
    fileIndex: number
  ): Promise<{ sucesso: boolean; mensagem?: string; caminho?: string; naoBaixado?: boolean }>;

  /**
   * Returns diagnostic information and client versions (loosely coupled)
   */
  obterInfo?(): Record<string, any> | null;

  /**
   * Updates configuration at runtime
   */
  atualizarConfig?(config: Partial<TorrentClientConfig>): void;

  /**
   * Returns detailed connection status
   */
  obterStatusConexao(): ConnectionStatus;
}

