export interface TorrentClientConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  useHttps?: boolean;
  timeoutMs?: number;
  refreshInterval?: number; // Auto-refresh interval in seconds (e.g. 5, 10, 30, 60)
}
