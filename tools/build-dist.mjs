/* Assemble exactly what belongs on the web server, and nothing else.
   ---------------------------------------------------------------------------
   The working folder is 76 MB; the website is about 5. The difference is
   source models, node_modules, the git history, the build tools and the chat
   server — none of which a static host should ever serve, and one of which
   (server/) is meant to run somewhere else entirely.

   Guessing at upload time is how a 41 MB folder of raw GLBs ends up public, so
   this copies the shipping list and reports what it built.

       node tools/build-dist.mjs          # writes public_html/
       node tools/build-dist.mjs --zip    # and zips it for Hostinger's uploader

   public_html/ is gitignored: it is output, regenerated whenever you deploy.
*/
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const OUT = 'public_html';

// Everything a browser actually asks for. Anything not listed here does not
// go on the server.
const SHIP = [
  'index.html', 'about.html', 'studio.html', 'services.html',
  'projects.html', 'project.html', 'contact.html',
  'css',
  'js',
  'assets/img',
  'assets/icons',
  'assets/3d/web'
];

// Inside those folders, these never ship.
const SKIP = [
  'js/lang/src',        // translation sources — .lines and .json are for editing
  'assets/3d/src'       // 41 MB of uncompressed models; assets/3d/web is the built pair
];

const skipped = SKIP.map(s => path.normalize(s));
const isSkipped = p => skipped.some(s => path.normalize(p) === s || path.normalize(p).startsWith(s + path.sep));

let files = 0, bytes = 0;

function copy(src, dst) {
  if (isSkipped(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const name of fs.readdirSync(src)) copy(path.join(src, name), path.join(dst, name));
  } else {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    files++; bytes += stat.size;
  }
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const item of SHIP) {
  if (!fs.existsSync(item)) { console.log(`  ${item}  missing, skipped`); continue; }
  copy(item, path.join(OUT, item));
}

const mb = (bytes / 1024 / 1024).toFixed(1);
console.log(`  ${OUT}/  ${files} files, ${mb} MB`);

// A page that asks for something the build did not copy would 404 in
// production and pass every test locally, so the references are checked here
// rather than discovered by a visitor.
const missing = new Set();
for (const page of SHIP.filter(f => f.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(OUT, page), 'utf8');
  for (const m of html.matchAll(/(?:src|href)="((?!https?:|#|mailto:|tel:|data:)[^"]+)"/g)) {
    const ref = m[1].split(/[?#]/)[0];
    if (!ref) continue;
    if (!fs.existsSync(path.join(OUT, ref))) missing.add(`${page} -> ${ref}`);
  }
}
if (missing.size) {
  console.log(`\n  ${missing.size} reference(s) point at files the build did not include:`);
  for (const m of missing) console.log(`    ${m}`);
} else {
  console.log('  every local reference on every page resolves inside the build');
}

if (process.argv.includes('--zip')) {
  const zip = 'de-architect-hostinger.zip';
  fs.rmSync(zip, { force: true });
  // Compress-Archive ships with Windows; zip the contents so the archive
  // unpacks straight into public_html rather than nesting another folder
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${OUT}/*' ` +
           `-DestinationPath '${zip}' -Force"`, { stdio: 'inherit' });
  const z = (fs.statSync(zip).size / 1024 / 1024).toFixed(1);
  console.log(`  ${zip}  ${z} MB — upload and extract this`);
}
