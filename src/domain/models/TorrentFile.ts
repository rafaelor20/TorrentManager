export enum FilePriority {
  DO_NOT_DOWNLOAD = 0,
  NORMAL = 1,
  HIGH = 6,
  MAXIMAL = 7
}

export interface TorrentFile {
  index: number;
  name: string;
  path: string;
  size: number;
  progress: number;
  priority: FilePriority;
  isAvailable?: boolean;
}
