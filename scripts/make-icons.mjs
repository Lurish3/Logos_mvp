import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const iconsDir = path.resolve(__dirname, '../public/icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// CRC32 implementation
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(typeStr, data) {
  const typeBuf = Buffer.from(typeStr, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(toCrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createPng(width, height, isMaskable = false) {
  const bgR = 15, bgG = 118, bgB = 110; // #0f766e (Teal)
  const fgR = 255, fgG = 255, fgB = 255; // White

  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  // Determine drawing bounds for glyph (letter "E" + briefcase motif)
  // Maskable icons require ~20% safe zone padding around the center
  const scale = isMaskable ? 0.55 : 0.65;
  const glyphW = Math.round(width * scale);
  const glyphH = Math.round(height * scale);
  const startX = Math.round((width - glyphW) / 2);
  const startY = Math.round((height - glyphH) / 2);

  const barThick = Math.max(4, Math.round(glyphW * 0.22));

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      let isForeground = false;

      // Draw stylized letter "E" with briefcase handle/proportions
      if (x >= startX && x < startX + glyphW && y >= startY && y < startY + glyphH) {
        const relX = x - startX;
        const relY = y - startY;

        // Vertical spine of "E"
        if (relX < barThick) {
          isForeground = true;
        }
        // Top bar
        else if (relY < barThick) {
          isForeground = true;
        }
        // Middle bar (slightly shorter)
        else if (relY >= Math.round((glyphH - barThick) / 2) &&
                 relY < Math.round((glyphH + barThick) / 2) &&
                 relX < Math.round(glyphW * 0.8)) {
          isForeground = true;
        }
        // Bottom bar
        else if (relY >= glyphH - barThick) {
          isForeground = true;
        }
      }

      if (isForeground) {
        rawData[pxOffset] = fgR;
        rawData[pxOffset + 1] = fgG;
        rawData[pxOffset + 2] = fgB;
        rawData[pxOffset + 3] = 255;
      } else {
        rawData[pxOffset] = bgR;
        rawData[pxOffset + 1] = bgG;
        rawData[pxOffset + 2] = bgB;
        rawData[pxOffset + 3] = 255;
      }
    }
  }

  // PNG Header
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Filter standard
  ihdrData[12] = 0; // No interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT chunk
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const targets = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: false }
];

for (const target of targets) {
  const filePath = path.join(iconsDir, target.name);
  const pngBuffer = createPng(target.size, target.size, target.maskable);
  fs.writeFileSync(filePath, pngBuffer);
  console.log(`Generated ${target.name} (${target.size}x${target.size})`);
}
