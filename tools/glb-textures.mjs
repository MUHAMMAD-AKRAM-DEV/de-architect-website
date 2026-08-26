/* Resize and re-encode every texture in a GLB.
   gltf-transform's own texture commands fail here ("colourspace: parameter
   space not set") but sharp works fine called directly, so this does the
   texture pass with sharp and leaves geometry compression to the CLI. */
import { NodeIO } from '@gltf-transform/core';
import sharp from 'sharp';

const [, , IN, OUT, MAXS = '1024', QUALITY = '86'] = process.argv;
const MAX = Number(MAXS), Q = Number(QUALITY);

const io = new NodeIO();
const doc = await io.read(IN);
const textures = doc.getRoot().listTextures();

let before = 0, after = 0, n = 0;
for (const tex of textures) {
  const img = tex.getImage();
  if (!img) continue;
  before += img.byteLength;

  const src = sharp(Buffer.from(img), { failOn: 'none' });
  const meta = await src.metadata();
  const w = meta.width || 0, h = meta.height || 0;
  const scale = Math.min(1, MAX / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  // Keep alpha as PNG; everything else becomes JPEG, which is where the real
  // saving is — these were photographic textures stored as 4096px PNG.
  const hasAlpha = !!meta.hasAlpha;
  let pipe = sharp(Buffer.from(img), { failOn: 'none' })
    .resize(tw, th, { fit: 'fill', kernel: 'lanczos3' })
    .toColourspace('srgb');

  let out, mime;
  if (hasAlpha) {
    out = await pipe.png({ compressionLevel: 9, palette: true }).toBuffer();
    mime = 'image/png';
  } else {
    out = await pipe.jpeg({ quality: Q, mozjpeg: true, chromaSubsampling: '4:2:0' }).toBuffer();
    mime = 'image/jpeg';
  }

  tex.setImage(new Uint8Array(out)).setMimeType(mime);
  after += out.byteLength;
  n++;
  console.log(
    `  ${String(n).padStart(2)} ${w}x${h} -> ${tw}x${th}  ` +
    `${(img.byteLength / 1048576).toFixed(2)}MB -> ${(out.byteLength / 1048576).toFixed(2)}MB  ${mime}`
  );
}

await io.write(OUT, doc);
console.log(`textures: ${(before / 1048576).toFixed(1)}MB -> ${(after / 1048576).toFixed(1)}MB across ${n} images`);
