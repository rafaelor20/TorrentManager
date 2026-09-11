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
console.log('       WINDOWS NATIVE EXECUTABLE BUILD (.EXE)                   ');
console.log('       TorrentManager • Single Executable Application (SEA)      ');
console.log('================================================================\n');

// 1. Create necessary directories
[DIST_DIR, RELEASE_DIR, BIN_DIR].forEach(dir => {
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

// 4. Prepare runner and base binary for Node.js 20 LTS
const targetNodeVersion = process.env.WIN_NODE_VERSION || 'v20.18.0';
const versionedWinExe = path.join(BIN_DIR, `node-win-x64-${targetNodeVersion}.exe`);
const versionedLinuxRunner = path.join(BIN_DIR, `node-linux-x64-${targetNodeVersion}`);

let seaGeneratorNode = 'node';
if (process.platform === 'linux') {
  if (!fs.existsSync(versionedLinuxRunner)) {
    console.log(`Preparing Node.js ${targetNodeVersion} runner for SEA Blob generation...`);
    if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR, { recursive: true });
    execSync(
      `curl -sL "https://nodejs.org/dist/${targetNodeVersion}/node-${targetNodeVersion}-linux-x64.tar.xz" | tar -xJ -C "${BIN_DIR}" --strip-components=2 "node-${targetNodeVersion}-linux-x64/bin/node"`,
      { stdio: 'inherit', cwd: ROOT_DIR }
    );
    fs.renameSync(path.join(BIN_DIR, 'node'), versionedLinuxRunner);
    fs.chmodSync(versionedLinuxRunner, 0o755);
  }
  seaGeneratorNode = `"${versionedLinuxRunner}"`;
}

console.log(`Step 3/5: Generating SEA Blob compatible with Node.js ${targetNodeVersion}...`);
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

execSync(`${seaGeneratorNode} --experimental-sea-config "${SEA_CONFIG}"`, {
  stdio: 'inherit',
  cwd: ROOT_DIR,
});
console.log(`✓ Binary Blob generated: ${BLOB_FILE}\n`);

console.log(`Step 4/5: Preparing Windows x64 base binary (${targetNodeVersion})...`);
if (!fs.existsSync(versionedWinExe)) {
  console.log(`Downloading official Node.js ${targetNodeVersion} base executable for Windows x64...`);
  const downloadCmd = `curl -sL "https://nodejs.org/dist/${targetNodeVersion}/win-x64/node.exe" -o "${versionedWinExe}"`;
  execSync(downloadCmd, { stdio: 'inherit', cwd: ROOT_DIR });
}
console.log(`✓ Base executable ready at: ${versionedWinExe}\n`);

// 6. Prepare isolated staging directory
console.log('Preparing package files in staging folder...');
const STAGING_DIR = path.join(ROOT_DIR, '.staging-win');
if (fs.existsSync(STAGING_DIR)) fs.rmSync(STAGING_DIR, { recursive: true, force: true });
fs.mkdirSync(STAGING_DIR, { recursive: true });

const FINAL_WIN_EXE = path.join(STAGING_DIR, 'TorrentManager.exe');
fs.copyFileSync(versionedWinExe, FINAL_WIN_EXE);

// 7. Inject Blob into executable via postject
console.log('Step 5/5: Injecting code and assets into TorrentManager.exe via postject...');
const postjectCmd = [
  'npx postject',
  `"${FINAL_WIN_EXE}"`,
  'NODE_SEA_BLOB',
  `"${BLOB_FILE}"`,
  '--sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
].join(' ');

execSync(postjectCmd, { stdio: 'inherit', cwd: ROOT_DIR });
console.log(`✓ Windows executable successfully created: ${FINAL_WIN_EXE}\n`);

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

// Create iniciar.bat script for Windows with smart port detection from .env
const batContent = `@echo off
title TorrentManager - Servidor BitTorrent Unificado
echo ========================================================
echo               INICIANDO TORRENT MANAGER
echo ========================================================
echo.

set SERVER_PORT=3000

REM Lê a porta definida no arquivo .env se existir na mesma pasta do executável
if exist "%~dp0.env" (
    for /f "usebackq tokens=1,2 delims==" %%A in ("%~dp0.env") do (
        if /i "%%A"=="PORT" set SERVER_PORT=%%B
        if /i "%%A"=="SERVER_PORT" set SERVER_PORT=%%B
    )
)

echo Servidor iniciando na porta: %SERVER_PORT%
echo Abrindo o navegador em: http://localhost:%SERVER_PORT%
echo Pressione Ctrl+C nesta janela para encerrar.
echo.

start http://localhost:%SERVER_PORT%
"%~dp0TorrentManager.exe"
pause
`;
fs.writeFileSync(path.join(STAGING_DIR, 'iniciar.bat'), batContent, 'utf-8');

// Create README with instructions
const readmeContent = `================================================================
TORRENT MANAGER — EXECUTÁVEL WINDOWS STANDALONE (.EXE)
================================================================

COMO EXECUTAR NO WINDOWS:
1. Dê um duplo clique em "iniciar.bat" ou execute "TorrentManager.exe".
2. O servidor iniciará automaticamente na porta padrão 3000.
3. Seu navegador abrirá a interface web em: http://localhost:3000

COMO ESCOLHER OUTRA PORTA (ARQUIVO .ENV):
- Para alterar a porta (ex: para 8080, 4000 ou qualquer outra):
  1. Copie o arquivo ".env.example" para ".env" na mesma pasta do executável (TorrentManager.exe).
  2. Abra o arquivo ".env" com o Bloco de Notas.
  3. Altere a linha "PORT=3000" para a porta desejada, por exemplo:
     PORT=8080
  4. Salve o arquivo e inicie novamente. O executável e o script iniciar.bat usarão a nova porta automaticamente!

ARQUIVOS DO PACOTE PORTÁTIL:
- TorrentManager.exe : Executável principal compilado para Windows x64.
- iniciar.bat        : Script de inicialização rápida com detecção automática de porta.
- .env.example       : Modelo para configurar portas e parâmetros por variáveis de ambiente.
- public/            : Arquivos da interface visual moderna (HTML, CSS, JS).
- data/config.json   : Persistência local de credenciais, host e porta.
- LEIAME.txt         : Guia de instruções e comandos.

REQUISITOS:
- Windows 10 ou Windows 11 (64-bit).
- Não é necessário ter o Node.js instalado na máquina do usuário.
`;
fs.writeFileSync(path.join(STAGING_DIR, 'LEIAME.txt'), readmeContent, 'utf-8');

// 9. Generate ZIP archive
console.log('Compressing distribution package to .zip...');
const zipOutputFile = path.join(RELEASE_DIR, 'TorrentManager-Windows-x64.zip');

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
console.log(`✓ Compressed package generated: release/TorrentManager-Windows-x64.zip\n`);

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
console.log('✓ WINDOWS BUILD COMPLETED SUCCESSFULLY!');
console.log(`✓ Final package: release/TorrentManager-Windows-x64.zip (${tamanhoMB} MB)`);
console.log('================================================================\n');
