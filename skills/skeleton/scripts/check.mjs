#!/usr/bin/env node
// Checks, without a browser, a project's copy of the skeleton: its stylesheet kept every shipped rule, and every rule
// (and every class the project added to the component with one of its states, `data-loading:` or `data-revealing:`)
// changes paint only, never a box, so the skeletons sit on the placeholder's own layout; the component kept its
// data-slot and Base UI; and the project's CSS sets its color (--skeleton). How it looks is checked in the browser.
//
//   node <this skill's folder>/scripts/check.mjs <skeleton file or folder> [--json]
//
// Exits 0 when everything passes; 1 when a rule can move a box, a shipped rule, the slot or a package is missing, or the
// setup isn't in the project's CSS; 2 on a usage error. Needs Node 18+, nothing else.

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
// Paint only. A declaration (or a class's utility) may change how things are drawn, never how big they are or where
// they sit. Anything not on these lists fails: a skeleton that pads, sizes or hides a box shifts.

const PAINT_PROPERTY =
  /^(?:color|background(?:-[\w-]+)?|border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?-color|border-(?:\w+-)*radius|text-decoration(?:-[\w-]+)?|text-underline-offset|text-shadow|outline(?:-[\w-]+)?|box-shadow|opacity|visibility|object-(?:position|fit)|fill|stroke|filter|clip-path|mask(?:-[\w-]+)?|content|animation(?:-[\w-]+)?|transition(?:-[\w-]+)?|--skeleton[\w-]*)$/;

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
  /^rounded(?:-|$)/, // corners: paint (they clip, never move)
  /^(?:inset-)?(?:ring|shadow)(?:-|$)/,
  /^object-/,
  /^(?:visible|invisible)$/,
  /^opacity-/,
  /^animate-/,
  /^(?:fill|stroke|caret|accent)-/,
  /^mask-/,
  /^(?:blur|brightness|contrast|grayscale|sepia|saturate|hue-rotate|invert|drop-shadow|filter|backdrop-)/,
  /^(?:transition|delay|duration|ease)(?:-|$)/,
];

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
const whileLoading = (token) =>
  parts(token)
    .slice(0, -1)
    .some((v) => /^(?:not-|in-|group-|peer-)?data-(?:loading|revealing)(?:\/\w+)?$|^data-\[(?:loading|revealing)\]$|^aria-busy$/.test(v));

// ---------------------------------------------------------------------------------------------------------------

const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const tokensOf = (text) => [...code(text).matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g)].flatMap((m) => (m[1] ?? m[2] ?? m[3]).split(/\s+/)).filter(Boolean);
const FORBIDDEN = /^(?:@radix-ui\/|radix-ui$|@headlessui\/|react-aria|@react-aria\/|@ark-ui\/|@mui\/(?:base|material)|@reach\/|@ariakit\/|ariakit)/;
const normal = (selector) => selector.trim().replace(/"/g, "'").replace(/\s+/g, ' ');

// The project's skeleton rules: every rule in its CSS whose selector names the skeleton's slot, with its declarations.
function stylesheet(root) {
  const files = walk(root, (n) => /\.(css|scss|pcss)$/.test(n)).map((f) => ({ file: f, text: readFileSync(f, 'utf8') }));
  const rules = files.flatMap(({ file, text }) =>
    [...text.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}@;]+)\{([^{}]*)\}/g)]
      .filter((m) => m[1].includes('data-slot'))
      .map((m) => ({ file, selector: normal(m[1]), properties: [...m[2].matchAll(/([\w-]+)\s*:/g)].map((d) => d[1]) })),
  );
  return {
    rules,
    color: files.some(({ text }) => /--skeleton\s*:/.test(text)),
  };
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
    const imported = [...raw.matchAll(/(?:^|\n)\s*import\s[^;]*?from\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
    const css = stylesheet(projectRoot(file));
    // A shipped rule is kept when the project has its selector setting at least its properties (in one rule or several).
    const sets = (selector) => new Set(css.rules.filter((r) => r.selector === selector).flatMap((r) => r.properties));
    results.push({
      file,
      found: true,
      classShifts: [...new Set(tokensOf(raw))].filter((t) => whileLoading(t) && !paintOnly(t)),
      ruleShifts: css.rules.flatMap((r) => r.properties.filter((p) => !PAINT_PROPERTY.test(p)).map((p) => `${p} in ${r.selector}`)),
      missingRules: shipped.rules
        .filter((rule) => rule.properties.some((p) => !sets(normal(rule.selector)).has(p)))
        .map((rule) => `${rule.selector} { ${rule.properties.filter((p) => !sets(normal(rule.selector)).has(p)).join(', ')} }`),
      slot: /data-slot["']?\s*[:=]\s*["']skeleton["']/.test(code(raw)),
      states: /['"]data-loading['"]/.test(raw) && /['"]data-revealing['"]/.test(raw),
      missingImports: shipped.imports.filter((s) => !imported.includes(s)),
      forbiddenImports: [...new Set(imported.filter((s) => FORBIDDEN.test(s)))],
      color: css.color,
      rulesTotal: shipped.rules.length,
    });
  }
}

const failedOf = (r) =>
  !r.found || r.classShifts.length || r.ruleShifts.length || r.missingRules.length || !r.slot || !r.states || r.missingImports.length || r.forbiddenImports.length || !r.color;

if (json) console.log(JSON.stringify(results, null, 2));
else {
  for (const r of results) {
    const where = relative(process.cwd(), r.file) || r.file;
    if (!r.found) {
      console.log(`✗ ${where}: no skeleton here (no data-slot="skeleton")`);
      continue;
    }
    const shifts = [...r.ruleShifts, ...r.classShifts];
    console.log(`${failedOf(r) ? '✗' : '✓'} skeleton  ${where}`);
    console.log(`    paint only  ${shifts.length ? `${shifts.length} rule(s) or class(es) can move a box` : 'every rule and state class changes paint, never a box'}`);
    console.log(`    rules       ${r.rulesTotal - r.missingRules.length}/${r.rulesTotal} of skeleton.css kept in the project's CSS`);
    console.log(`    colors      ${r.color ? "--skeleton set in the project's CSS" : "--skeleton not set in the project's CSS"}`);
    if (shifts.length) {
      console.log(`    can shift: ${shifts.join('  |  ')}`);
      console.log('    In a skeleton, only paint may change: color, background, border color, outline, corners, shadow,');
      console.log('    decoration, opacity, visibility, animation. Never size, spacing, display, position or font size.');
    }
    if (r.missingRules.length) {
      console.log('    missing rules (put them back exactly as in components/skeleton.css, imported by the main CSS file):');
      for (const s of r.missingRules) console.log(`      ${s}`);
    }
    if (!r.slot) console.log('    missing data-slot="skeleton"');
    if (!r.states) console.log('    missing its states: data-loading and data-revealing (as in components/skeleton.tsx)');
    if (r.missingImports.length) console.log(`    not imported: ${r.missingImports.join(', ')} (import them exactly as components/skeleton.tsx does)`);
    if (r.forbiddenImports.length) console.log(`    built on another library: ${r.forbiddenImports.join(', ')}`);
    if (!r.color) console.log("    Set --skeleton in the project's main CSS file, pointed at its tokens (references/skeleton.md, Setup).");
  }
  const failed = results.filter(failedOf).length;
  console.log(failed ? `check failed: ${failed} of ${results.length}` : `check passed: ${results.length} skeleton${results.length === 1 ? '' : 's'}`);
}

process.exit(results.some(failedOf) ? 1 : 0);
