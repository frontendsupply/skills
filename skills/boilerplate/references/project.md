# Reading the project

Do this once per project, before the first component, and write down what you find (step 3). Every later component reads the note instead of guessing again, so the button added today and the select added next month look like one set.

## 1. The stack

Find out, from the files, not from assumptions:

| Question | Where to look | What changes |
| --- | --- | --- |
| Is it React? | `package.json` | Not React (Vue, Svelte, plain HTML): stop. The boilerplate is React; say so, and don't port it halfway. |
| React version | `package.json` | Sidebar needs React 19 (`inert`, `ref` as a prop). On 18, say so before adding it; the rest work on 18. |
| Package manager | the lockfile: `pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lock` / `bun.lockb` → bun, `package-lock.json` → npm | Install with it, never another. |
| TypeScript? | `tsconfig.json`, file extensions | Plain JS: write `.jsx`, drop the types, keep everything else. |
| Server components? | Next.js `app/`, `"use client"` in other files | Put `'use client';` as the first line of every component file: they all use hooks. |
| Tailwind | `@import "tailwindcss"` / `@theme` (v4) or `tailwind.config.*` (v3) | Required: v4. On v3, or without Tailwind, stop and offer the upgrade (SKILL.md, **Built on Base UI and `cn`, always**); never port the components. |
| Class merging | `cn` in `lib/utils` (or `clsx` + `tailwind-merge`) | Doesn't change anything: the components import the [`cn`](https://github.com/shadcn-ui/cn) package (`import { cn } from 'cn'`). Install it if it's missing; the project's own helper stays for its other code. |
| Icons | `lucide-react`, `@heroicons/react`, `@phosphor-icons/react`, an icon folder | Use the project's set; map each icon by meaning (Check, ChevronDown, X, Eye…). |
| UI folder and naming | `components/ui`, `src/components/ui`; `dialog.tsx` vs `Dialog.tsx` | Put the file there, named like its neighbours. |
| Layers | a z-index scale (`z-dropdown`, `--z-modal`) | Popups sit at `z-50`; use the scale's step instead. |
| Dark mode | `.dark` class, `[data-theme]`, `prefers-color-scheme`, CSS variables that flip | Add dark styles the project's way, never a second way. |
| Primitives | `@base-ui/react`, and any of `@radix-ui/*`, `radix-ui`, `@headlessui/react`, `react-aria-components`, `@ark-ui/react`, `@mui/base` | Install `@base-ui/react` when missing: every component is built on it, whatever else the project uses. The others stay for the project's own code; no boilerplate component imports them. |

### Keep Tailwind out of the skill's files

Tailwind v4 finds its classes by reading every file in the project that isn't gitignored, Markdown included. Installed in the project, this skill's own files (`.claude/skills/boilerplate/`, or wherever the agent keeps skills) and the `CLAUDE.md` look map (step 3) are full of class names, so the app's CSS grows by every class in all six components, about 20–30 kB, whether it uses them or not. Once per project, next to `@import "tailwindcss"` in its main CSS file, exclude them (paths are relative to that CSS file):

```css
@import "tailwindcss";
@source not "../.claude";
@source not "../CLAUDE.md";
```

Use the folders and files the project actually has (`.agents`, `AGENTS.md`), and skip what's already gitignored. 
## 2. The look

Read the theme (Tailwind `@theme`, CSS variables, design tokens) and the existing components closest to the one you're adding (each component's reference names them under **Setup**). Note the surface, border and text colors, radius, shadow, height, padding, font size and weight, hover, active, focus and disabled styles, and the status colors.

The shipped files style their look with this site's semantic color names. Decide what each means in the project. When the project has no conventions yet, use the Tailwind default:

| In the files | Means | Tailwind default |
| --- | --- | --- |
| `bg-base` · `bg-weak` · `bg-soft` · `bg-sub` · `bg-strong` | surfaces, from popups to inverted: base (cards, popups), weak (the page, the sidebar), soft (hover, highlight), sub (stronger fills), strong (inverted) | `white` · `neutral-50` · `neutral-100` · `neutral-200` · `neutral-950` |
| `text-strong` · `text-sub` · `text-soft` · `text-disabled` · `text-inverse` | text, from main to muted, placeholders, and text on `bg-strong` | `neutral-950` · `neutral-600` · `neutral-500` · `neutral-400` · `white` |
| `border-soft` · `border-sub` · `border-strong` (and `var(--stroke-soft)`, `var(--stroke-sub)`) | hairlines, hover borders, strong rules | `neutral-200` · `neutral-300` · `neutral-950` |
| `primary` (`ring-primary`, `var(--primary)`) | the accent: focus rings, a selected dot | the project's accent, or `neutral-950` |
| `information` · `success` · `warning` · `danger`, with `-light` (tint) and `-dark` (text) | status: solid fills with white text, tints, and text on tints | `blue-600` · `green-700` · `amber-700` · `red-600`; `-light` the hue's `50`, `-dark` its `700` / `800` |

Restyle only the `// look` groups, so the component looks as if it had always been part of the project:

- **Match the neighbours.** An input is as tall as the project's button; a select looks like its input with a chevron; a menu's rows look like its other lists. Each reference lists the look values its behavior depends on: change those together, as it says.
- **Contrast.** Focus rings 3:1 or better against what's behind them; text, and every solid fill against its text, 4.5:1 or better. Placeholder text stays readable: it isn't a label.
- **Focus stays visible in forced colors.** The behavior groups use `outline-hidden`, not `outline-none`, so Windows High Contrast still draws focus. Keep it.
- **Dark mode** the project's way. A scrim stays dark in both themes, like a shadow.

## 3. Write it down

Add this to the project's `CLAUDE.md` (create the file if it's missing; `AGENTS.md` too, if the project has one instead), or update it when it's already there. Later components read the look map instead of deciding again; anyone editing a component later, with or without this skill, reads the rule.

```md
## UI components

From frontend.supply's boilerplate skill. Keep each file's `// behavior` classes and the couplings its comments
name; restyle only the `// look` groups. `/boilerplate check` proves it.

- `src/components/ui/button.tsx` (button)
- `src/components/ui/dialog.tsx` (dialog)

### Look map

| Boilerplate | Here |
| --- | --- |
| `bg-base` / `bg-soft` / `bg-strong` | `bg-background` / `bg-muted` / `bg-primary` |
| `text-strong` / `text-soft` / `text-inverse` | `text-foreground` / `text-muted-foreground` / `text-primary-foreground` |
| `border-soft` / `border-sub` | `border-border` / `border-input` |
| focus ring (`ring-primary`) | `ring-ring ring-offset-2 ring-offset-background` |
| radius 4px | `rounded-md` |
| row and control height 32px | `h-9` |
| `danger` / `-light` / `-dark` | `destructive` / `destructive/10` / `destructive` |
```

The rows are the project's real classes, found in step 2, not these examples. On the first run, fill in every row below, even for components you aren't adding yet, so later runs never decide again:

- **Surfaces:** popup and card (`bg-base`), the page and sidebar (`bg-weak`), hover and highlight (`bg-soft`), stronger fills and pressed (`bg-sub`), inverted (`bg-strong`), read-only fields.
- **Text:** main, secondary, muted, placeholder (`text-disabled`), on inverted.
- **Borders:** hairlines and popups (`border-soft`), a control's frame (an input's border, which is often its own token), hover borders (`border-sub`).
- **Focus and accent:** the focus ring (`ring-primary`, with its offset if the project uses one), the accent dot.
- **Status:** each of danger, success, warning, information as a solid fill, a tint and text; at least danger, for invalid fields and destructive actions.
- **Radius:** controls (buttons, inputs, triggers), popups and lists, rows inside a padded panel (`rounded-xs`), dialogs.
- **Shadow:** popups and lists, dialogs.
- **Size:** control height (button, input, select trigger), list row height (menu, select and suggestion rows: the same as the control's unless the project's lists differ), the control's horizontal inset.
- **Type:** control text (`text-[13px]`), small labels and group labels (the skill's small caps: keep or drop them as the project's labels do), hints and counts (`font-mono text-[11px]`), dialog titles (`font-serif text-[22px]`).
- **Scrim:** the overlay behind dialogs and drawers. Add a line to the list for every component added or rebuilt, and a row to the map for every decision a later component would otherwise have to make again. A deliberate change to a component's behavior (one the user asked for) goes in the list too, beside its file: `(select: list always opens below)`, so a later `update` keeps it.
