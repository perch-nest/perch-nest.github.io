// Builds the Perch Nest website into dist/:
//   /           the landing page (site/)
//   /mac/       Perch's website, from github.com/Just-Rice/perch (its site/ folder)
//   /windows/   Roost's website, from github.com/faarisaahmed/roost (its site/ folder)
// Each project's pages are copied unchanged, except that the Perch Nest switch (site/nest/) is added to every one.
//
//   node scripts/build.mjs                         fetch both projects (PERCH_REF / ROOST_REF: a branch or tag)
//   PERCH_DIR=../perch ROOST_DIR=../roost node scripts/build.mjs     use local checkouts instead
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist');
const CACHE = join(ROOT, '.cache');

const PROJECTS = [
  { name: 'Perch', path: 'mac', repo: 'https://github.com/Just-Rice/perch.git', dir: process.env.PERCH_DIR, ref: process.env.PERCH_REF || 'main' },
  { name: 'Roost', path: 'windows', repo: 'https://github.com/faarisaahmed/roost.git', dir: process.env.ROOST_DIR, ref: process.env.ROOST_REF || 'main' },
];

// Added to the <head> of every page of each project.
const SWITCH = '<link rel="stylesheet" href="/nest/switch.css"><script type="module" src="/nest/switch.js"></script>';

function fetchProject(p) {
  if (p.dir) return p.dir;
  const dest = join(CACHE, p.path);
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(CACHE, { recursive: true });
  execFileSync('git', ['clone', '--quiet', '--depth', '1', '--branch', p.ref, p.repo, dest], { stdio: 'inherit' });
  return dest;
}

function htmlFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const f = join(dir, name);
    if (statSync(f).isDirectory()) out.push(...htmlFiles(f));
    else if (name.endsWith('.html')) out.push(f);
  }
  return out;
}

rmSync(OUT, { recursive: true, force: true });
cpSync(join(ROOT, 'site'), OUT, { recursive: true });
for (const p of PROJECTS) {
  const src = join(fetchProject(p), 'site');
  if (!existsSync(join(src, 'connect.html'))) throw new Error(`${p.name}: no site/connect.html in ${src}`);
  const dest = join(OUT, p.path);
  cpSync(src, dest, { recursive: true });
  for (const f of htmlFiles(dest)) {
    const html = readFileSync(f, 'utf8');
    if (!html.includes('</head>')) continue;
    writeFileSync(f, html.replace('</head>', `${SWITCH}\n</head>`));
  }
  let commit = '';
  try { commit = execFileSync('git', ['-C', dirname(src), 'rev-parse', '--short', 'HEAD']).toString().trim(); } catch {}
  console.log(`${p.name} → /${p.path}/${commit ? ` (${commit})` : ''}`);
}
writeFileSync(join(OUT, '.nojekyll'), '');
console.log(`built ${OUT}`);
