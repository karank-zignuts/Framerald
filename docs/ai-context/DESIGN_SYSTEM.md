# DESIGN_SYSTEM

> How Framerald looks and feels.

Status: **v1.0**, 2026-11-05

Source: **Cinematic Dark** (`https://better-design.com/design-systems/cinematic-dark`), installed as source from its shadcn registry. The only thing taken from **Beam Lib** (`https://better-design.com/design-systems/beam-lib`) is the rainbow border beam. The brand accent is **green `#7ad950`** (the owner's pick; it started as emerald).

---

## 1. Stack

| Layer | Choice |
|---|---|
| Components | Cinematic Dark registry, code in `src/components/ui/`, owned by us |
| Primitives | Radix (what the registry ships) |
| Styling | Tailwind CSS 4 with the CSS-variable tokens in `src/app/globals.css` |
| Motion | `motion` + the DS easing tokens (`--ease-out`, `duration-fast/base/slow`) |
| Icons | Solar via `@iconify/react` (DS default). `lucide-react` only where a DS component already uses it |
| Font | Geist Sans / Geist Mono |

Add a missing component from the same registry, never from another kit:

```bash
npx shadcn@4.23.0 add https://better-design.com/registry/cinematic-dark/<name>.json
```

The full list is in `https://better-design.com/registry/cinematic-dark/all.json`. We installed a core set in Phase 0 and add more as screens need them.

## 2. Tokens

The surface tokens in `globals.css` started as Cinematic Dark and were retuned on 2026-11-05 to the zinc steps below, so panels, menus and chips read as separate layers instead of one flat dark. Our additions sit around it: a Hallmark stamp and waivers on top, the brand tokens and the page-level rules (overflow clip, themed scrollbar, reduced-motion pulse) below.

| Token | Value | Use |
|---|---|---|
| `background` | `#131316`, `oklch(0.1881 0.006 285.81)` | Page. Zinc, not pure black |
| `card` | `#18181B` (zinc-900) | Sidebar, panels |
| `popover` | `#1F1F23` | Composer, menus, dialogs |
| `secondary` / `muted` | `#27272A` (zinc-800) | Chips, inputs, placeholders |
| `accent` | `#323236` | **Hover surface**, not the brand color |
| `border` | `#3F3F46` (zinc-700) at 70% | Hairlines you can see |
| `foreground` / `primary` | white | Text, primary buttons |
| `muted-foreground` | `#A1A1AA` (zinc-400) | Secondary text (passes AA on every surface above) |
| `radius` | `0.75rem` | Base radius |

## 3. Brand accent: green #7ad950

Cinematic Dark's `accent` is a hover surface, so the brand color has its own tokens: `bg-brand`, `text-brand`, `bg-brand-muted`, `text-brand-foreground`.

| Token | Value |
|---|---|
| `brand` | `#7ad950`, which is `oklch(0.7985 0.1953 137.46)` |
| `brand-strong` | `oklch(0.73 0.18 137.46)`, a step darker (hover / pressed) |
| `brand-muted` | the brand at 14% (tinted chips, selected states) |
| `brand-foreground` | the page background (dark text on the brand, about 14:1 contrast) |

Use the brand color for: the one main action on a screen (Generate), the active nav item, progress of a running job, the logo. Never as a big fill or for decoration.

## 3b. Spacing

One 4 px scale, with these fixed places for each size. Use them instead of picking a number each time.

| Where | Size | Class |
|---|---|---|
| Page gutter (every page, the header bar and the Image dock's sides) | 20 px | `p-5`, `px-5` |
| Between a page's sections | 20 px (40 px between repeated blocks such as batches or clips) | `gap-5`, `gap-10` |
| Between tiles and cards in a grid (Library, Projects, results) | 16 px | `gap-4` (masonry: `columnGap: 1rem`, `mb-4`) |
| Fields in a form, and a label to its field | 12 px, 8 px | `gap-3`, `gap-2` |
| A row of controls or chips | 8 px | `gap-2` |
| Floating panel with a header (media picker, model list) | header and body 16 px | `px-4 py-3`, `p-4` |
| List menus and popovers (switcher, aspect, quality, three-dot menus) | 8 px around, rows `px-2`, so their content lines up with a 16 px header | `p-2`, `px-2` |
| Icon to text in a row | 12 px (8 px in a compact button) | `gap-3`, `gap-2` |
| Sidebar | 8 px inset, items `px-3`, 4 px between items | `p-2`, `gap-1` |
| Floating radius | panels and tiles `rounded-2xl`; controls `rounded-lg` | |

## 3c. Glass

The app is frosted glass over a quiet zinc page. Three weights in `globals.css`, chosen by what the surface does:

| Class | Use | Fill and blur |
|---|---|---|
| `.glass` | Panels on the page: sidebar, cards, tiles, empty states | 62% of `card`, blur 24 px |
| `.glass-strong` | Anything that floats over content: menus, popovers, selects, dialogs, the dock | 84% of `popover`, blur 28 px |
| `.glass-chip` | Small controls: chips, icon buttons, the balance | 6% white wash, blur 14 px |

Every glass surface has a 1 px hairline (`--glass-border`), a 1 px top highlight and a soft shadow. Rules that keep data readable:

- Text colours never change on glass. `foreground` and `muted-foreground` stay above 4.5:1 on all three weights (the accessibility scan covers every screen).
- Floating glass is the most opaque, so a menu over a busy grid is still readable.
- Never put a CSS `filter` or `opacity` below 1 on an ancestor of glass: it hides the page from `backdrop-filter`. Entrances end in `filter: none`.
- Without `backdrop-filter` support each class falls back to its solid token.
- Behind everything: the neutral `.ambient` light and the faint magnetic-filings layer. No accent colour in the background.
- Floating glass fades in from a 10 px blur and out to an 8 px blur. Pages fade in from a blur. Nothing cuts.

The sidebar is a full-height glass panel flush with the top, left and bottom of the screen. It hides completely (button in the header, Ctrl or Cmd + B, or a click on its right edge, which glows with the accent on hover). While hidden, the whole left edge of the screen is one strip that glows top to bottom and brings it back on click.

## 4. BorderBeam (not used)

The rainbow border beam is **off everywhere**: the owner removed it from the prompt fields (2026-11-05). `@/components/ui/border-beam` stays in the repo, unused. Do not add it back without asking. Running jobs show progress with the brand color instead.

## 5. Principles

1. **The work is the hero.** Images and video get the space; chrome stays quiet and dark.
2. **One bright thing per screen.** The brand color or the beam, not both fighting.
3. **Fast feedback.** Every generate click shows a running state at once.
4. **Honest states.** Queued, running, failed (with the reason), done.
5. **Accessible.** Color is never the only signal. Visible focus. Respect reduced motion.

## 6. Anti-patterns (AI slop)

Checked by `hallmark` and `impeccable` on every screen:
- gradients and glow
- glassmorphism, blurred blobs, noise or grid backgrounds
- rows of identical stat cards, random badges, emoji as UI
- centered hero with three feature cards
- purple-to-blue gradients, sparkle icons for "AI"
- vague copy ("Unleash your creativity"). Say what the button does.

## 7. Known findings from the Hallmark linter (app scope)

- Zero-chroma neutrals and pure white primary come from Cinematic Dark itself. Waived on record in the stamp.
- One FAIL in the design system's own CSS: its `[aria-invalid]` rule uses border colour for the invalid state. Phase 1 has no invalid fields. Revisit when forms with validation arrive.
