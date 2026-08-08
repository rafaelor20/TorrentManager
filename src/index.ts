import { createApp } from './server/app.js';
import { TorrentClientRegistry } from './infra/providers/TorrentClientRegistry.js';
import { TorrentClient } from './domain/client/TorrentClient.js';
import { ConfigService } from './infra/config/ConfigService.js';

// Carrega configurações persistidas do arquivo data/config.json ou ambiente
const config = ConfigService.carregar();

// Instanciação agnóstica do cliente BitTorrent através do Registro de Provedores
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
  console.log('====================================================');
  console.log('            TORRENT MANAGER — INICIADO              ');
  console.log('====================================================');
  console.log(`✓ Servidor web em execução: http://localhost:${PORT}`);
  console.log(`✓ Cliente BitTorrent ativo: ${clienteAtivo.obterNome()} (ID: ${clienteIdAtivo})`);
  console.log(`✓ Provedores suportados: [${TorrentClientRegistry.listarIdsProvedores().join(', ')}]`);
  console.log(`✓ Configuração carregada de: ${ConfigService.getPath()}`);
  console.log(`✓ Alvo ${clienteAtivo.obterNome()}: ${config.qbittorrent.useHttps ? 'https' : 'http'}://${config.qbittorrent.host}:${config.qbittorrent.port}`);
  console.log(`✓ Aplicação iniciada com sucesso (Camada de Plugins Ativa)!`);
  console.log('====================================================');

  // Tentativa inicial não bloqueante de handshake com o cliente ativo
  try {
    const conectado = await clienteAtivo.conectar();
    if (conectado) {
      console.log(`✓ Conexão com ${clienteAtivo.obterNome()} estabelecida com sucesso!`);
    } else {
      console.log(`ℹ ${clienteAtivo.obterNome()} offline ou aguardando credenciais. Use a interface web para configurar.`);
    }
  } catch (err: any) {
    console.log(`ℹ [Aviso de Conexão] ${err.message}`);
  }
});

// Tratamento de desligamento gracioso
const encerrar = async () => {
  console.log('\nFinalizando TorrentManager...');
  if (clienteAtivo.desconectar) {
    await clienteAtivo.desconectar().catch(() => {});
  }
  server.close(() => {
    console.log('TorrentManager encerrado.');
    process.exit(0);
  });
};

process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);

export { server, app, clienteAtivo };

