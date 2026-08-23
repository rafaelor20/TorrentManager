import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Cria um PNG simples sem dependências externas
function createPng(width, height, getPixelRgba) {
  // Assinatura PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8 bits por canal
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // compressão
  ihdrData.writeUInt8(0, 11); // filtro
  ihdrData.writeUInt8(0, 12); // interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT Chunk (dados dos pixels com filtro 0 no início de cada linha)
  const rowBytes = width * 4;
  const rawData = Buffer.alloc(height * (rowBytes + 1));

  let pos = 0;
  for (let y = 0; y < height; y++) {
    rawData[pos++] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixelRgba(x, y, width, height);
      rawData[pos++] = r;
      rawData[pos++] = g;
      rawData[pos++] = b;
      rawData[pos++] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND Chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crcVal = crc32(crcData);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crcVal, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// Tabela de CRC32
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Empacota PNGs em formato ICO padrão
function createIco(pngBuffers) {
  const count = pngBuffers.length;
  // Header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reservado
  header.writeUInt16LE(1, 2); // Tipo 1 = ICO
  header.writeUInt16LE(count, 4); // Quantidade de imagens

  const entries = [];
  let currentOffset = 6 + count * 16;

  for (let i = 0; i < count; i++) {
    const { width, height, buffer } = pngBuffers[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2); // Paleta de cores
    entry.writeUInt8(0, 3); // Reservado
    entry.writeUInt16LE(1, 4); // Planos de cor
    entry.writeUInt16LE(32, 6); // Bits por pixel
    entry.writeUInt32LE(buffer.length, 8); // Tamanho em bytes
    entry.writeUInt32LE(currentOffset, 12); // Offset
    entries.push(entry);
    currentOffset += buffer.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.buffer)]);
}

// Gerador de pixels da logo do TorrentManager
function renderTorrentIconPixel(x, y, w, h) {
  const nx = x / (w - 1);
  const ny = y / (h - 1);

  // Distância do centro para cantos arredondados
  const cx = 0.5;
  const cy = 0.5;
  const radius = 0.46;
  const cornerR = 0.22;

  // Bounding box arredondada
  const dx = Math.max(Math.abs(nx - cx) - (radius - cornerR), 0);
  const dy = Math.max(Math.abs(ny - cy) - (radius - cornerR), 0);
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > cornerR + 0.02) {
    return [0, 0, 0, 0]; // Transparente fora do ícone
  }

  // Antialiasing suave da borda
  let alphaBg = 1;
  if (dist > cornerR - 0.02) {
    alphaBg = Math.max(0, Math.min(1, (cornerR + 0.02 - dist) / 0.04));
  }

  // Fundo com gradiente elegante do TorrentManager (Slate Escuro para Azul Vibrante)
  const bgR = Math.round(15 + nx * 20 - ny * 5);
  const bgG = Math.round(23 + ny * 60 + nx * 40);
  const bgB = Math.round(42 + ny * 140 + nx * 80);

  // Desenho dos elementos vetoriais (bandeja inferior + seta para baixo)
  // Escala para coordenadas 0..24
  const vx = nx * 24;
  const vy = ny * 24;

  let isFg = false;
  let fgIntensity = 0;

  // 1. Bandeja inferior (U-shape): M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4
  // Linha horizontal inferior: y ~ 19, x de 5 a 19
  if (vy >= 18 && vy <= 20.2 && vx >= 4.5 && vx <= 19.5) {
    isFg = true;
    fgIntensity = 1;
  }
  // Linhas verticais esquerda e direita da bandeja: x=4.5..6.2 e x=17.8..19.5, y=14.5..19
  if (vy >= 14.5 && vy <= 19 && ((vx >= 4.5 && vx <= 6.5) || (vx >= 17.5 && vx <= 19.5))) {
    isFg = true;
    fgIntensity = 1;
  }

  // 2. Linha vertical central da seta: x=11..13, y=3..15
  if (vx >= 11 && vx <= 13 && vy >= 3 && vy <= 15) {
    isFg = true;
    fgIntensity = 1;
  }

  // 3. Cabeça da seta (polyline: 7 10 -> 12 15 -> 17 10)
  // Lado esquerdo: linha de (7, 10) a (12, 15) -> y - 10 = (5/5)*(x - 7) => y = x + 3
  const distLineLeft = Math.abs(vy - (vx + 3)) / 1.414;
  if (vx >= 6.5 && vx <= 12.5 && vy >= 9.5 && vy <= 15.5 && distLineLeft <= 1.1) {
    isFg = true;
    fgIntensity = 1;
  }
  // Lado direito: linha de (12, 15) a (17, 10) -> y - 15 = -(5/5)*(x - 12) => y = -x + 27
  const distLineRight = Math.abs(vy - (-vx + 27)) / 1.414;
  if (vx >= 11.5 && vx <= 17.5 && vy >= 9.5 && vy <= 15.5 && distLineRight <= 1.1) {
    isFg = true;
    fgIntensity = 1;
  }

  // Se faz parte do ícone de download (Ciano brilhante com gradiente branco)
  if (isFg) {
    const fgR = Math.round(56 + (1 - ny) * 190);
    const fgG = Math.round(189 + (1 - ny) * 60);
    const fgB = Math.round(248 + (1 - ny) * 7);
    return [fgR, fgG, fgB, Math.round(255 * alphaBg)];
  }

  // Borda sutil de ciano
  if (dist > cornerR - 0.04) {
    return [56, 189, 248, Math.round(200 * alphaBg)];
  }

  return [bgR, bgG, bgB, Math.round(255 * alphaBg)];
}

const publicDir = path.resolve(process.cwd(), 'public');

// Gera PNGs em 16x16, 32x32, 48x48 e 192x192
const png16 = createPng(16, 16, renderTorrentIconPixel);
const png32 = createPng(32, 32, renderTorrentIconPixel);
const png48 = createPng(48, 48, renderTorrentIconPixel);
const png192 = createPng(192, 192, renderTorrentIconPixel);

fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), png16);
fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), png32);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png192);

// Gera ICO multi-resolução compatível com Windows
const icoBuffer = createIco([
  { width: 16, height: 16, buffer: png16 },
  { width: 32, height: 32, buffer: png32 },
  { width: 48, height: 48, buffer: png48 },
]);

fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
console.log('✓ Favicons (ICO, PNGs) gerados com sucesso em public/!');
