#!/usr/bin/env node
// Checks, without a browser, a project's copy of the skeleton: every class that turns on with one of its states
// (`data-loading:`, `data-drawn:`, `data-revealing:`) changes paint only, never a box, so the skeletons sit over the
// placeholder's own layout; the copy kept the shipped behavior classes, its data-slot, Base UI and `cn`; and the
// project's CSS sets its color (--skeleton). How it looks is checked in the browser.
//
//   node <this skill's folder>/scripts/check.mjs <skeleton file or folder> [--json]
//
// Exits 0 when everything passes; 1 when a loading class can move a box, a behavior class, the slot or a package is
// missing, or the setup isn't in the project's CSS; 2 on a usage error. Needs Node 18+, nothing else.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const { skeleton: shipped } = JSON.parse(readFileSync(join(here, '../components/manifest.json'), 'utf8'));

const args = process.argv.slice(2);
const json = args.includes('--json') && args.splice(args.indexOf('--json'), 1);
if (!args.length || args.includes('--help')) {
  console.error('usage: node scripts/check.mjs <skeleton file or folder> [--json]');
  process.exit(2);
}

function projectRoot(path) {
  let dir = resolve(path);
  if (existsSync(dir) && !statSync(dir).isDirectory()) dir = dirname(dir);
  for (let d = dir; ; d = dirname(d)) {
    if (existsSync(join(d, 'package.json'))) return d;
    if (dirname(d) === d) return process.cwd();
  }
}

function walk(dir, test, depth = 0) {
  if (depth > 8) return [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries.flatMap((name) => {
    if (name === 'node_modules' || name.startsWith('.') || name === 'dist' || name === 'build') return [];
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full, test, depth + 1) : test(name) ? [full] : [];
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Paint only. A class's utility (what's left after its variants) may change how things are drawn, never how big they
// are or where they sit. Anything not on this list fails: a skeleton that pads, sizes or hides a box shifts.

// Tailwind's font sizes, alignment and wrapping share `text-` with colors; they move text, so they fail.
const TEXT_NOT_COLOR = /^text-(?:xs|sm|base|lg|xl|\dxl|left|center|right|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip|\[length:|\(length:|\[\d|\[calc)/;
const PAINT = [
  /^text-/, // a color (sizes caught above)
  /^(?:underline|overline|line-through|no-underline)$/,
  /^decoration-/,
  /^underline-offset-/,
  /^bg-/,
  /^border(?:-[xytrblse])?-(?:transparent|current|inherit)$/, // a border's color, never its width
  /^-?outline/,
  /^(?:inset-)?(?:ring|shadow)(?:-|$)/,
  /^object-/,
  /^(?:visible|invisible)$/,
  /^opacity-/,
  /^animate-(?:skeleton|none|pulse)$/,
  /^(?:fill|stroke|caret|accent)-/,
  /^(?:mix-blend|bg-blend)-/,
  /^mask-/,
  /^(?:blur|brightness|contrast|grayscale|sepia|saturate|hue-rotate|invert|drop-shadow|filter|backdrop-)/,
  /^(?:pointer-events|cursor|select)-/,
  /^(?:transition|delay|duration|ease)(?:-|$)/, // when, not what: the properties they animate are checked on their own
];
const PAINT_PROPERTY =
  /^(?:color|background(?:-[\w-]+)?|text-decoration(?:-[\w-]+)?|text-underline-offset|outline(?:-[\w-]+)?|box-shadow|opacity|visibility|object-(?:position|fit)|fill|stroke|filter|clip-path|mask(?:-[\w-]+)?|transition(?:-[\w-]+)?|--skeleton[\w-]*)$/;

// A class's variants and utility, split on the colons outside brackets and parens.
function parts(token) {
  const out = [''];
  let depth = 0;
  for (const c of token) {
    if (c === '[' || c === '(') depth++;
    if (c === ']' || c === ')') depth--;
    if (c === ':' && depth === 0) out.push('');
    else out[out.length - 1] += c;
  }
  return out;
}
function paintOnly(token) {
  const utility = parts(token).pop().replace(/^!|!$/g, '');
  const property = utility.match(/^\[([\w-]+):/)?.[1];
  if (property) return PAINT_PROPERTY.test(property);
  if (TEXT_NOT_COLOR.test(utility)) return false;
  return PAINT.some((re) => re.test(utility));
}
// A class that turns on with a state: one of its variants is one of the skeleton's states.
const whileLoading = (token) =>
  parts(token)
    .slice(0, -1)
    .some((v) => /^(?:not-|in-|group-|peer-)?data-(?:loading|drawn|revealing)(?:\/\w+)?$|^data-\[(?:loading|drawn|revealing)\]$|^aria-busy$/.test(v));

// ---------------------------------------------------------------------------------------------------------------

const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const tokensOf = (text) => [...code(text).matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g)].flatMap((m) => (m[1] ?? m[2] ?? m[3]).split(/\s+/)).filter(Boolean);
const FORBIDDEN = /^(?:@radix-ui\/|radix-ui$|@headlessui\/|react-aria|@react-aria\/|@ark-ui\/|@mui\/(?:base|material)|@reach\/|@ariakit\/|ariakit)/;

function setup(root) {
  const css = walk(root, (n) => /\.(css|scss|pcss)$/.test(n))
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');
  const needs = {
    '--skeleton': /--skeleton\s*:/,
  };
  return { missing: Object.entries(needs).filter(([, re]) => !re.test(css)).map(([name]) => name) };
}

const results = [];
for (const path of args) {
  if (!existsSync(path)) {
    console.error(`not found: ${path}`);
    process.exit(2);
  }
  const list = statSync(path).isDirectory() ? walk(path, (n) => /\.[jt]sx$/.test(n)) : [path];
  const found = list.filter((f) => /data-slot["']?\s*[:=]\s*["']skeleton["']/.test(readFileSync(f, 'utf8')));
  if (!found.length) results.push({ file: path, found: false });
  for (const file of found) {
    const raw = readFileSync(file, 'utf8');
    const tokens = new Set(tokensOf(raw));
    const imported = [...raw.matchAll(/(?:^|\n)\s*import\s[^;]*?from\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
    results.push({
      file,
      found: true,
      shifts: [...tokens].filter((t) => whileLoading(t) && !paintOnly(t)),
      missing: shipped.behavior.filter((t) => !tokens.has(t)),
      slot: /data-slot["']?\s*[:=]\s*["']skeleton["']/.test(code(raw)),
      missingImports: shipped.imports.filter((s) => !imported.includes(s)),
      forbiddenImports: [...new Set(imported.filter((s) => FORBIDDEN.test(s)))],
      setup: setup(projectRoot(file)),
    });
  }
}

const failedOf = (r) => !r.found || r.shifts.length || r.missing.length || !r.slot || r.missingImports.length || r.forbiddenImports.length || r.setup.missing.length;

if (json) console.log(JSON.stringify(results, null, 2));
else {
  for (const r of results) {
    const where = relative(process.cwd(), r.file) || r.file;
    if (!r.found) {
      console.log(`✗ ${where}: no skeleton here (no data-slot="skeleton")`);
      continue;
    }
    console.log(`${failedOf(r) ? '✗' : '✓'} skeleton  ${where}`);
    console.log(`    paint only  ${r.shifts.length ? `${r.shifts.length} class(es) in a state can move a box` : 'every class in a state changes paint, never a box'}`);
    console.log(`    behavior    ${shipped.behavior.length - r.missing.length}/${shipped.behavior.length} classes kept`);
    console.log(`    colors      ${r.setup.missing.length ? `not set in the project's CSS: ${r.setup.missing.join(', ')}` : "--skeleton set in the project's CSS"}`);
    if (r.shifts.length) {
      console.log(`    can shift: ${r.shifts.join('  ')}`);
      console.log('    In a state, only paint may change: color, border color, background, mask, shadow, decoration, object');
      console.log('    position, opacity, visibility. Move these out of the state, or into the content itself.');
    }
    if (r.missing.length) console.log(`    missing behavior: ${r.missing.join('  ')} (put them back exactly as in components/skeleton.tsx)`);
    if (!r.slot) console.log('    missing data-slot="skeleton"');
    if (r.missingImports.length) console.log(`    not imported: ${r.missingImports.join(', ')} (import them exactly as components/skeleton.tsx does)`);
    if (r.forbiddenImports.length) console.log(`    built on another library: ${r.forbiddenImports.join(', ')}`);
    if (r.setup.missing.length) console.log("    Set them in the project's main CSS file, pointed at its tokens (references/skeleton.md, Setup).");
  }
  const failed = results.filter(failedOf).length;
  console.log(failed ? `check failed: ${failed} of ${results.length}` : `check passed: ${results.length} skeleton${results.length === 1 ? '' : 's'}`);
}

process.exit(results.some(failedOf) ? 1 : 0);
