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
console.log('       COMPILAÇÃO DE EXECUTÁVEL NATIVO WINDOWS (.EXE)           ');
console.log('       TorrentManager • Single Executable Application (SEA)      ');
console.log('================================================================\n');

// 1. Criar pastas necessárias
[DIST_DIR, RELEASE_DIR, BIN_DIR].forEach(dir => {
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

// 4. Preparar runner e binário base do Node.js 20 LTS
const targetNodeVersion = process.env.WIN_NODE_VERSION || 'v20.18.0';
const versionedWinExe = path.join(BIN_DIR, `node-win-x64-${targetNodeVersion}.exe`);
const versionedLinuxRunner = path.join(BIN_DIR, `node-linux-x64-${targetNodeVersion}`);

let seaGeneratorNode = 'node';
if (process.platform === 'linux') {
  if (!fs.existsSync(versionedLinuxRunner)) {
    console.log(`Preparando runner Node.js ${targetNodeVersion} para geração do Blob SEA...`);
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

console.log(`Passo 3/5: Gerando Blob SEA compatível com Node.js ${targetNodeVersion}...`);
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
console.log(`✓ Blob binário gerado: ${BLOB_FILE}\n`);

console.log(`Passo 4/5: Preparando binário base Windows x64 (${targetNodeVersion})...`);
if (!fs.existsSync(versionedWinExe)) {
  console.log(`Baixando executável base oficial do Node.js ${targetNodeVersion} para Windows x64...`);
  const downloadCmd = `curl -sL "https://nodejs.org/dist/${targetNodeVersion}/win-x64/node.exe" -o "${versionedWinExe}"`;
  execSync(downloadCmd, { stdio: 'inherit', cwd: ROOT_DIR });
}
console.log(`✓ Executável base pronto em: ${versionedWinExe}\n`);

// 6. Preparar diretório de montagem (staging) isolado
console.log('Preparando arquivos do pacote na pasta de montagem...');
const STAGING_DIR = path.join(ROOT_DIR, '.staging-win');
if (fs.existsSync(STAGING_DIR)) fs.rmSync(STAGING_DIR, { recursive: true, force: true });
fs.mkdirSync(STAGING_DIR, { recursive: true });

const FINAL_WIN_EXE = path.join(STAGING_DIR, 'TorrentManager.exe');
fs.copyFileSync(versionedWinExe, FINAL_WIN_EXE);

// 7. Injetar Blob no executável via postject
console.log('Passo 5/5: Injetando código e recursos no TorrentManager.exe via postject...');
const postjectCmd = [
  'npx postject',
  `"${FINAL_WIN_EXE}"`,
  'NODE_SEA_BLOB',
  `"${BLOB_FILE}"`,
  '--sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
].join(' ');

execSync(postjectCmd, { stdio: 'inherit', cwd: ROOT_DIR });
console.log(`✓ Executável Windows criado com sucesso: ${FINAL_WIN_EXE}\n`);

// 8. Copiar recursos auxiliares para staging
const stagingPublic = path.join(STAGING_DIR, 'public');
const stagingData = path.join(STAGING_DIR, 'data');
fs.mkdirSync(stagingPublic, { recursive: true });
fs.mkdirSync(stagingData, { recursive: true });

// Copiar pasta public/ (recursivo)
const publicSrc = path.join(ROOT_DIR, 'public');
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, stagingPublic, { recursive: true });
  console.log(`✓ Interface web copiada para o pacote.`);
}

// Copiar .env.example
const envExampleSrc = path.join(ROOT_DIR, '.env.example');
const envExampleDst = path.join(STAGING_DIR, '.env.example');
if (fs.existsSync(envExampleSrc)) {
  fs.copyFileSync(envExampleSrc, envExampleDst);
  console.log(`✓ Arquivo de exemplo .env.example copiado.`);
}

// Copiar ou criar config.json inicial
const configSrc = path.join(ROOT_DIR, 'data/config.json');
const configDst = path.join(stagingData, 'config.json');
if (fs.existsSync(configSrc)) {
  fs.copyFileSync(configSrc, configDst);
  console.log(`✓ Configuração persistente copiada.`);
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

// Criar script iniciar.bat para Windows com detecção inteligente de porta no .env
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

// Criar README com instruções
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

// 9. Gerar arquivo compactado ZIP
console.log('Compactando pacote de distribuição para .zip...');
const zipOutputFile = path.join(RELEASE_DIR, 'TorrentManager-Windows-x64.zip');
const filesToZip = ['TorrentManager.exe', 'iniciar.bat', '.env.example', 'LEIAME.txt', 'public', 'data'];

await new Promise((resolve, reject) => {
  const output = fs.createWriteStream(zipOutputFile);
  const archive = new ZipArchive({ zlib: { level: 9 } });

  output.on('close', () => {
    console.log(`✓ Pacote compactado gerado: release/TorrentManager-Windows-x64.zip\n`);
    resolve();
  });

  archive.on('error', (err) => reject(err));
  archive.pipe(output);

  for (const item of filesToZip) {
    const itemPath = path.join(STAGING_DIR, item);
    if (!fs.existsSync(itemPath)) continue;
    const stats = fs.statSync(itemPath);
    if (stats.isDirectory()) {
      archive.directory(itemPath, item);
    } else {
      archive.file(itemPath, { name: item, mode: stats.mode });
    }
  }

  archive.finalize();
});

// 10. Limpeza da pasta staging e dist/
console.log('Realizando limpeza de arquivos intermediários...');
[DIST_DIR, STAGING_DIR].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const stats = fs.statSync(zipOutputFile);
const tamanhoMB = (stats.size / (1024 * 1024)).toFixed(1);

console.log('\n================================================================');
console.log('✓ BUILD WINDOWS CONCLUÍDO COM SUCESSO!');
console.log(`✓ Pacote final: release/TorrentManager-Windows-x64.zip (${tamanhoMB} MB)`);
console.log('================================================================\n');
