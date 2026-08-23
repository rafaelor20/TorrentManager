export type TorrentState =
  | 'downloading'
  | 'uploading'
  | 'paused'
  | 'completed'
  | 'queued'
  | 'checking'
  | 'error'
  | 'unknown';

export interface Torrent {
  id: string;
  hash: string;
  name: string;
  size: number;
  progress: number; // 0.0 a 1.0 ou 0 a 100%
  status: TorrentState;
  downloadSpeed?: number;
  uploadSpeed?: number;
  eta?: number;
  addedOn?: Date;
  completedOn?: Date;
  rawState?: string;
  savePath?: string;
  contentPath?: string;
  category?: string;
  tags?: string[];
}
