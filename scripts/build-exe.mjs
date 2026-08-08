import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const RELEASE_DIR = path.join(ROOT_DIR, 'release');
const BIN_DIR = path.join(ROOT_DIR, 'bin');
const BUNDLE_FILE = path.join(DIST_DIR, 'bundle.cjs');
const BLOB_FILE = path.join(DIST_DIR, 'sea-prep.blob');
const BASE_WIN_EXE = path.join(BIN_DIR, 'node-win-x64.exe');
const FINAL_WIN_EXE = path.join(RELEASE_DIR, 'TorrentManager.exe');
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

// 5. Obter executável base do Windows se necessário
console.log('Passo 4/5: Preparando binário base Windows x64...');
if (!fs.existsSync(BASE_WIN_EXE)) {
  console.log('Baixando executável base oficial do Node.js para Windows x64...');
  const downloadCmd = `curl -sL https://nodejs.org/dist/v22.13.1/win-x64/node.exe -o "${BASE_WIN_EXE}"`;
  execSync(downloadCmd, { stdio: 'inherit', cwd: ROOT_DIR });
}
console.log(`✓ Executável base pronto em: ${BASE_WIN_EXE}\n`);

// 6. Injetar Blob no executável via postject
console.log('Passo 5/5: Injetando código e recursos no TorrentManager.exe via postject...');
fs.copyFileSync(BASE_WIN_EXE, FINAL_WIN_EXE);

const postjectCmd = [
  'npx postject',
  `"${FINAL_WIN_EXE}"`,
  'NODE_SEA_BLOB',
  `"${BLOB_FILE}"`,
  '--sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
].join(' ');

execSync(postjectCmd, { stdio: 'inherit', cwd: ROOT_DIR });
console.log(`✓ Executável Windows criado com sucesso: ${FINAL_WIN_EXE}\n`);

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
      password: 'Ozzy261220',
      useHttps: false,
      timeoutMs: 5000,
      refreshInterval: 10,
    },
  };
  fs.writeFileSync(configDst, JSON.stringify(defaultConf, null, 2), 'utf-8');
  console.log(`✓ Configuração padrão criada em: release/data/config.json`);
}

// Criar script iniciar.bat para Windows
const batContent = `@echo off
title TorrentManager - Servidor BitTorrent Unificado
echo ========================================================
echo               INICIANDO TORRENT MANAGER
echo ========================================================
echo.
echo Abrindo o servidor em http://localhost:3000
echo Pressione Ctrl+C nesta janela para encerrar.
echo.

start http://localhost:3000
"%~dp0TorrentManager.exe"
pause
`;
fs.writeFileSync(path.join(RELEASE_DIR, 'iniciar.bat'), batContent, 'utf-8');
console.log(`✓ Script iniciar.bat gerado em release/iniciar.bat`);

// Criar README com instruções
const readmeContent = `========================================================
TORRENT MANAGER — EXECUTÁVEL WINDOWS STANDALONE (.EXE)
========================================================

COMO EXECUTAR NO WINDOWS:
1. Dê um duplo clique em "iniciar.bat" ou execute "TorrentManager.exe".
2. O servidor iniciará automaticamente na porta 3000.
3. Seu navegador abrirá a interface web em: http://localhost:3000

ARQUIVOS DO PACOTE PORTÁTIL:
- TorrentManager.exe : Executável principal compilado para Windows x64.
- iniciar.bat        : Script de inicialização rápida com abertura do navegador.
- public/            : Arquivos da interface visual (HTML, CSS, JS).
- data/config.json   : Persistência local de credenciais, host e porta.

REQUISITOS:
- Windows 10 ou Windows 11 (64-bit).
- Não é necessário ter o Node.js instalado na máquina do usuário.
`;
fs.writeFileSync(path.join(RELEASE_DIR, 'LEIAME.txt'), readmeContent, 'utf-8');

const stats = fs.statSync(FINAL_WIN_EXE);
const tamanhoMB = (stats.size / (1024 * 1024)).toFixed(1);

console.log('\n================================================================');
console.log('✓ COMPILAÇÃO CONCLUÍDA COM 100% DE SUCESSO!');
console.log(`✓ Executável: release/TorrentManager.exe (${tamanhoMB} MB)`);
console.log(`✓ Pasta de distribuição pronta para uso e compactação: release/`);
console.log('================================================================\n');
