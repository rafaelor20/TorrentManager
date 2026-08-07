export interface TorrentClientConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  useHttps?: boolean;
  timeoutMs?: number;
}
