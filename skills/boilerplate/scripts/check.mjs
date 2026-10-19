#!/usr/bin/env node
// Proves that a component installed from this skill kept its behavior: every behavior class, every data-slot and
// every export of the shipped file is still in the project's copy, and only the look changed.
//
//   node <this skill's folder>/scripts/check.mjs <file or folder>... [--component <name>] [--json]
//
// Run it from anywhere: the project is the nearest folder above the first path with a package.json. A folder is
// searched for the boilerplate's components (by their data-slots). Exits 0 when everything passes; 1 when a
// behavior class or a slot is missing, when a package the component is built on (Base UI, `cn`) isn't imported or
// another primitives library is, or when the look still uses this skill's color names the project doesn't define
// (they render nothing); 2 on a usage error. Needs Node 18+, nothing else.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const { components } = JSON.parse(readFileSync(join(here, '../components/manifest.json'), 'utf8'));

// This site's own color names (the shipped files' look uses them). Left in a project that doesn't define them, they
// render nothing: the look wasn't fitted.
const SITE_COLOR = /(?:^|:)(?:bg|text|border|ring|outline|divide|fill|stroke|from|to|via|decoration)-((?:base|weak|soft|sub|strong|inverse|disabled|primary(?:-dark)?|(?:information|success|warning|danger)(?:-light|-dark)?))(?:\/\d+)?$/;
const SITE_VAR = /var\(--((?:bg|text|stroke)-(?:base|weak|soft|sub|strong|inverse|disabled)|primary(?:-dark)?|(?:information|success|warning|danger)(?:-light|-dark)?)\)/;
// `text-base` is Tailwind's 16px type, not a color.
const NOT_COLORS = new Set(['text-base']);

// The color names and variables the project itself defines (its CSS, from its root down), so a name it shares with
// the skill (`primary`, `danger`) isn't reported as unfitted.
function projectNames(root) {
  const names = new Set();
  const walk = (dir, depth) => {
    if (depth > 6) return;
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      if (name === 'node_modules' || name.startsWith('.') || name === 'dist' || name === 'build') continue;
      const full = join(dir, name);
      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) walk(full, depth + 1);
      else if (/\.(css|scss|pcss)$|^tailwind\.config\.[cm]?[jt]s$/.test(name)) {
        const text = readFileSync(full, 'utf8');
        for (const m of text.matchAll(/--(?:color|background-color|text-color|border-color|ring-color|outline-color)-([\w-]+)\s*:/g)) names.add(m[1]);
        for (const m of text.matchAll(/--([\w-]+)\s*:/g)) names.add(`var:${m[1]}`);
        for (const m of text.matchAll(/['"]?([\w-]+)['"]?\s*:\s*(?:['"`]|\{|hsl|rgb|oklch|var)/g)) names.add(m[1]);
      }
    }
  };
  walk(root, 0);
  return names;
}
let defined = new Set();
// A skill color name in the file: 'unfitted' when the project doesn't define it, 'shared' when it does (the project
// has its own `primary` or `danger`, which may not mean what the skill's does), otherwise null.
const colorName = (token) => {
  if (NOT_COLORS.has(token.replace(/^.*:/, ''))) return null;
  const color = token.match(SITE_COLOR)?.[1];
  if (color) return defined.has(color) ? 'shared' : 'unfitted';
  const variable = token.match(SITE_VAR)?.[1];
  if (variable) return defined.has(`var:${variable}`) ? 'shared' : 'unfitted';
  return null;
};

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const value = args[i + 1];
  args.splice(i, 2);
  return value;
};
const json = args.includes('--json') && args.splice(args.indexOf('--json'), 1);
const forced = flag('--component');
if (!args.length || args.includes('--help')) {
  console.error('usage: node scripts/check.mjs <file or folder>... [--component <name>] [--json]');
  console.error(`components: ${Object.keys(components).join(', ')}`);
  process.exit(2);
}
// The project: the nearest folder above the first path that has a package.json.
function projectRoot(path) {
  let dir = resolve(path);
  if (existsSync(dir) && !statSync(dir).isDirectory()) dir = dirname(dir);
  for (let d = dir; ; d = dirname(d)) {
    if (existsSync(join(d, 'package.json'))) return d;
    if (dirname(d) === d) return process.cwd();
  }
}
defined = projectNames(projectRoot(args[0]));

// The shipped look's own type and shape (this site's serif, its exact sizes, tracking, its 2px radius): left as they
// are, they're not the project's look. A warning only: the project may happen to share one.
const shippedLook = (token) => /^(?:[\w-]+:)*(?:font-serif|rounded-xs|text-\[\d|tracking-(?:\[|widest)|leading-\[|shadow-\[)/.test(token);

if (forced && !components[forced]) {
  console.error(`unknown component "${forced}"; one of: ${Object.keys(components).join(', ')}`);
  process.exit(2);
}

// Comments don't count: a class moved into a comment is a class removed.
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const has = (text, token) => {
  const at = (i) => i === -1 || /[\s'"`{}]/.test(text[i]);
  for (let i = text.indexOf(token); i !== -1; i = text.indexOf(token, i + 1)) {
    if (at(i - 1) && (i + token.length >= text.length || /[\s'"`{}]/.test(text[i + token.length]))) return true;
  }
  return false;
};
const slotsIn = (text) => new Set([...text.matchAll(/data-slot["']?\s*[:=]\s*["']([\w-]+)["']|part\(\s*['"][^'"]+['"],\s*['"]([\w-]+)['"]/g)].map((m) => m[1] ?? m[2]));

// Which component a file holds: the one whose data-slots it shares most.
function detect(text) {
  const slots = slotsIn(text);
  let best;
  let score = 0;
  for (const [name, c] of Object.entries(components)) {
    const shared = c.slots.filter((s) => slots.has(s)).length / c.slots.length;
    if (shared > score) [best, score] = [name, shared];
  }
  return score >= 0.5 ? best : undefined;
}

function files(path) {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path).flatMap((name) => {
    if (name === 'node_modules' || name.startsWith('.')) return [];
    const full = join(path, name);
    return statSync(full).isDirectory() ? files(full) : /\.[jt]sx$/.test(name) ? [full] : [];
  });
}

// Primitives libraries a boilerplate component must never be built on: each is Base UI's job here.
const FORBIDDEN = /^(?:@radix-ui\/|radix-ui$|@headlessui\/|react-aria|@react-aria\/|@ark-ui\/|@mui\/(?:base|material)|@reach\/|@ariakit\/|ariakit|vaul$|cmdk$)/;

const results = [];
// A component fails on missing behavior, a missing slot, a missing or forbidden package, or unfitted color names;
// warnings never fail it.
const failedOf = (r) =>
  !r.name ||
  r.missing?.length > 0 ||
  r.missingSlots?.length > 0 ||
  r.missingImports?.length > 0 ||
  r.forbiddenImports?.length > 0 ||
  r.siteTokens?.length > 0;
for (const path of args) {
  let list;
  try {
    list = files(path);
  } catch {
    console.error(`not found: ${path}`);
    process.exit(2);
  }
  const fromFolder = statSync(path).isDirectory();
  for (const file of list) {
    const raw = readFileSync(file, 'utf8');
    const name = forced ?? detect(raw);
    if (!name) {
      if (!fromFolder) results.push({ file, name: null });
      continue;
    }
    const c = components[name];
    const text = code(raw);
    const missing = c.behavior.filter((t) => !has(text, t));
    const slots = slotsIn(raw);
    const missingSlots = c.slots.filter((s) => !slots.has(s));
    const imported = [...raw.matchAll(/(?:^|\n)\s*import\s[^;]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1] ?? m[2]);
    const missingImports = (c.imports ?? []).filter((spec) => !imported.includes(spec));
    const forbiddenImports = [...new Set(imported.filter((spec) => FORBIDDEN.test(spec)))];
    const missingExports = c.exports.filter((e) => !new RegExp(`\\bexport\\b[^\\n]*\\b${e}\\b|\\b${e}\\b[^\\n]*\\bexport\\b|export \\{[^}]*\\b${e}\\b`).test(raw));
    const words = text.split(/[\s'"`{}]+/);
    const siteTokens = [...new Set(words.filter((t) => colorName(t) === 'unfitted'))];
    const sharedTokens = [...new Set(words.filter((t) => colorName(t) === 'shared'))];
    const lookKept = [...new Set(words.filter((t) => c.look.includes(t) && shippedLook(t)))];
    // Most behavior gone: rewritten, or moved off Tailwind (which the boilerplate doesn't allow).
    const ported = missing.length > c.behavior.length * 0.7;
    results.push({ file, name, c, missing, missingSlots, missingExports, missingImports, forbiddenImports, siteTokens, sharedTokens, lookKept, ported });
  }
}

if (json) {
  console.log(JSON.stringify(results.map(({ c, ...r }) => r), null, 2));
} else {
  if (!results.length) console.log('No boilerplate components found there.');
  for (const r of results) {
    const where = relative(process.cwd(), r.file) || r.file;
    if (!r.name) {
      console.log(`✗ ${where}: not a boilerplate component (pass --component <name> if it is one)`);
      continue;
    }
    const kept = r.c.behavior.length - r.missing.length;
    console.log(`${failedOf(r) ? '✗' : '✓'} ${r.name}  ${where}`);
    console.log(`    behavior  ${kept}/${r.c.behavior.length} classes kept`);
    console.log(`    slots     ${r.c.slots.length - r.missingSlots.length}/${r.c.slots.length} data-slots kept`);
    console.log(`    exports   ${r.c.exports.length - r.missingExports.length}/${r.c.exports.length}`);
    if (r.ported) {
      console.log('    Most behavior classes are gone: this isn\'t the shipped component any more (rewritten, or moved off');
      console.log(`    Tailwind). Start again from components/${r.name}.tsx: the boilerplate is Tailwind v4 only.`);
    } else if (r.missing.length) {
      console.log(`    missing behavior: ${r.missing.join('  ')}`);
      console.log(`    Put them back exactly as in components/${r.name}.tsx, or, for a change the user asked for,`);
      console.log('    say which classes changed and why in the report.');
    }
    if (r.missingSlots.length) console.log(`    missing data-slot: ${r.missingSlots.join(', ')}`);
    if (r.missingImports.length)
      console.log(`    not imported: ${r.missingImports.join(', ')} (the component is built on these: import them exactly as components/${r.name}.tsx does, \`cn\` from 'cn', never the project's own helper)`);
    if (r.forbiddenImports.length)
      console.log(`    built on another library: ${r.forbiddenImports.join(', ')} (boilerplate components use Base UI only: rebuild it on the shipped file)`);
    if (r.missingExports.length)
      console.log(`    not exported (fine if a rebuild renamed them on purpose): ${r.missingExports.join(', ')}`);
    if (r.siteTokens.length)
      console.log(`    unfitted look: ${r.siteTokens.join(' ')} (this skill's color names, which the project doesn't define: they render nothing. Restyle them from the look map)`);
    if (r.sharedTokens.length)
      console.log(`    shared names, confirm: ${r.sharedTokens.join(' ')} (the project defines these names too; make sure they mean the same here, e.g. primary as the focus accent, not a button fill)`);
    if (r.lookKept.length)
      console.log(`    shipped look still in place: ${r.lookKept.join(' ')} (restyle them, unless they're the project's own)`);
  }
  const failed = results.filter(failedOf).length;
  console.log(failed ? `check failed: ${failed} of ${results.length}` : `check passed: ${results.length} component${results.length === 1 ? '' : 's'}`);
}

process.exit(results.some(failedOf) ? 1 : 0);
