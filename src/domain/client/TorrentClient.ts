import { Torrent } from '../models/Torrent.js';
import { TorrentFile, FilePriority } from '../models/TorrentFile.js';
import { TorrentClientConfig } from '../models/TorrentClientConfig.js';

export interface ConnectionStatus {
  conectado: boolean;
  cliente: string;
  detalhes?: string;
}

/**
 * Interface de abstração para clientes BitTorrent (qBittorrent, Transmission, Deluge, etc.)
 */
export interface TorrentClient {
  /**
   * Retorna o nome identificador do cliente (ex: 'qBittorrent', 'Transmission')
   */
  obterNome(): string;

  /**
   * Verifica se o cliente está atualmente conectado e autenticado
   */
  estaConectado(): boolean;

  /**
   * Estabelece conexão e autenticação com a API do cliente BitTorrent
   */
  conectar(config?: TorrentClientConfig): Promise<boolean>;

  /**
   * Encerra a sessão ativa com o cliente BitTorrent
   */
  desconectar?(): Promise<void>;

  /**
   * Lista todos os torrents disponíveis no cliente
   */
  listarTorrents(): Promise<Torrent[]>;

  /**
   * Lista os arquivos contidos em um torrent específico
   * @param torrentHash Identificador hash do torrent
   */
  listarArquivos(torrentHash: string): Promise<TorrentFile[]>;

  /**
   * Altera a prioridade de download de arquivos dentro de um torrent
   * @param torrentHash Identificador hash do torrent
   * @param fileIndices Índices dos arquivos dentro do torrent
   * @param prioridade Nova prioridade a ser atribuída
   */
  alterarPrioridades(
    torrentHash: string,
    fileIndices: number[],
    prioridade: FilePriority
  ): Promise<boolean>;

  /**
   * Retorna o status detalhado da conexão
   */
  obterStatusConexao(): ConnectionStatus;
}
