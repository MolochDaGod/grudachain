/**
 * fix-encoding.js
 * Fixes double-encoded UTF-8 (bytes were read as CP1252, then saved as UTF-8).
 * Also:
 *  - Removes the UTF-8 BOM
 *  - Adds Font Awesome 6 CDN link
 *  - Replaces broken emoji chips with FA icons
 *  - Fixes broken special chars with HTML entities
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'index.html');
const raw = fs.readFileSync(filePath); // read as Buffer

// ─── Step 1: Strip BOM ────────────────────────────────────────────────────────
let start = 0;
if (raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF) {
  start = 3;
  console.log('Removed UTF-8 BOM');
}

// ─── Step 2: CP1252 decode table (only the non-Latin-1 mappings, 0x80–0x9F) ───
// These bytes map differently in CP1252 vs ISO-8859-1.
const CP1252 = {
  0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160,
  0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153,
  0x9E: 0x017E, 0x9F: 0x0178,
};

// ─── Step 3: Parse the UTF-8 string and collect code points ──────────────────
const currentStr = raw.slice(start).toString('utf8');

// ─── Step 4: Re-encode each code point back to its CP1252 byte ───────────────
// Build a reverse map: Unicode codepoint → CP1252 byte value
const reverseCp1252 = {};
for (const [byte, cp] of Object.entries(CP1252)) {
  reverseCp1252[cp] = parseInt(byte);
}
// Add standard Latin-1 range (0x00–0x7F and 0xA0–0xFF are identity)
for (let b = 0x00; b <= 0xFF; b++) {
  if (CP1252[b] === undefined) {
    // Standard Latin-1: codepoint equals byte value
    reverseCp1252[b] = b;
  }
}

const outputBytes = [];
let i = 0;
while (i < currentStr.length) {
  const cp = currentStr.codePointAt(i);
  if (cp !== undefined && reverseCp1252[cp] !== undefined) {
    outputBytes.push(reverseCp1252[cp]);
    i += cp > 0xFFFF ? 2 : 1;
  } else {
    // Can't map to CP1252: keep the raw UTF-8 bytes for this char
    const charStr = currentStr[i];
    const encoded = Buffer.from(charStr, 'utf8');
    for (const b of encoded) outputBytes.push(b);
    i++;
  }
}

const fixedStr = Buffer.from(outputBytes).toString('utf8');
console.log(`Decoded ${currentStr.length} chars → ${fixedStr.length} chars`);

// ─── Step 5: Post-process HTML tweaks ────────────────────────────────────────
let html = fixedStr;

// Add Font Awesome 6 Free CDN right after the Google Fonts link
const FA_CDN = `  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" integrity="sha512-Avb2QiuDEEvB4bZJYdft2mNjVShBftLdPG8FJ0V7irTLQ8Uo0qcPxh4Plq7G5tGm0rU+1SPhVotteLpBERwTkw==" crossorigin="anonymous" referrerpolicy="no-referrer" />`;
html = html.replace(
  /(<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com"[^>]+\/>)/,
  `$1\n${FA_CDN}`
);

// Replace broken emoji in chip nav buttons with Font Awesome icons
html = html
  .replace(/>⚔\s*Platform</g,      '><i class="fas fa-shield-halved"></i> Platform<')
  .replace(/>🔨\s*WCS</g,          '><i class="fas fa-hammer"></i> WCS<')
  .replace(/>🎮\s*GDevelop</g,      '><i class="fas fa-gamepad"></i> GDevelop<')
  .replace(/>📦\s*ObjectStore</g,   '><i class="fas fa-box-open"></i> ObjectStore<')
  .replace(/>GitHub</g,             '><i class="fab fa-github"></i> GitHub<')
  .replace(/>Discord</g,            '><i class="fab fa-discord"></i> Discord<');

// Replace broken emoji in card headings with FA icons + text
html = html
  .replace(/✅\s*Grudge Studio Nexus/g,  '<i class="fas fa-circle-check"></i> Grudge Studio Nexus')
  .replace(/⚡\s*Quick Status/g,          '<i class="fas fa-bolt"></i> Quick Status');

// Fix remaining broken special characters with HTML entities
html = html
  .replace(/â€¢/g, '&bull;')
  .replace(/â€"/g, '&mdash;')
  .replace(/â€˜/g, '&lsquo;')
  .replace(/â€™/g, '&rsquo;')
  .replace(/â€œ/g, '&ldquo;')
  .replace(/â€/g,  '&rdquo;')
  .replace(/â€¦/g, '&hellip;')
  .replace(/Â©/g,  '&copy;')
  .replace(/Â®/g,  '&reg;')
  .replace(/Â·/g,  '&middot;')
  .replace(/Â«/g,  '&laquo;')
  .replace(/Â»/g,  '&raquo;')
  .replace(/Ã©/g,  '&eacute;')
  .replace(/Ã /g,  '&agrave;');

// Ensure proper title
html = html.replace(
  '<title>Grudge Studio Nexus</title>',
  '<title>GRUDA Legion — Grudge Studio Nexus</title>'
);

// ─── Step 6: Save as UTF-8 without BOM ───────────────────────────────────────
fs.writeFileSync(filePath, html, { encoding: 'utf8' });
console.log('✓ Saved public/index.html (UTF-8, no BOM)');
console.log('  - Font Awesome 6 added');
console.log('  - Chip icons replaced with FA icons');
console.log('  - Encoding fixed');
