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
 * Interface de abstração agnóstica para clientes BitTorrent (qBittorrent, Transmission, Deluge, etc.)
 */
export interface TorrentClient {
  /**
   * Retorna o nome identificador do cliente (ex: 'qBittorrent', 'Transmission', 'Deluge')
   */
  obterNome(): string;

  /**
   * Retorna o identificador único do provedor/plugin (ex: 'qbittorrent', 'transmission')
   */
  obterId?(): string;

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
   * Lista os arquivos de múltiplos torrents em lote
   * @param torrentHashes Lista de hashes de torrents
   */
  listarArquivosEmLote?(torrentHashes: string[]): Promise<Record<string, TorrentFile[]>>;

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
   * Aplica prioridades em lote separando marcados (download normal) e desmarcados (não baixar),
   * com opção de apagar os arquivos físicos desativados do disco.
   */
  aplicarPrioridadesEmLote?(
    torrentHash: string,
    marcados: number[],
    desmarcados: number[],
    apagarDesativados?: boolean
  ): Promise<BatchPriorityResult>;

  /**
   * Exclui arquivos físicos do disco associados aos índices especificados do torrent
   */
  apagarArquivos?(
    torrentHash: string,
    fileIndices: number[]
  ): Promise<FileDeletionResult>;

  /**
   * Abre a pasta do arquivo no gerenciador de arquivos do sistema operacional nativo
   */
  abrirPastaArquivo?(
    torrentHash: string,
    fileIndex: number
  ): Promise<{ sucesso: boolean; mensagem?: string; caminho?: string; naoBaixado?: boolean }>;

  /**
   * Retorna informações de diagnóstico e versões do cliente (sem acoplamento direto)
   */
  obterInfo?(): Record<string, any> | null;

  /**
   * Atualiza a configuração em tempo de execução
   */
  atualizarConfig?(config: Partial<TorrentClientConfig>): void;

  /**
   * Retorna o status detalhado da conexão
   */
  obterStatusConexao(): ConnectionStatus;
}

