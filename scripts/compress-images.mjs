// One-off image recompression pass — re-encodes images in place (same
// filename/extension, same pixel dimensions) so no HTML references change.
// PNGs are photographic product shots stored losslessly (huge files for
// what they show); re-encoding as adaptive-palette PNG or, for JPEGs,
// mozjpeg at web-appropriate quality cuts payload size drastically with
// no visible quality loss at display size.
import sharp from 'sharp';
import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, extname } from 'path';

const ROOT = process.cwd();
const MIN_SIZE = 150 * 1024; // skip files not worth reprocessing
const SKIP = new Set(['logo.png']); // small brand asset, leave untouched

const files = readdirSync(ROOT).filter(f => {
  const ext = extname(f).toLowerCase();
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) return false;
  if (SKIP.has(f)) return false;
  const p = join(ROOT, f);
  return statSync(p).isFile() && statSync(p).size >= MIN_SIZE;
});

let totalBefore = 0, totalAfter = 0, changed = 0;
const results = [];

for (const f of files) {
  const p = join(ROOT, f);
  const before = statSync(p).size;
  const ext = extname(f).toLowerCase();
  const buf = readFileSync(p);

  try {
    let out;
    if (ext === '.png') {
      const meta = await sharp(buf).metadata();
      out = await sharp(buf)
        .png({ compressionLevel: 9, effort: 10, palette: true, quality: 85, dither: 1 })
        .toBuffer();
      // If palette PNG somehow loses the alpha channel a source image had, bail.
      const outMeta = await sharp(out).metadata();
      if (meta.hasAlpha && !outMeta.hasAlpha) out = null;
    } else {
      out = await sharp(buf).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    }

    if (out && out.length < before) {
      writeFileSync(p, out);
      totalBefore += before;
      totalAfter += out.length;
      changed++;
      results.push([f, before, out.length]);
    } else {
      totalBefore += before;
      totalAfter += before;
    }
  } catch (err) {
    console.error('FAILED', f, err.message);
  }
}

results.sort((a, b) => (b[1] - b[2]) - (a[1] - a[2]));
for (const [f, b, a] of results) {
  console.log(`${f}: ${(b/1024/1024).toFixed(2)}MB -> ${(a/1024/1024).toFixed(2)}MB (-${(100*(1-a/b)).toFixed(0)}%)`);
}
console.log(`\n${changed}/${files.length} files recompressed`);
console.log(`Total: ${(totalBefore/1024/1024).toFixed(1)}MB -> ${(totalAfter/1024/1024).toFixed(1)}MB (-${(100*(1-totalAfter/totalBefore)).toFixed(0)}%)`);
