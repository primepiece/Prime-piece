// Maintenance script — run after adding new product/marketing photos to
// the repo root. Re-encodes oversized images in place, SAME filename and
// extension, so every existing reference (site pages, sitemap, already-sent
// marketing emails) keeps working with zero changes. Only the bytes on
// disk get smaller.
//
// This repo already has several files where the extension lies about the
// actual codec (e.g. desert-drift-2-table.jpg is really a PNG) and they
// render fine, proving browsers sniff actual image bytes here rather than
// trusting the extension/Content-Type — so re-encoding to whichever codec
// compresses best, without renaming, is safe in this hosting setup.
//
// Usage: npm run optimize-images
import sharp from 'sharp';
import { readdirSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2] || '.';
const MIN_SIZE = 300 * 1024; // only touch files worth touching
const MIN_SAVINGS_RATIO = 0.15; // keep original unless we save at least 15%

const files = readdirSync(ROOT).filter(f => /\.(png|jpe?g)$/i.test(f));

const report = [];
let totalBefore = 0;
let totalAfter = 0;

for (const file of files) {
  const full = path.join(ROOT, file);
  const before = statSync(full).size;
  if (before < MIN_SIZE) continue;

  const buf = readFileSync(full);
  const img = sharp(buf, { failOn: 'none' });
  const meta = await img.metadata();

  let alphaMatters = false;
  if (meta.hasAlpha) {
    // Check whether the alpha channel actually varies (real cutout/transparency)
    // vs. a flat fully-opaque alpha channel some exporters add pointlessly.
    const { channels } = meta;
    const stats = await img.stats();
    const alphaChannel = stats.channels[channels - 1];
    alphaMatters = alphaChannel.min < 250;
  }

  let out, ext;
  try {
    if (alphaMatters) {
      out = await sharp(buf, { failOn: 'none' })
        .png({ palette: true, quality: 88, compressionLevel: 9, effort: 10 })
        .toBuffer();
      ext = 'png(palette)';
    } else {
      out = await sharp(buf, { failOn: 'none' })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: '4:2:0' })
        .toBuffer();
      ext = 'jpeg';
    }
  } catch (err) {
    report.push(`SKIP (error: ${err.message}) ${file}`);
    continue;
  }

  const after = out.length;
  const savingsRatio = 1 - after / before;

  if (savingsRatio >= MIN_SAVINGS_RATIO) {
    writeFileSync(full, out);
    totalBefore += before;
    totalAfter += after;
    report.push(`OK    ${file}  ${(before/1024/1024).toFixed(2)}MB -> ${(after/1024/1024).toFixed(2)}MB  (${(savingsRatio*100).toFixed(0)}% smaller, re-encoded as ${ext})`);
  } else {
    report.push(`KEEP  ${file}  (only ${(savingsRatio*100).toFixed(0)}% smaller as ${ext} — not worth the risk, left untouched)`);
  }
}

console.log(report.join('\n'));
console.log('\n---');
console.log(`Total: ${(totalBefore/1024/1024).toFixed(1)}MB -> ${(totalAfter/1024/1024).toFixed(1)}MB (saved ${((totalBefore-totalAfter)/1024/1024).toFixed(1)}MB across ${report.filter(l=>l.startsWith('OK')).length} files)`);
