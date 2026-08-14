import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const RELEASE_DIR = path.join(ROOT_DIR, 'release');
const BUNDLE_FILE = path.join(DIST_DIR, 'bundle.cjs');
const BLOB_FILE = path.join(DIST_DIR, 'sea-prep.blob');
const FINAL_LINUX_BIN = path.join(RELEASE_DIR, 'TorrentManager');
const SEA_CONFIG = path.join(ROOT_DIR, 'sea-config.json');

console.log('================================================================');
console.log('       COMPILAÇÃO DE EXECUTÁVEL NATIVO LINUX (ELF x64)          ');
console.log('       TorrentManager • Single Executable Application (SEA)      ');
console.log('================================================================\n');

// 1. Criar pastas necessárias
[DIST_DIR, RELEASE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 2. Compilar TypeScript
console.log('Passo 1/5: Compilando TypeScript (tsc)...');
execSync('npx tsc', { stdio: 'inherit', cwd: ROOT_DIR });
console.log('✓ TypeScript compilado com sucesso.\n');

// 3. Gerar Bundle com esbuild
console.log('Passo 2/5: Empacotando código com esbuild em bundle único...');
execSync(
  `npx esbuild src/index.ts --bundle --platform=node --target=node20 --format=cjs --outfile="${BUNDLE_FILE}"`,
  { stdio: 'inherit', cwd: ROOT_DIR }
);
console.log(`✓ Bundle CJS gerado: ${BUNDLE_FILE}\n`);

// 4. Gerar Blob SEA (Single Executable Application)
console.log('Passo 3/5: Gerando Blob de aplicação executável pelo Node.js...');
if (!fs.existsSync(SEA_CONFIG)) {
  fs.writeFileSync(
    SEA_CONFIG,
    JSON.stringify({ main: 'dist/bundle.cjs', output: 'dist/sea-prep.blob', disableExperimentalSEAWarning: true }, null, 2),
    'utf-8'
  );
}

execSync(`node --experimental-sea-config "${SEA_CONFIG}"`, {
  stdio: 'inherit',
  cwd: ROOT_DIR,
});
console.log(`✓ Blob binário gerado: ${BLOB_FILE}\n`);

// 5. Copiar binário base do Node.js
console.log('Passo 4/5: Preparando binário base Linux do Node.js...');
const nodeBinary = process.execPath;
fs.copyFileSync(nodeBinary, FINAL_LINUX_BIN);
fs.chmodSync(FINAL_LINUX_BIN, 0o755);
console.log(`✓ Binário base copiado de: ${nodeBinary}\n`);

// 6. Injetar Blob no executável via postject
console.log('Passo 5/5: Injetando código e recursos no TorrentManager via postject...');
const postjectCmd = [
  'npx postject',
  `"${FINAL_LINUX_BIN}"`,
  'NODE_SEA_BLOB',
  `"${BLOB_FILE}"`,
  '--sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
].join(' ');

execSync(postjectCmd, { stdio: 'inherit', cwd: ROOT_DIR });
fs.chmodSync(FINAL_LINUX_BIN, 0o755);
console.log(`✓ Executável Linux criado com sucesso: ${FINAL_LINUX_BIN}\n`);

// 7. Preparar pacote portátil em release/
console.log('Preparando arquivos auxiliares na pasta release/...');
const releasePublic = path.join(RELEASE_DIR, 'public');
const releaseData = path.join(RELEASE_DIR, 'data');

if (!fs.existsSync(releasePublic)) fs.mkdirSync(releasePublic, { recursive: true });
if (!fs.existsSync(releaseData)) fs.mkdirSync(releaseData, { recursive: true });

// Copiar pasta public/
const publicSrc = path.join(ROOT_DIR, 'public');
if (fs.existsSync(publicSrc)) {
  const files = fs.readdirSync(publicSrc);
  for (const file of files) {
    fs.copyFileSync(path.join(publicSrc, file), path.join(releasePublic, file));
  }
  console.log(`✓ Interface web copiada para: release/public`);
}

// Copiar ou criar .env.example na pasta release/
const envExampleSrc = path.join(ROOT_DIR, '.env.example');
const envExampleDst = path.join(RELEASE_DIR, '.env.example');
if (fs.existsSync(envExampleSrc)) {
  fs.copyFileSync(envExampleSrc, envExampleDst);
  console.log(`✓ Arquivo de exemplo .env.example copiado para: release/.env.example`);
}

// Copiar ou criar config.json inicial
const configSrc = path.join(ROOT_DIR, 'data/config.json');
const configDst = path.join(releaseData, 'config.json');
if (fs.existsSync(configSrc)) {
  fs.copyFileSync(configSrc, configDst);
  console.log(`✓ Configuração persistente copiada para: release/data/config.json`);
} else {
  const defaultConf = {
    server: { port: 3000, host: '0.0.0.0' },
    qbittorrent: {
      host: 'localhost',
      port: 8877,
      username: 'admin',
      password: 'password',
      useHttps: false,
      timeoutMs: 5000,
      refreshInterval: 10,
    },
  };
  fs.writeFileSync(configDst, JSON.stringify(defaultConf, null, 2), 'utf-8');
  console.log(`✓ Configuração padrão criada em: release/data/config.json`);
}

// Criar script iniciar.sh para Linux
const shContent = `#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

SERVER_PORT=3000

# Lê porta do .env se existir
if [ -f "$SCRIPT_DIR/.env" ]; then
  PORT_VAL=$(grep -E '^(PORT|SERVER_PORT)=' "$SCRIPT_DIR/.env" | tail -n1 | cut -d '=' -f2 | tr -d ' \r\n"')
  if [ -n "$PORT_VAL" ]; then
    SERVER_PORT="$PORT_VAL"
  fi
fi

echo "========================================================"
echo "              INICIANDO TORRENT MANAGER"
echo "========================================================"
echo "Servidor iniciando na porta: $SERVER_PORT"
echo "Abrindo o navegador em: http://localhost:$SERVER_PORT"
echo "Pressione Ctrl+C para encerrar."
echo ""

# Tenta abrir o navegador em segundo plano se o comando xdg-open existir
if command -v xdg-open > /dev/null 2>&1; then
  (sleep 1 && xdg-open "http://localhost:$SERVER_PORT") &
fi

exec "$SCRIPT_DIR/TorrentManager"
`;
const shPath = path.join(RELEASE_DIR, 'iniciar.sh');
fs.writeFileSync(shPath, shContent, 'utf-8');
fs.chmodSync(shPath, 0o755);
console.log(`✓ Script iniciar.sh gerado em release/iniciar.sh`);

// Criar README Linux
const readmeContent = `================================================================
TORRENT MANAGER — EXECUTÁVEL LINUX STANDALONE (x64)
================================================================

COMO EXECUTAR NO LINUX:
1. Execute pelo terminal ou dê dois cliques no script:
   ./iniciar.sh
   ou diretamente:
   ./TorrentManager

2. O servidor iniciará na porta configurada (padrão: 3000).
3. Acesse pelo navegador: http://localhost:3000

COMO ESCOLHER OUTRA PORTA (ARQUIVO .ENV):
1. Copie o arquivo ".env.example" para ".env" na mesma pasta do executável:
   cp .env.example .env
2. Edite o arquivo ".env" e altere a linha PORT=3000 para a porta desejada.
3. Inicie o executável novamente.

ARQUIVOS DO PACOTE:
- TorrentManager : Executável ELF nativo Linux (standalone).
- iniciar.sh     : Script de inicialização automática.
- .env.example   : Modelo de configuração de variáveis de ambiente.
- public/        : Arquivos da interface web (HTML/CSS/JS).
- data/          : Pasta de persistência (config.json, banco de dados).
- LEIAME-LINUX.txt : Instruções de uso.
`;
fs.writeFileSync(path.join(RELEASE_DIR, 'LEIAME-LINUX.txt'), readmeContent, 'utf-8');

// Gerar tar.gz
const tarOutputFile = path.join(RELEASE_DIR, 'TorrentManager-Linux-x64.tar.gz');
try {
  if (fs.existsSync(tarOutputFile)) fs.unlinkSync(tarOutputFile);
  execSync(`tar -czf "${tarOutputFile}" TorrentManager iniciar.sh .env.example LEIAME-LINUX.txt public data`, {
    cwd: RELEASE_DIR,
    stdio: 'inherit',
  });
  console.log(`✓ Pacote compactado gerado: release/TorrentManager-Linux-x64.tar.gz`);
} catch (err) {
  console.warn('Aviso ao gerar arquivo .tar.gz:', err.message);
}

const stats = fs.statSync(FINAL_LINUX_BIN);
const tamanhoMB = (stats.size / (1024 * 1024)).toFixed(1);

console.log('\n================================================================');
console.log('✓ COMPILAÇÃO LINUX CONCLUÍDA COM SUCESSO!');
console.log(`✓ Executável: release/TorrentManager (${tamanhoMB} MB)`);
console.log(`✓ Pacote TAR: release/TorrentManager-Linux-x64.tar.gz`);
console.log(`✓ Pasta de distribuição pronta para uso: release/`);
console.log('================================================================\n');
