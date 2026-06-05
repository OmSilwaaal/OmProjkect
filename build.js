const fs = require('fs');
const path = require('path');

const IMAGE_EXTS = /\.(jpg|jpeg|png|webp|gif|avif)$/i;
const APICTURES_DIR = path.join(__dirname, 'apictures');
const TRAIL_DIR = path.join(__dirname, 'pictures_moving');
const INDEX_HTML = path.join(__dirname, 'index.html');

function toTitle(filename) {
  let name = filename.replace(IMAGE_EXTS, '');
  // insert space between letters and digits: DSC00895 → DSC 00895
  name = name.replace(/([A-Za-z])(\d)/g, '$1 $2').replace(/(\d)([A-Za-z])/g, '$1 $2');
  // split OSdog → OS Dog (multiple-upper followed by lowercase)
  name = name.replace(/([A-Z]{2,})([a-z])/g, (_, u, l) => u + ' ' + l);
  // split camelCase: lowerUpper → lower Upper
  name = name.replace(/([a-z])([A-Z])/g, '$1 $2');
  return name
    .replace(/[_\-\(\)]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => {
      // keep known short caps: DSC, IMG, OS
      if (/^(DSC|IMG|OS|JPG|RAW)$/i.test(w)) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

function toDesc(filename) {
  const f = filename.toLowerCase();
  if (f.startsWith('dsc')) return 'DSC · Photography';
  if (f.startsWith('geometry') || f.startsWith('geomtetry')) return 'Geometry Series';
  if (f.startsWith('os')) return 'Street · 2024';
  if (f.startsWith('img')) return 'Class · 2024';
  return 'Photography · 2024';
}

const files = fs.readdirSync(APICTURES_DIR)
  .filter(f => IMAGE_EXTS.test(f) && !f.startsWith('.'))
  .sort();

const entries = files.map(f =>
  `      {f:${JSON.stringify(f)},n:${JSON.stringify(toTitle(f))},d:${JSON.stringify(toDesc(f))}}`
);

const newArray = `[\n${entries.join(',\n')}\n    ]`;

// Build TRAIL_IMAGES from pictures_moving/
const trailFiles = fs.readdirSync(TRAIL_DIR)
  .filter(f => IMAGE_EXTS.test(f) && !f.startsWith('.'))
  .sort();

const trailPaths = trailFiles
  .map(f => `'pictures_moving/${encodeURIComponent(f)}'`)
  .join(',\n  ');

const newTrail = `[\n  ${trailPaths}\n]`;

let html = fs.readFileSync(INDEX_HTML, 'utf8');

const R_PHOTOS = /const PW_PHOTOS=\[[\s\S]*?\];/;
// Match only the real (unindented) TRAIL_IMAGES declaration, not the comment example
const R_TRAIL  = /^const TRAIL_IMAGES\s*=\s*\[[\s\S]*?\n\];/m;

if (!R_PHOTOS.test(html)) { console.error('ERROR: PW_PHOTOS not found in index.html'); process.exit(1); }
if (!R_TRAIL.test(html))  { console.error('ERROR: TRAIL_IMAGES not found in index.html'); process.exit(1); }

const updated = html
  .replace(R_PHOTOS, `const PW_PHOTOS=${newArray};`)
  .replace(R_TRAIL,  `const TRAIL_IMAGES = ${newTrail};`);

fs.writeFileSync(INDEX_HTML, updated);
console.log(`✓ ${files.length} gallery photos, ${trailFiles.length} trail images written`);
