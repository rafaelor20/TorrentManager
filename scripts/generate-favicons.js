import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Creates a simple PNG without external dependencies
function createPng(width, height, getPixelRgba) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8 bits per channel
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT Chunk (pixel data with filter 0 at start of each row)
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

// CRC32 table
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

// Packs PNGs into standard ICO format
function createIco(pngBuffers) {
  const count = pngBuffers.length;
  // Header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(count, 4); // Image count

  const entries = [];
  let currentOffset = 6 + count * 16;

  for (let i = 0; i < count; i++) {
    const { width, height, buffer } = pngBuffers[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(buffer.length, 8); // Size in bytes
    entry.writeUInt32LE(currentOffset, 12); // Offset
    entries.push(entry);
    currentOffset += buffer.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.buffer)]);
}

// TorrentManager logo pixel generator
function renderTorrentIconPixel(x, y, w, h) {
  const nx = x / (w - 1);
  const ny = y / (h - 1);

  // Distance from center for rounded corners
  const cx = 0.5;
  const cy = 0.5;
  const radius = 0.46;
  const cornerR = 0.22;

  // Rounded bounding box
  const dx = Math.max(Math.abs(nx - cx) - (radius - cornerR), 0);
  const dy = Math.max(Math.abs(ny - cy) - (radius - cornerR), 0);
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > cornerR + 0.02) {
    return [0, 0, 0, 0]; // Transparent outside icon
  }

  // Smooth edge antialiasing
  let alphaBg = 1;
  if (dist > cornerR - 0.02) {
    alphaBg = Math.max(0, Math.min(1, (cornerR + 0.02 - dist) / 0.04));
  }

  // Background with TorrentManager gradient (Dark Slate to Vibrant Blue)
  const bgR = Math.round(15 + nx * 20 - ny * 5);
  const bgG = Math.round(23 + ny * 60 + nx * 40);
  const bgB = Math.round(42 + ny * 140 + nx * 80);

  // Vector elements drawing (bottom tray + downward arrow)
  // Scale to coordinates 0..24
  const vx = nx * 24;
  const vy = ny * 24;

  let isFg = false;
  let fgIntensity = 0;

  // 1. Bottom tray (U-shape): M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4
  // Bottom horizontal line: y ~ 19, x from 5 to 19
  if (vy >= 18 && vy <= 20.2 && vx >= 4.5 && vx <= 19.5) {
    isFg = true;
    fgIntensity = 1;
  }
  // Left and right vertical lines of tray: x=4.5..6.2 and x=17.8..19.5, y=14.5..19
  if (vy >= 14.5 && vy <= 19 && ((vx >= 4.5 && vx <= 6.5) || (vx >= 17.5 && vx <= 19.5))) {
    isFg = true;
    fgIntensity = 1;
  }

  // 2. Center vertical arrow line: x=11..13, y=3..15
  if (vx >= 11 && vx <= 13 && vy >= 3 && vy <= 15) {
    isFg = true;
    fgIntensity = 1;
  }

  // 3. Arrow head (polyline: 7 10 -> 12 15 -> 17 10)
  // Left side: line from (7, 10) to (12, 15) -> y - 10 = (5/5)*(x - 7) => y = x + 3
  const distLineLeft = Math.abs(vy - (vx + 3)) / 1.414;
  if (vx >= 6.5 && vx <= 12.5 && vy >= 9.5 && vy <= 15.5 && distLineLeft <= 1.1) {
    isFg = true;
    fgIntensity = 1;
  }
  // Right side: line from (12, 15) to (17, 10) -> y - 15 = -(5/5)*(x - 12) => y = -x + 27
  const distLineRight = Math.abs(vy - (-vx + 27)) / 1.414;
  if (vx >= 11.5 && vx <= 17.5 && vy >= 9.5 && vy <= 15.5 && distLineRight <= 1.1) {
    isFg = true;
    fgIntensity = 1;
  }

  // If part of download icon (bright cyan with white gradient)
  if (isFg) {
    const fgR = Math.round(56 + (1 - ny) * 190);
    const fgG = Math.round(189 + (1 - ny) * 60);
    const fgB = Math.round(248 + (1 - ny) * 7);
    return [fgR, fgG, fgB, Math.round(255 * alphaBg)];
  }

  // Subtle cyan border
  if (dist > cornerR - 0.04) {
    return [56, 189, 248, Math.round(200 * alphaBg)];
  }

  return [bgR, bgG, bgB, Math.round(255 * alphaBg)];
}

const publicDir = path.resolve(process.cwd(), 'public');

// Generate PNGs at 16x16, 32x32, 48x48, and 192x192
const png16 = createPng(16, 16, renderTorrentIconPixel);
const png32 = createPng(32, 32, renderTorrentIconPixel);
const png48 = createPng(48, 48, renderTorrentIconPixel);
const png192 = createPng(192, 192, renderTorrentIconPixel);

fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), png16);
fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), png32);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png192);

// Generate multi-resolution Windows-compatible ICO
const icoBuffer = createIco([
  { width: 16, height: 16, buffer: png16 },
  { width: 32, height: 32, buffer: png32 },
  { width: 48, height: 48, buffer: png48 },
]);

fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
console.log('✓ Favicons (ICO, PNGs) successfully generated in public/!');
