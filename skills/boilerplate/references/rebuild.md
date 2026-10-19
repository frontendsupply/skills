# Rebuilding, updating and reviewing

## Rebuild (`/boilerplate refactor <name>`)

The project already has the component: a file of its own, or one imported from a library. Rebuild it on the boilerplate's behavior without breaking a single place that uses it. The project's look and names win; only the behavior changes.

1. **Inventory before touching anything.** Read the component's file and find every place it's used:
   - imports of it, including re-exports and barrel files (`components/ui/index.ts`), lazy imports and aliases (`@/components/ui/dialog`);
   - tests and stories that render it or query its DOM (roles, text, `data-state`, test ids);
   - CSS and call-site classes that reach into its old DOM: `[data-state=open]`, `[&_svg]`, `group-data-[…]`, `:has(…)`;
   - wrappers built on it (a `ConfirmDialog` on top of `Dialog`).

   Write the inventory down: each export, its props, variants and defaults, and which call sites use which. This is the contract the rebuild keeps.
2. **Map it.** For every export and prop, find its equivalent in the component's reference (its **Rebuilding one** table). The project's names win: rename the boilerplate's parts to match the call sites, or keep the old names as aliases where the reference says so. Note what has no equivalent: it stays working as it did, or you ask before dropping it.
3. **Keep the look.** The existing component's classes are the look: carry them into the `// look` groups. Where the old component set nothing (no text size, no hover), take the look map's row if it has one, and otherwise leave the shipped value out so the component inherits as the old one did; states the old one couldn't show (focus, disabled, invalid) are the exception, and come from the look map. The behavior groups come from the shipped file, untouched.
   - **A prop-driven API** (`<Modal open onClose title>`): keep it, as a thin wrapper in the same file built from the parts, so no call site changes; export the parts too, for new code. Move the call sites onto the parts only when the user asks.
   - **The old component's own markup** around its children (a header row, `mt-4` around the body, a close button) moves into the wrapper or the parts as the component's reference says, so nothing on screen shifts.
   - **Behavior a user would notice** stays as it was, even where the reference recommends otherwise (a confirmation that closed on a backdrop click still does): recommend the change in the report instead of making it silently.
4. **Change everything in one go.** The component and every call site the mapping touches, in the same change. Never leave a call site on an old prop, a removed export or a stale `data-state` selector. Update tests and stories that depended on the old DOM to the new one, and say which. At the call sites, change only what the mapping requires: an accessibility gap you notice there (an input without a label) goes in the report, not into the diff.
5. **Prove it.** `node scripts/check.mjs <file>` passes; the type check, lint, tests and build pass; and the screens that use it behave and look as before (the reference's **Try by hand** list). If a dev server and a browser are available, open them and look.
6. **Report the contract.** Call sites changed (by file), aliases kept, what had no equivalent and how it was kept, and what the component can do now that it couldn't.

When the old component is a library's (shadcn's generated `ui/dialog.tsx`, a Radix wrapper, a MUI or Chakra import), the same steps hold: the file the project owns is rebuilt in place on Base UI and `cn`, its Radix (or other) imports leave it, and call sites that imported the library directly are pointed at it. The library itself stays installed while anything else in the project uses it; never uninstall it as part of a rebuild.

## Update (`/boilerplate update [name]`)

A component installed earlier from the boilerplate, brought up to the current shipped file, keeping the project's look and any deliberate changes.

1. **Find them.** `node scripts/check.mjs <ui folder>` lists the boilerplate components it finds (by their data-slots) and what each is missing against the current manifest. Missing behavior there is either new behavior (the shipped file changed) or a deliberate change: the project's `CLAUDE.md` list names those.
2. **Rewrite from the shipped file.** Start from `components/<name>.tsx`, and carry the project's look into it group by group from the installed copy (the same `// look` groups, in the same places). Keep the project's imports (class merging, icons), file name, export names and aliases, and every deliberate change the `CLAUDE.md` list names.
3. **Prove it**, as in a rebuild: the check passes (deliberate changes excepted, by name), types, tests, build.
4. **Report what changed in behavior**, in the user's terms ("a long label now truncates instead of pushing the badge out"), not as a diff.

## Review (`/boilerplate review [name]`)

Read-only: change nothing, install nothing. For each component in the catalog (or the one named):

1. Find the project's version, as in a rebuild's inventory: its file or library, how many call sites, which props they use.
2. Compare its behavior with the reference's: what the boilerplate does that it doesn't (focus that returns, a phone layout, long content, nested use, keyboard, loading, shortcuts…), and anything it does that the boilerplate doesn't.
3. Judge the cost of a rebuild: call sites to touch, props without an equivalent, tests that query its DOM.

Report as one table, then a short note per component:

| Component | In the project | Call sites | Gains from a rebuild | Cost | Suggest |
| --- | --- | --- | --- | --- | --- |
| Dialog | `components/ui/dialog.tsx` (shadcn) | 14 | phone drawer, nested stack, cancelable close | 2 props without equivalent (`size`) | `/boilerplate refactor dialog` |
| Select | none | — | — | — | `/boilerplate add select` when one is needed |

Components that came from the boilerplate are listed with what `check.mjs` reports for them, and an `update` when the shipped file is newer.
