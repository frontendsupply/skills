<h1 align="center">frontend.supply skills</h1>

<p align="center"><b>Agent skills for React UI: the hard behavior done once, the look always yours.</b><br>For Claude Code, Codex, Cursor, OpenCode and every agent that reads the Agent Skills format.</p>

<p align="center">
  <a href="https://code.claude.com/docs/en/skills"><img src="https://img.shields.io/badge/Claude_Code-skills-1b1b19?style=flat-square&logo=claude&logoColor=white" alt="Claude Code skills"></a>
  <a href="https://agentskills.io"><img src="https://img.shields.io/badge/Agent_Skills-compatible-1b1b19?style=flat-square" alt="Agent Skills compatible"></a>
  <a href="https://www.npmjs.com/package/@frontendsupply/chart-skeletons"><img src="https://img.shields.io/npm/v/@frontendsupply/chart-skeletons?style=flat-square&color=1b1b19&label=chart-skeletons" alt="@frontendsupply/chart-skeletons on npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-1b1b19?style=flat-square" alt="MIT license"></a>
  <a href="https://github.com/frontendsupply/skills/actions/workflows/ci.yml"><img src="https://github.com/frontendsupply/skills/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#the-skills">The skills</a> ·
  <a href="#the-packages">The packages</a> ·
  <a href="#install">Install</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="#requirements">Requirements</a>
</p>

---

Every product needs the same components, and every team rebuilds them: a dialog that becomes a sheet on phones, a menu with submenus and shortcuts, a select that uses the phone's own picker, a sidebar that collapses to an icon rail, loading states that look like the screen they stand for. The hard part is never the look. It's focus, keyboards, screen readers, phones, long content and motion.

These skills carry that hard part into your project and nothing else. Your agent copies the behavior exactly, writes the look in your project's own tokens, and proves with a script that only the look changed.

## Quick start

```sh
npx skills add frontendsupply/skills
```

The CLI asks which skills and which agents to set up. Add `--skill boilerplate` or `--skill skeleton` to pick one, `-g` to install for every project on your machine, and `-a claude-code` (or `-a codex`, `-a cursor`, `-a opencode`) to skip the agent question.

Then ask in your own words:

```text
Add a dialog for deleting a project, with a confirm step.
```

```text
Show a skeleton while the orders table loads.
```

Or use the commands: `/boilerplate add dialog`, `/skeleton add orders`.

## The skills

### Boilerplate

[`skills/boilerplate`](skills/boilerplate): six components every product needs, built on [Base UI](https://base-ui.com).

| Component | Gives you |
| --- | --- |
| `button` | One size, five statuses, solid/outline/ghost, icons, a loading state that holds its width and its focus |
| `dialog` | Modal on desktop, swipeable bottom sheet below 768px, long content, nested stacks, cancelable close |
| `input` | Field frame with icons and addons, clear, show password, copy, ⌘K focus, count, autocomplete, label and error |
| `menu` | Dropdown, context menu and menubar from one set of rows, stacked submenus, checkbox and radio items, shortcuts |
| `select` | One or several values, a list over its trigger with a mouse, the platform's picker on phones |
| `sidebar` | Icon rail with tooltips, peek on hover, resize, shortcut, sub panel, phone drawer |

Every class list in a component is split into a `// behavior` group (layout, overflow, positioning, motion, state) and a `// look` group (color, border, radius, shadow, type, spacing). The agent keeps the first and rewrites the second in your tokens.

| Command | What it does |
| --- | --- |
| `/boilerplate` | Your stack, which components you have, and what to do next. Changes nothing. |
| `/boilerplate add <name…>` | Adds components, in your project's look. |
| `/boilerplate refactor <name…>` | Rebuilds your existing ones (shadcn/ui, Radix, MUI, hand-rolled) on the boilerplate, keeping every call site. |
| `/boilerplate review` | Audits your components against the boilerplate. |
| `/boilerplate update` | Brings installed components up to the current files, keeping your look. |
| `/boilerplate check` | Proves your copies kept the behavior. |

### Skeleton

[`skills/skeleton`](skills/skeleton): loading skeletons drawn from your component's own markup, only where it waits on data.

While loading, the real component renders with placeholder data, and every element marked `data-skeleton` is drawn instead of shown: text as borderless bars, one per line; pictures and video as striped plates with a 1px border; data icons as circles; charts as drawings of themselves. Labels, buttons and static icons show as they are. Outlines trace in, and the data fades in when it lands.

| Command | What it does |
| --- | --- |
| `/skeleton` | What loads in your project and how each screen shows it now. Changes nothing. |
| `/skeleton add <component…>` | Marks a component's data, writes its placeholder data, wraps it. |
| `/skeleton chart <name or screenshot>` | Draws a chart's skeleton at its exact size, from its name, its code or a screenshot. |
| `/skeleton refactor` | Replaces spinners and hand-drawn skeletons with skeletons drawn from the component. |
| `/skeleton check` | Proves your copy draws with paint only and kept its behavior. |

## The packages

| Package | What |
| --- | --- |
| [`@frontendsupply/chart-skeletons`](packages/chart-skeletons) | Loading-state drawings of 14 common charts (line, area, bar, stacked and horizontal bars, pie, donut, scatter, radar, heatmap, candlestick, gauge, funnel, sparkline) at a chart's exact size, and the kit they're drawn with, for any other chart. The skeleton skill uses it. |

```sh
pnpm add @frontendsupply/chart-skeletons
```

```tsx
import { BarChartSkeleton } from '@frontendsupply/chart-skeletons';

<Skeleton loading={isPending}>
  {isPending ? <BarChartSkeleton width={320} height={180} bars={7} /> : <OrdersChart data={data} />}
</Skeleton>
```

## Install

These are standard [Agent Skills](https://agentskills.io): each folder under `skills/` has a `SKILL.md` at its root.

| | Command | Installs to |
| --- | --- | --- |
| **skills CLI**, one project | `npx skills add frontendsupply/skills` | `.claude/skills/<name>` for Claude Code, `.agents/skills/<name>` for Codex and others |
| **skills CLI**, every project | `npx skills add frontendsupply/skills -g` | `~/.claude/skills/<name>`, `~/.agents/skills/<name>` |
| **skills CLI**, one skill | `npx skills add frontendsupply/skills --skill skeleton` | as above |
| **git** | clone, then link a skill's folder into your agent's skills folder | see below |

<details>
<summary><b>With git</b></summary>

<br>

```sh
git clone https://github.com/frontendsupply/skills.git ~/frontendsupply-skills
ln -s ~/frontendsupply-skills/skills/boilerplate ~/.claude/skills/boilerplate
ln -s ~/frontendsupply-skills/skills/skeleton ~/.claude/skills/skeleton
```

For Codex use `~/.agents/skills/`, for OpenCode `~/.config/opencode/skills/`. To update, `git pull` in the clone.

</details>

Claude Code picks up new skills in a running session; if the `skills` folder didn't exist when it started, run `/reload-skills`.

## How it works

- **`SKILL.md`** is what the agent reads: the catalog, the commands, the workflow and the rules it may not break.
- **`components/`** holds the source files the agent copies, and `manifest.json`, generated from them: each component's behavior classes, `data-slot`s and exports.
- **`references/`** are the long-form guides the agent opens when it needs them: one per component, plus reading your project, rebuilding an existing component, marking data, placeholder data and chart drawings.
- **`scripts/`** prove the work without a browser. `check.mjs` fails a copy that lost a behavior class, a `data-slot`, Base UI or `cn`, or (for the skeleton) that changes layout while loading. The skeleton's `check-drawing.mjs` checks a chart drawing's size, parts, colors, bounds and pixel grid, and prints every failure with where it is.
- **`evals/evals.json`** are test prompts and what a good answer contains.

<details>
<summary><b>Repository layout</b></summary>

<br>

```text
skills/
├── boilerplate/
│   ├── SKILL.md              catalog, commands, workflow, rules
│   ├── components/           button, dialog, input, menu, select, sidebar, manifest.json
│   ├── references/           one per component, project.md, rebuild.md
│   ├── scripts/check.mjs     proves an installed copy kept its behavior
│   └── evals/evals.json
└── skeleton/
    ├── SKILL.md              the ten rules, commands, workflow
    ├── components/           skeleton.tsx, manifest.json
    ├── references/           skeleton.md, marking.md, placeholder.md, charts.md
    ├── scripts/              check.mjs, check-drawing.mjs
    └── evals/evals.json
packages/
└── chart-skeletons/          @frontendsupply/chart-skeletons
```

</details>

## Requirements

| | Needed for | Notes |
| --- | --- | --- |
| **An agent** that reads Agent Skills: [Claude Code](https://code.claude.com/docs/en/overview), [Codex](https://developers.openai.com/codex/skills), Cursor, [OpenCode](https://opencode.ai/docs/skills/) | everything | |
| **React 19** | the components | Boilerplate's Button, Dialog, Input, Menu and Select also run on React 18. |
| **Tailwind CSS v4** | the components | On v3, the skills offer Tailwind's official upgrade first and write nothing until it's done. |
| **[Base UI](https://base-ui.com)** and **[`cn`](https://github.com/shadcn-ui/cn)** | the components | Installed by the agent if missing. |
| **Node.js 18+** | the check scripts | Built-in modules only. |

## Contributing

Issues and pull requests are welcome: read [CONTRIBUTING.md](CONTRIBUTING.md) first. Please follow the [Code of Conduct](CODE_OF_CONDUCT.md), and report security problems as [SECURITY.md](SECURITY.md) describes.

- [Report a bug](https://github.com/frontendsupply/skills/issues/new?template=bug_report.yml)
- [Changelog](CHANGELOG.md)

## License

[MIT](LICENSE) © 2026 [frontend.supply](https://frontend.supply)
