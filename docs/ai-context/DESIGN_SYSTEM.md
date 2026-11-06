# DESIGN_SYSTEM

> How Framerald looks and feels.

Status: **v1.0**, 2026-11-05

Source: **Cinematic Dark** (`https://better-design.com/design-systems/cinematic-dark`), installed as source from its shadcn registry. The only thing taken from **Beam Lib** (`https://better-design.com/design-systems/beam-lib`) is the rainbow border beam. The brand accent is **Cool white `#E8F0FB`** (the owner's pick, after emerald, green and mint) on a **Void black** dark tone.

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

## 2. Tokens (the theme)

The theme is one block at the top of `globals.css`. It is the only place colours are chosen. Everything else, in CSS and in components, uses tokens: Tailwind classes such as `bg-card` and `text-muted-foreground`, or the variables below. `src/theme.test.ts` fails if a loose hex, `rgb()` or `oklch()` appears in app code, if two neighbouring dark steps get closer than 3 lightness points, or if text or the accent stop being readable on them.

### Void black, the dark ladder

Seven steps about 4 lightness points apart, so a surface is never the same dark as the one beneath it.

| Step | Value | Used for | Semantic token |
|---|---|---|---|
| `tone-0` | `#060607` | The page | `background` |
| `tone-1` | `#0F0F11` | Panels: sidebar, cards, tiles | `card` |
| `tone-2` | `#171719` | Floating: menus, popovers, the dock, dialogs | `popover` |
| `tone-3` | `#1F1F22` | Controls: inputs, chips | `secondary`, `input` |
| `tone-4` | `#27272B` | Raised fills, skeletons, selected rows | `muted` |
| `tone-5` | `#313136` | Hover surface | `accent` (the DS hover surface, not the brand) |
| `tone-6` | `#46464C` | Hairlines, at 70% | `border` |
| `tone-text` | near white | Text | `foreground` |
| `tone-text-muted` | `#A6A6AD` | Secondary text | `muted-foreground` |

States are washes laid over any surface, so a state always reads as one step up: `--wash-hover` 7%, `--wash-active` 12%, `--wash-selected` 16% of the text colour. Use `hover:bg-[var(--wash-hover)]` and `bg-[var(--wash-active)]`.

Other tokens: `radius` is `0.75rem` (the base). The destructive colour is a red kept out of the ladder. Shadows use `--shadow-ink`.

## 3. Brand accent: Cool white

Cinematic Dark's `accent` is a hover surface, so the brand colour has its own tokens: `bg-brand`, `text-brand`, `bg-brand-muted`, `text-brand-foreground`.

| Token | Value |
|---|---|
| `brand` | `accent-white`, `#E8F0FB`, `oklch(0.9523 0.0171 256.28)` |
| `brand-strong` | `accent-white-strong`, `#D1D8E2`, for hover and pressed |
| `brand-muted` | the brand at 14% (tinted chips, selected states) |
| `brand-foreground` | `tone-0`, the page colour (text on the brand, above 15:1) |

Use the brand colour for: the one main action on a screen (Generate), the active nav icon, the project tile, the star border and the edge highlights. Never as a big fill or for decoration. Because it is white, state can't rest on colour alone: active rows also get a wash.

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

## 3d. Motion and interaction details

- Tabs have one pill that follows the active tab (`src/components/sliding-tabs.tsx`, and the segmented control). It glides and resizes to the new tab in one spring, and its label colours fade with it. With reduced motion it just appears.
- The chip strip's arrows float over its ends and take no room, so nothing moves when they appear. The attach button is pinned and never scrolls.
- The dock has a faint flowing gradient (white, from the accent tokens) while it isn't focused. It fades out when you click into it and back when you leave. Its edge is lit slightly from the accent, a little more while focused.
- Cursors say what a control will do: pointing hand for ordinary controls (set in the base layer, so a utility can override it), a resize arrow for the sidebar edges and its toggle (`w-resize` to hide, `e-resize` to show).
- The project you are in is highlighted in the switcher and on the Projects page.
- Every glass surface has a faint accent-tinted edge.
- Generate has a star border: a 1px accent hairline ring, a 3px dark gap, and two bright glints travelling the ring, for as long as the button is enabled. It fades out when the button is disabled.
- The Look dropdown is a panel of style cards (icon tile, name, one line about what it adds, a check on the chosen one), a Clear action and an add-your-own form. The chip shows the chosen look's name.
- Attached references: Generate clears them with the prompt (the same switch). A click near the edge of a thumbnail opens it larger in a dialog; the circled X in its middle removes it.
- The top right shows the project's total spend (images, clips and chats), refreshed when something paid finishes. The Spend page has the all-projects total.
- Loading: a ripple (two rings growing and fading, `src/components/loading/ripple.tsx`) for anything that loads. `PageLoader` fills a page or panel, waits 200 ms before it appears so a quick load never flashes, then fades in. Small waits use `<Ripple />` inline. No skeleton cards and no placeholder boxes.
- First paint: a script in the page head copies the saved sidebar state onto `<html>` before the first frame, so a hidden sidebar never flashes open. Its animation is off until the page has hydrated.

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
