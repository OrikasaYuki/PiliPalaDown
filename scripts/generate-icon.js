/**
 * Generate app icons: SVG → PNG (tray + window) + ICO (Windows exe)
 */
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const OUT_DIR = path.join(__dirname, '..', 'public')
const SVG_PATH = path.join(OUT_DIR, 'icon.svg')

// ====== SVG Design ======
// Rounded square with gradient background + stylized "P" + down-arrow
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0071e3"/>
      <stop offset="100%" stop-color="#bf5af2"/>
    </linearGradient>
  </defs>

  <!-- Rounded square background -->
  <rect width="512" height="512" rx="100" ry="100" fill="url(#bg)"/>

  <!-- Stylized "P" shape (left stem + top-left loop of P + down arrow integrated) -->
  <g fill="white" transform="translate(256,256)">
    <!-- Vertical stem of P -->
    <rect x="-48" y="-140" width="52" height="280" rx="20"/>

    <!-- Top loop of P (circle arc) -->
    <path d="M 4 -140
             A 90 90 0 0 1 4 40
             L -48 40
             L -48 -140
             Z"/>

    <!-- Downward arrow integrated into the stem -->
    <path d="M -22 80
             L -22 140
             L -60 102
             M -22 140
             L 16 102"
          stroke="white" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>
</svg>
`

fs.writeFileSync(SVG_PATH, svg)
console.log('✓ SVG created:', SVG_PATH)

// ====== Generate PNGs ======
const sizes = {
  'icon-16.png': 16,
  'icon-32.png': 32,
  'icon-64.png': 64,
  'icon-128.png': 128,
  'icon-256.png': 256,
  'icon.png': 256,
}

async function generate() {
  for (const [name, size] of Object.entries(sizes)) {
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(path.join(OUT_DIR, name))
    console.log(`✓ ${name} (${size}x${size})`)
  }

  // Generate ICO (Windows)
  const png = fs.readFileSync(path.join(OUT_DIR, 'icon-256.png'))
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4)
  const entry = Buffer.alloc(16)
  entry.writeUInt8(0, 0); entry.writeUInt8(0, 1); entry.writeUInt8(0, 2); entry.writeUInt8(0, 3)
  entry.writeUInt16LE(1, 4); entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(png.length, 8); entry.writeUInt32LE(22, 12)
  fs.writeFileSync(path.join(OUT_DIR, 'icon.ico'), Buffer.concat([header, entry, png]))
  console.log('✓ icon.ico (Windows exe icon)')
  console.log('')
  console.log('Done! Icons generated in public/')
}

generate().catch(err => { console.error('Error:', err); process.exit(1) })
