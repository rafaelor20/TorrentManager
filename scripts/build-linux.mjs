import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { ZipArchive } from 'archiver';

const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const RELEASE_DIR = path.join(ROOT_DIR, 'release');
const BIN_DIR = path.join(ROOT_DIR, 'bin');
const BUNDLE_FILE = path.join(DIST_DIR, 'bundle.cjs');
const BLOB_FILE = path.join(DIST_DIR, 'sea-prep.blob');
const SEA_CONFIG = path.join(ROOT_DIR, 'sea-config.json');

console.log('================================================================');
console.log('       LINUX NATIVE EXECUTABLE BUILD (ELF x64)                  ');
console.log('       TorrentManager • Single Executable Application (SEA)      ');
console.log('================================================================\n');

// 1. Create necessary directories
[DIST_DIR, RELEASE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 2. Compile TypeScript
console.log('Step 1/5: Compiling TypeScript (tsc)...');
execSync('npx tsc', { stdio: 'inherit', cwd: ROOT_DIR });
console.log('✓ TypeScript compiled successfully.\n');

// 3. Generate bundle with esbuild
console.log('Step 2/5: Bundling code with esbuild into a single file...');
execSync(
  `npx esbuild src/index.ts --bundle --platform=node --target=node20 --format=cjs --outfile="${BUNDLE_FILE}"`,
  { stdio: 'inherit', cwd: ROOT_DIR }
);
console.log(`✓ CJS Bundle generated: ${BUNDLE_FILE}\n`);

// 4. Prepare Linux base binary for Node.js 20 LTS
console.log('Step 3/5: Preparing Linux x64 base binary (v20.18.0)...');
const linuxNodeVersion = process.env.LINUX_NODE_VERSION || 'v20.18.0';
const versionedLinuxBin = path.join(BIN_DIR, `node-linux-x64-${linuxNodeVersion}`);

if (!fs.existsSync(versionedLinuxBin)) {
  console.log(`Downloading official Node.js ${linuxNodeVersion} binary for Linux x64...`);
  if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR, { recursive: true });
  execSync(
    `curl -sL "https://nodejs.org/dist/${linuxNodeVersion}/node-${linuxNodeVersion}-linux-x64.tar.xz" | tar -xJ -C "${BIN_DIR}" --strip-components=2 "node-${linuxNodeVersion}-linux-x64/bin/node"`,
    { stdio: 'inherit', cwd: ROOT_DIR }
  );
  fs.renameSync(path.join(BIN_DIR, 'node'), versionedLinuxBin);
  fs.chmodSync(versionedLinuxBin, 0o755);
}
console.log(`✓ Base binary ready at: ${versionedLinuxBin}\n`);

// 5. Generate SEA (Single Executable Application) Blob with Node 20 LTS
console.log(`Step 4/5: Generating SEA Blob with Node.js ${linuxNodeVersion}...`);
fs.writeFileSync(
  SEA_CONFIG,
  JSON.stringify({
    main: 'dist/bundle.cjs',
    output: 'dist/sea-prep.blob',
    disableExperimentalSEAWarning: true,
    useCodeCache: false,
    useSnapshot: false,
  }, null, 2),
  'utf-8'
);

execSync(`"${versionedLinuxBin}" --experimental-sea-config "${SEA_CONFIG}"`, {
  stdio: 'inherit',
  cwd: ROOT_DIR,
});
console.log(`✓ Binary Blob generated: ${BLOB_FILE}\n`);

// 6. Prepare isolated staging directory
console.log('Preparing package files in staging folder...');
const STAGING_DIR = path.join(ROOT_DIR, '.staging-linux');
if (fs.existsSync(STAGING_DIR)) fs.rmSync(STAGING_DIR, { recursive: true, force: true });
fs.mkdirSync(STAGING_DIR, { recursive: true });

const FINAL_LINUX_BIN = path.join(STAGING_DIR, 'TorrentManager');
fs.copyFileSync(versionedLinuxBin, FINAL_LINUX_BIN);
fs.chmodSync(FINAL_LINUX_BIN, 0o755);

// 7. Inject Blob into executable via postject
console.log('Step 5/5: Injecting code and assets into TorrentManager via postject...');
const postjectCmd = [
  'npx postject',
  `"${FINAL_LINUX_BIN}"`,
  'NODE_SEA_BLOB',
  `"${BLOB_FILE}"`,
  '--sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
].join(' ');

execSync(postjectCmd, { stdio: 'inherit', cwd: ROOT_DIR });
fs.chmodSync(FINAL_LINUX_BIN, 0o755);
console.log(`✓ Linux executable successfully created: ${FINAL_LINUX_BIN}\n`);

// 8. Copy auxiliary resources to staging
const stagingPublic = path.join(STAGING_DIR, 'public');
const stagingData = path.join(STAGING_DIR, 'data');
fs.mkdirSync(stagingPublic, { recursive: true });
fs.mkdirSync(stagingData, { recursive: true });

// Copy public/ folder (recursive)
const publicSrc = path.join(ROOT_DIR, 'public');
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, stagingPublic, { recursive: true });
  console.log(`✓ Web interface copied to package.`);
}

// Copy .env.example
const envExampleSrc = path.join(ROOT_DIR, '.env.example');
const envExampleDst = path.join(STAGING_DIR, '.env.example');
if (fs.existsSync(envExampleSrc)) {
  fs.copyFileSync(envExampleSrc, envExampleDst);
  console.log(`✓ Example .env.example file copied.`);
}

// Copy or create initial config.json
const configSrc = path.join(ROOT_DIR, 'data/config.json');
const configDst = path.join(stagingData, 'config.json');
if (fs.existsSync(configSrc)) {
  fs.copyFileSync(configSrc, configDst);
  console.log(`✓ Persistent configuration copied.`);
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
}

// Create iniciar.sh script for Linux
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
const shPath = path.join(STAGING_DIR, 'iniciar.sh');
fs.writeFileSync(shPath, shContent, 'utf-8');
fs.chmodSync(shPath, 0o755);

// Create Linux README
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
fs.writeFileSync(path.join(STAGING_DIR, 'LEIAME-LINUX.txt'), readmeContent, 'utf-8');

// 9. Generate ZIP archive
console.log('Compressing distribution package to .zip...');
const zipOutputFile = path.join(RELEASE_DIR, 'TorrentManager-Linux-x64.zip');

const output = fs.createWriteStream(zipOutputFile);
const archive = new ZipArchive({ zlib: { level: 9 } });
archive.pipe(output);

const closePromise = new Promise((resolve, reject) => {
  output.on('close', resolve);
  output.on('error', reject);
  archive.on('error', reject);
});

archive.directory(STAGING_DIR, false);
await archive.finalize();
await closePromise;
console.log(`✓ Compressed package generated: release/TorrentManager-Linux-x64.zip\n`);

// 10. Clean up staging and dist/ folders
console.log('Cleaning up intermediate files...');
[DIST_DIR, STAGING_DIR].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const stats = fs.statSync(zipOutputFile);
const tamanhoMB = (stats.size / (1024 * 1024)).toFixed(1);

console.log('\n================================================================');
console.log('✓ LINUX BUILD COMPLETED SUCCESSFULLY!');
console.log(`✓ Final package: release/TorrentManager-Linux-x64.zip (${tamanhoMB} MB)`);
console.log('================================================================\n');
