/**
 * One-shot image optimizer.
 * ------------------------------------------------------------------------
 * Regenerates `public/**` raster assets at the sizes they're actually
 * displayed at (2x DPR) and re-encodes PNG → WebP where possible.
 *
 * PSI report flagged these as oversized:
 *   /partners/postscript.png          450×200 → displayed 110×49   (saves ~40 KB)
 *   /brand/shark-tank-logo.webp       320×265 → displayed 71×59    (saves ~15 KB)
 *   /partners/klaviyo-master-platinum 481×203 → displayed 116×49   (saves ~6 KB)
 *   /brand-logos/otaa.webp            140×235 → displayed 67×112   (saves ~5 KB)
 *
 * Run:  node scripts/optimize-images.mjs
 */
import sharp from 'sharp';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const PUBLIC = path.resolve(import.meta.dirname, '../public');

/**
 * Each job: [source, outputBase, targetWidth, targetHeight]
 * We target 2x the CSS display size for crisp rendering on retina.
 * Output format is always WebP — universally supported, smallest size.
 */
const jobs = [
  {
    src: 'partners/postscript.png',
    out: 'partners/postscript.webp',
    width: 220,
    height: 88,
  },
  {
    src: 'brand/shark-tank-logo.webp',
    out: 'brand/shark-tank-logo-2x.webp',
    width: 142,
    height: 118,
  },
  {
    src: 'partners/klaviyo-master-platinum.png',
    out: 'partners/klaviyo-master-platinum.webp',
    width: 232,
    height: 98,
  },
  {
    src: 'brand-logos/otaa.webp',
    out: 'brand-logos/otaa-2x.webp',
    width: 134,
    height: 224,
  },
];

for (const job of jobs) {
  const srcPath = path.join(PUBLIC, job.src);
  const outPath = path.join(PUBLIC, job.out);

  const before = (await fs.stat(srcPath)).size;

  await sharp(srcPath)
    .resize(job.width, job.height, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 6 })
    .toFile(outPath);

  const after = (await fs.stat(outPath)).size;
  const saved = (((before - after) / before) * 100).toFixed(1);
  console.log(
    `  ${job.src}  ${(before / 1024).toFixed(1)} KB  →  ${job.out}  ${(after / 1024).toFixed(1)} KB  (-${saved}%)`
  );
}

console.log('\nDone. Update <img src="…"> to point at the new files.');
