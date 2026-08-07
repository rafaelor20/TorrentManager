import { createApp } from './server/app.js';
import { TorrentClientFactory } from './infra/clients/TorrentClientFactory.js';
import { TorrentClient } from './domain/client/TorrentClient.js';

// Instanciação da camada de abstração de cliente BitTorrent
// Trocar a implementação exige apenas alterar a instância ou tipo criado:
const clienteAtivo: TorrentClient = TorrentClientFactory.criarCliente('qbittorrent', {
  host: process.env.QBIT_HOST || 'localhost',
  port: Number(process.env.QBIT_PORT) || 8080,
  username: process.env.QBIT_USER || 'admin',
  password: process.env.QBIT_PASSWORD || 'adminadmin',
  useHttps: process.env.QBIT_HTTPS === 'true',
});

const PORT = Number(process.env.PORT) || 3000;
const app = createApp(clienteAtivo);

const server = app.listen(PORT, () => {
  console.log('====================================================');
  console.log('            TORRENT MANAGER — INICIADO              ');
  console.log('====================================================');
  console.log(`✓ Servidor web em execução: http://localhost:${PORT}`);
  console.log(`✓ Cliente BitTorrent ativo: ${clienteAtivo.obterNome()}`);
  console.log(`✓ Aplicação iniciada com sucesso!`);
  console.log('====================================================');
});

// Tratamento de desligamento gracioso
const encerrar = () => {
  console.log('\nFinalizando TorrentManager...');
  server.close(() => {
    console.log('TorrentManager encerrado.');
    process.exit(0);
  });
};

process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);

export { server, app, clienteAtivo };
