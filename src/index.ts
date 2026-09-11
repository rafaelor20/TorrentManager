import { createApp } from './server/app.js';
import { TorrentClientRegistry } from './infra/providers/TorrentClientRegistry.js';
import { TorrentClient } from './domain/client/TorrentClient.js';
import { ConfigService } from './infra/config/ConfigService.js';

// Load persisted configurations from data/config.json file or environment
const config = ConfigService.carregar();

// Agnostic BitTorrent client instantiation through Provider Registry
const clienteIdAtivo = process.env.TORRENT_CLIENT_TYPE || 'qbittorrent';
const clienteAtivo: TorrentClient = TorrentClientRegistry.criarCliente(clienteIdAtivo, {
  host: config.qbittorrent.host,
  port: config.qbittorrent.port,
  username: config.qbittorrent.username,
  password: config.qbittorrent.password,
  useHttps: config.qbittorrent.useHttps,
  timeoutMs: config.qbittorrent.timeoutMs,
});

const PORT = config.server.port;
const app = createApp(clienteAtivo);

const server = app.listen(PORT, async () => {
  const envPath = ConfigService.getEnvPath();
  const hostExibicao = config.server.host === '0.0.0.0' ? 'localhost' : config.server.host;

  console.log('====================================================');
  console.log('            TORRENT MANAGER — STARTED               ');
  console.log('====================================================');
  console.log(`✓ Web server running: http://${hostExibicao}:${PORT}`);
  if (envPath) {
    console.log(`✓ Settings loaded from .env file: ${envPath}`);
  } else {
    console.log(`ℹ Default port ${PORT} in use (Set PORT in .env file in executable folder to customize)`);
  }
  console.log(`✓ Active BitTorrent client: ${clienteAtivo.obterNome()} (ID: ${clienteIdAtivo})`);
  console.log(`✓ Supported providers: [${TorrentClientRegistry.listarIdsProvedores().join(', ')}]`);
  console.log(`✓ JSON persistence: ${ConfigService.getPath()}`);
  console.log(`✓ Target ${clienteAtivo.obterNome()}: ${config.qbittorrent.useHttps ? 'https' : 'http'}://${config.qbittorrent.host}:${config.qbittorrent.port}`);
  console.log(`✓ Application started successfully!`);
  console.log('====================================================');

  // Initial non-blocking handshake attempt with active client
  try {
    const conectado = await clienteAtivo.conectar();
    if (conectado) {
      console.log(`✓ Connection to ${clienteAtivo.obterNome()} established successfully!`);
    } else {
      console.log(`ℹ ${clienteAtivo.obterNome()} offline or awaiting credentials. Use the web interface to configure.`);
    }
  } catch (err: any) {
    console.log(`ℹ [Connection Warning] ${err.message}`);
  }
});

// Graceful shutdown handling
const encerrar = async () => {
  console.log('\nShutting down TorrentManager...');
  if (clienteAtivo.desconectar) {
    await clienteAtivo.desconectar().catch(() => {});
  }
  server.close(() => {
    console.log('TorrentManager shut down.');
    process.exit(0);
  });
};

process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);

export { server, app, clienteAtivo };

