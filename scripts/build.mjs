// Static build for GitHub Pages: bundles the app (with CodeMirror) into dist/, vendors the Via CSS
// from node_modules and pre-renders the ASCII title with figlet (no runtime font fetch).
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import figlet from 'figlet';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, 'dist');
const nm = (p) => join(root, 'node_modules', p);

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'vendor'), { recursive: true });

const art = figlet.textSync('BSON EXPLAINER', { font: 'ANSI Shadow' });
const escaped = art.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const html = readFileSync(join(root, 'index.html'), 'utf8').replace(
  '<!-- FIGLET_TITLE -->',
  `<h1 class="title" aria-label="BSON EXPLAINER"><pre class="title">${escaped}</pre></h1>`,
);
writeFileSync(join(out, 'index.html'), html);

copyFileSync(join(root, 'styles.css'), join(out, 'styles.css'));
copyFileSync(join(root, 'favicon.ico'), join(out, 'favicon.ico'));
// Bundle the app and CodeMirror into one file (no runtime CDN, works on static hosting).
await build({
  entryPoints: [join(root, 'src/app.js')],
  outfile: join(out, 'src/app.js'),
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'es2020',
});

copyFileSync(nm('@via-ds/tokens/dist/tokens.css'), join(out, 'vendor/tokens.css'));
copyFileSync(nm('@via-ds/tokens/dist/fonts.css'), join(out, 'vendor/fonts.css'));
copyFileSync(nm('@via-ds/components/dist/index.css'), join(out, 'vendor/index.css'));

writeFileSync(join(out, '.nojekyll'), '');
console.log('Built dist/');
