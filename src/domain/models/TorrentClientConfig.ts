export interface TorrentClientConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  useHttps?: boolean;
  timeoutMs?: number;
  refreshInterval?: number; // Intervalo de atualização automática em segundos (ex: 5, 10, 30, 60)
}
