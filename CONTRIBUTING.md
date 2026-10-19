# Contributing

Thank you for helping. These skills are judged by two things: a component added with them looks like it was always part of the project, and nothing it replaced breaks. Most of this guide is about keeping both true.

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Setup

You need Node.js 18 or later and [pnpm](https://pnpm.io).

```sh
git clone https://github.com/frontendsupply/skills.git
cd skills
pnpm install
```

To use your working copy as the skills while you change them, link them into your agent's skills folder (move any installed copy out of the way first):

```sh
ln -s "$PWD/skills/boilerplate" ~/.claude/skills/boilerplate
ln -s "$PWD/skills/skeleton" ~/.claude/skills/skeleton
```

For Codex use `~/.agents/skills/`, for OpenCode `~/.config/opencode/skills/`.

## The checks

```sh
pnpm test
```

It runs what CI runs: the chart package's test, which builds it and runs every chart at common sizes and options through `skills/skeleton/scripts/check-drawing.mjs`. Every line must pass.

A skill's `scripts/check.mjs` checks a project's installed copy, so try a change for real: install the skill in a scratch project (React 19, Tailwind v4), ask for what you changed, run the skill's check on what it wrote (`node skills/<name>/scripts/check.mjs <the project's file>`), and look at it in a browser at desktop width and at 375px, light and dark.

## House rules

- **Behavior, not a look.** Every class list in `cn()` is split into a `// behavior` group (layout, overflow, positioning, size limits, motion, state hooks) and a `// look` group (color, border, radius, shadow, type, spacing, sizes). A class in neither fails the build of `manifest.json`.
- **Name every coupling.** When a look value feeds the behavior, route it through one variable or one constant, comment it, and list it under "Look values the behavior depends on" in the component's reference.
- **Built on Base UI and `cn`, nothing else.** Components import `@base-ui/react/*` and `import { cn } from 'cn'`, never another primitives library or a local helper. Components never import each other.
- **Parts, not props.** Small exported parts, no `items={[]}` APIs or feature-flag props. Every part sets `data-slot`, takes `className` merged last, and styles state from data attributes.
- **Tailwind classes written out in full,** in their canonical form (`size-4.5`, not `size-[18px]`).
- **References share one shape:** Setup, Parts, Usage and behavior, Rules, Rebuilding one (with its translation table), Look values the behavior depends on. What every component shares lives once, in `SKILL.md` and the shared references.
- **Chart drawings** use only the four parts (`data-line`, `data-guide`, `data-fill`, `data-stripes`), on the pixel grid, and pass `check-drawing.mjs`.
- **True docs.** Every behavior a `SKILL.md` or reference claims is in the code, and every eval's expected output is what the skill really does.

## Where changes land

This repository is published from frontend.supply's own workspace, where the components are also shown on the site. A merged pull request is carried back there, so keep a change to one thing and say why in the description.

## Releases

Packages are released from `packages/<name>` with `pnpm publish`, which builds and tests first. Add a line under `Unreleased` in `CHANGELOG.md` with every change.
