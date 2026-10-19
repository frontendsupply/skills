---
name: boilerplate
description: React UI boilerplate on Base UI - Button, Dialog (modal on desktop, swipeable sheet on phones, nested stacks), Input (field frame, clear, password, copy, ⌘K, count, autocomplete, label and error), Menu (dropdown, context menu, menubar, stacked submenus, shortcuts), Select (list over its trigger, the platform's picker on phones) and Sidebar (icon rail, peek, resize, sub panel, phone drawer). Ships the behavior, rewrites the look in the project's own tokens, and proves with a script that only the look changed. Use whenever someone adds or needs any of these (modal, popup, sheet, dropdown, context or right-click menu, menu bar, text or search field, form field, picker, nav sidebar, app shell, icon button), wants existing ones (shadcn/ui, Radix, MUI, hand-rolled) replaced, migrated or upgraded without breaking call sites, asks to review their UI components, or edits a file split into `// behavior` and `// look` groups, even without saying boilerplate.
license: MIT
compatibility: Agent Skills format (Claude Code, Codex, Cursor, OpenCode and others). Projects - React 18+ (Sidebar needs 19) and Tailwind CSS v4. Every component is built on @base-ui/react and cn (shadcn-ui/cn), installed if missing. scripts/check.mjs needs Node 18+.
---

# Boilerplate

The components every product needs, done properly once. Each one carries the hard part: focus, keyboard, screen readers, phones, long content, edge cases, motion. None of it carries a look. Every class list in a component file is split into a `// behavior` group (layout, overflow, positioning, motion, state hooks) and a `// look` group (color, border, radius, shadow, type, spacing). You copy the behavior exactly and rewrite the look in the project's own design tokens.

**The bar:** someone who knows the project can't tell the component was added this week, and no screen that used the old one breaks. Three things decide whether you meet it:

1. **The look is the project's.** Read the project before the first component, and record its look map, so every component matches the others (`references/project.md`).
2. **The behavior is the boilerplate's.** Copied untouched, on the packages it was built on, and proved: `scripts/check.mjs` must report every behavior class, every `data-slot` and every package kept.
3. **Call sites keep working.** A rebuild maps the old API onto the new one and updates every caller in the same change (`references/rebuild.md`).

## Built on Base UI and `cn`, always

Not negotiable, in every project:

- **[Base UI](https://base-ui.com) (`@base-ui/react`) is what every component is built on.** Install it if it's missing. A project that already uses Radix, Headless UI, React Aria, Ark, MUI or its own primitives keeps them for its other code, but no boilerplate component is built on them, wraps them or imports them. Rebuilding a Radix-based component means its file moves to Base UI; Radix stays installed for whatever else uses it (never uninstall the project's packages).
- **[`cn`](https://github.com/shadcn-ui/cn) (the `cn` package) does the class merging.** Install it if it's missing, and import it exactly as the files do: `import { cn } from 'cn'`. Even when the project has its own `cn` in `lib/utils` (`clsx` + `tailwind-merge`), the components import the package; the project's helper stays for its other code. Button's recipe uses `tailwind-variants`' lite build, and `cn` merges its classes too.
- **Tailwind CSS v4.** The components and `cn` are written for it. On Tailwind v3, stop before writing anything: say the boilerplate needs v4 and offer Tailwind's official upgrade first (`@tailwindcss/upgrade`, run with the project's package runner: `npx`, `pnpm dlx`, `bunx`), then check the project's own styles still hold. Without Tailwind at all, say so and offer to add Tailwind v4 first. Never port the components to another styling system.

What follows the project is the look, never the foundations: its colors, radius, shadows, type, spacing and dark mode, its icon set, its folders and file names. `scripts/check.mjs` fails a component that doesn't import Base UI and `cn` as shipped, or that imports another primitives library.

## Components

| Component | Gives you | Needs | Reference |
| --- | --- | --- | --- |
| `button` | One size, five statuses, solid/outline/ghost, leading/trailing/icon-only icons, a loading state that holds its width and its focus | `@base-ui/react`, `tailwind-variants`, `cn` | `references/button.md` |
| `dialog` | Modal on desktop, swipeable bottom sheet below 768px, long content, nested stacks, close-all, cancelable close, one dialog for many triggers | `@base-ui/react`, `cn` | `references/dialog.md` |
| `input` | Text field and frame (icons, addons, buttons), clear, show password, copy, ⌘K focus, count, Caps Lock, autocomplete with sections, Field label, description and error, mobile keyboards | `@base-ui/react`, `lucide-react`, `cn` | `references/input.md` |
| `menu` | Dropdown, context menu and menubar from one set of rows; stacked submenus of any depth; checkbox and radio items; keyboard shortcuts | `@base-ui/react`, `keyux`, `lucide-react`, `cn` | `references/menu.md` |
| `select` | One or several values; a list that opens over its trigger with a mouse, the platform's picker on phones and tablets; sections, typeahead, scroll arrows | `@base-ui/react`, `lucide-react`, `cn` | `references/select.md` |
| `sidebar` | App sidebar: icon rail with tooltips, peek on hover, resize, shortcut, left or right, sub panel, phone drawer, collapsible sections | React 19, `@base-ui/react`, `lucide-react`, `cn` | `references/sidebar.md` |

They don't import each other, but they're made to sit together: menus open from buttons and sidebar rows, a select is drawn like the input, a sidebar's search field is the input. When one is added and a neighbour it pairs with already exists, match them.

## Commands

| Command | What it does | Writes? |
| --- | --- | --- |
| `/boilerplate` | Status: the project's stack, which of the six it has (from where, how many call sites), what `check` says about the ones from here, and the next step worth taking. | no |
| `/boilerplate list` | The catalog above, one line each. | no |
| `/boilerplate add <name…>` | Adds components from scratch. `add all` adds the six. If the project already has one, that one is rebuilt instead (say so first): there are never two. | yes |
| `/boilerplate refactor <name…>` | Rebuilds the project's existing components on the boilerplate, keeping their look, names and every call site. Also: *rewrite*, *migrate*, *replace*, *upgrade*. | yes |
| `/boilerplate review [name…]` | Audits the project's components against the boilerplate: what a rebuild would gain and cost, and what to run. | no |
| `/boilerplate update [name…]` | Brings components installed from here up to the current files, keeping the project's look and its deliberate changes. | yes |
| `/boilerplate check [path]` | Runs `scripts/check.mjs` on the project's UI folder (or a file) and explains the result. | no |

Plain requests map onto these: "add a modal" is `add dialog`; "replace our shadcn dropdown" is `refactor menu`; "are our components any good?" is `review`; "the select from that skill, but newer" is `update select`.

- **Names** are the six above, any case, and these aliases: *modal, popup, sheet, confirm* → dialog; *dropdown, context menu, right-click menu, menubar, overflow menu* → menu; *text field, search, search box, password field, form field, field, autocomplete* → input; *picker, dropdown select, combobox-less select* → select; *nav, navigation, app shell, side nav, rail* → sidebar; *icon button* → button.
- **Several names** run in this order, so each can match the ones before it: button, input, select, dialog, menu, sidebar.
- **An unknown name** (a table, a date picker, tabs): say it isn't in the boilerplate and list what is. Don't improvise one in its style.
- **No name** for `add` or `refactor`: show the status and ask which.

## Workflow

For `add`, `refactor` and `update`. Do every step for every component, and don't call it done until step 6 passes.

1. **Read the project.** `references/project.md`: the stack (React and its version, package manager, TypeScript, server components, Tailwind version, class merging, icons, UI folder, z-index scale, dark mode) and the look. If its `CLAUDE.md` already has a **Look map** from an earlier run, use it, and only check it's still true (and fill in any row it's missing). Every run, make sure Tailwind doesn't read the skill's own files (the `@source not` lines in `references/project.md`): otherwise every class in all six components lands in the app's CSS.
2. **Decide, per component:** add it, or rebuild the one that's there. Look for it the way its reference's **Rebuilding one** says (a file of its own or a library import). Never add a second one beside an existing one. Some lean on another's parts: a select's label and error are a `Field` (the project's own, or Input's: say so if neither is there, and suggest `add input`); a sidebar's search field is Input's. Never write a second set.
3. **Read its reference end to end** before writing. Its first three sections are what writing it takes: **Setup**, **Look values the behavior depends on**, **Rebuilding one**. The rest is how it behaves, its rules and what it deliberately leaves out: what you keep, and what you'll tell the user.
4. **Install** what its **Setup** lists, with the project's package manager, whatever the project already has: `@base-ui/react` and `cn` always (they're the foundations, above), plus the component's own (`tailwind-variants`, `keyux`, `lucide-react` unless the project uses another icon set). Then do its one-time setup (KeyUX started once for menus, `isolation: isolate` for dialogs).
5. **Write it.** Copy `components/<name>.tsx` from this skill's folder into the project's UI folder, named like its neighbours. Then:
   - restyle every `// look` group from the look map (`grep -n '// look'` finds them; shared ones sit in consts named `…ClassName`). The shipped look uses this skill's own color names, type and radii: none may survive unless they're the project's. Update the numbers the look comments quote to the new values (an inset, a row height), so they stay true;
   - keep the imports of Base UI and `cn` exactly as shipped (`import { cn } from 'cn'`, never the project's helper); swap the icons for the project's icon set if it has another; add `'use client';` for server components;
   - leave every `// behavior` group exactly as shipped, and keep its comments: they name the couplings the next person needs.

   For a rebuild, follow `references/rebuild.md` instead of a plain copy: inventory, map, carry the old look over, update every call site in the same change.
6. **Prove it.**
   - `node <this skill's folder>/scripts/check.mjs <the component's file>` reports `check passed`: every behavior class and data-slot kept, Base UI and `cn` imported as shipped and no other primitives library, and none of the skill's color names left that the project doesn't define. A failure is fixed in the file, never argued away; the only exception is a behavior change the user asked for, named in the report and the project's `CLAUDE.md`. Two warnings don't fail it but need a look: **shared names** (the project defines `primary` too: make sure it means the same, the focus accent, not a button fill) and **shipped look still in place** (the skill's own type sizes and radii: keep them only if they're the project's).
   - The project's type check, lint, tests and build pass.
   - The reference's **Try by hand** list, in the running app when there's a dev server and a browser tool: open a screen that uses it and try it, with the keyboard and at phone width. Otherwise, list what to try in the report.
7. **Write it down.** Add the component and any new look-map rows to the project's `CLAUDE.md` (`references/project.md`, step 3).
8. **Report** in this shape, one block per component:

   ```
   Dialog: added at src/components/ui/dialog.tsx
   - Look: the project's look map (popup bg-background, border-border, rounded-lg, shadow-lg); dark mode via .dark
   - Installed: @base-ui/react. Setup: isolation: isolate on the root wrapper (app/layout.tsx); @source not for .claude and CLAUDE.md
   - Proved: check passed (84/84 behavior classes, 8/8 slots); tsc, eslint, build pass
   - Try it: open Settings → Delete, Tab to the end, Escape; on a phone, swipe it down
   - Left for you: nothing
   ```

   A rebuild says what happened to the old API too:

   ```
   Dialog: rebuilt in place at src/components/ui/modal.tsx (was a hand-rolled Modal)
   - Look: the old Modal's classes (bg-background, rounded-lg, shadow-lg, p-6, max-w-lg); scrim bg-black/50
   - API: kept. Modal stays a thin wrapper over the parts (open, onClose, title, description); the parts are exported too
   - Call sites: 2 in src/App.tsx, unchanged
   - No equivalent, kept: the × close, as a DialogClose in the popup's corner
   - Gained: focus trap and return, scroll lock, a bottom sheet on phones, nested stacks, cancelable close
   - Proved: check passed (84/84, 8/8); tsc, build pass
   - Try it: Delete → Tab to the end → Escape (focus returns to Delete); at 375px it's a sheet
   - Left for you: the delete dialog still closes on a backdrop click, as before; the reference suggests disablePointerDismissal for it
   ```

## Rules

- **The behavior isn't yours to restyle.** Positioning, overflow, motion, sizes the behavior depends on, state hooks: as shipped. When a look value feeds the behavior, the reference says what to change together (`--dialog-radius`, row padding and gap, a control's height). If the user asks for a behavior change, make it, name it in the report, and write it beside the file in `CLAUDE.md`, so `update` keeps it.
- **Parts, not props.** Compose the small exported parts; never add an `items={[…]}` API, a config object or a feature flag to a component. Data-driven use is a small map at the call site.
- **Composition through `render`.** Triggers become the project's buttons with Base UI's `render` prop, never by nesting one button in another.
- **No `!important`** (Tailwind's `!`), in the look or anywhere else. When a class loses to another, remove the conflict at its source (`cn` drops the loser of two same-property utilities), or win with a more specific variant (a state, an attribute, `group-data-*`); a Base UI part's inline style is overridden through its `style` prop, which is merged over its own.
- **Every part keeps its `data-slot`**, takes `className` merged last, and styles state from data attributes, never `:hover` alone for what the keyboard can reach.
- **Accessibility is behavior.** Every input, select and icon-only button you add gets a name (a label or `aria-label`); a placeholder is not one. Every dialog and drawer gets a visible close. Gaps you notice elsewhere in the project go in the report, not into the diff.
- **Nothing beyond the component.** No demo pages, no new design tokens, no global CSS beyond the reference's one-time setup, no unrelated refactors. If the project keeps stories or tests for its UI components, add one like its neighbours.
- **Not in the boilerplate:** say so. Tables, date pickers, tabs, toasts and the like aren't here; don't make one up in its style.

## Files

| Path | What |
| --- | --- |
| `components/<name>.tsx` | The six components: the source to copy. |
| `components/manifest.json` | Each component's behavior classes, data-slots, exports and the packages it's built on, generated from the files; what `check.mjs` proves. |
| `references/project.md` | Reading the project's stack and look, the look map and the `CLAUDE.md` note. |
| `references/rebuild.md` | Rebuilding an existing component without breaking call sites, updating an installed one, and the read-only review. |
| `references/<name>.md` | One per component: setup, parts, usage and behavior, rules, how to rebuild one (with a shadcn/Radix translation table), and the look values its behavior depends on. |
| `scripts/check.mjs` | `node scripts/check.mjs <file or folder>`: the proof that only the look changed. |
