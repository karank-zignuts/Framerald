# DESIGN_SYSTEM

> How Framerald looks and feels.

Status: **v1.0**, 2026-11-05

Source: **Cinematic Dark** (`https://better-design.com/design-systems/cinematic-dark`), installed as source from its shadcn registry. The only thing taken from **Beam Lib** (`https://better-design.com/design-systems/beam-lib`) is the rainbow border beam. The brand accent is **emerald**.

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

Don't edit the Cinematic Dark block in `globals.css`. It is a byte-for-byte copy of the registry's `globals.css`. Our additions sit below it.

| Token | Value | Use |
|---|---|---|
| `background` | `oklch(0.1417 0.0044 285.82)` | Page |
| `card` | `oklch(0.1763 0.0058 285.79)` | Panels |
| `foreground` / `primary` | white | Text, primary buttons |
| `muted-foreground` | `oklch(0.6255 0.0171 285.9)` | Secondary text |
| `border` | `oklch(0.2747 0.006 286)` | Hairlines |
| `accent` | `oklch(0.2734 0.0075 285.9)` | **DS hover surface**, not the brand color |
| `radius` | `0.75rem` | Base radius |

## 3. Brand accent: emerald

Cinematic Dark's `accent` is a hover surface, so the brand color has its own tokens: `bg-brand`, `text-brand`, `bg-brand-muted`, `text-brand-foreground`.

| Token | Value |
|---|---|
| `brand` | emerald-400 `oklch(0.765 0.177 163.223)` |
| `brand-strong` | emerald-500 `oklch(0.696 0.17 162.48)` (hover / pressed) |
| `brand-muted` | emerald-400 at 14% (tinted chips, selected states) |
| `brand-foreground` | the page background (dark text on emerald) |

Use emerald for: the one main action on a screen (Generate), the active nav item, progress of a running job, the logo. Never as a big fill or for decoration.

## 4. BorderBeam (the rainbow effect)

Use `BorderBeam` from `@/components/ui/border-beam`. It is Beam Lib's own thin wrapper around the `border-beam` package, so it renders the same. Copy Beam Lib's props exactly, per element:

| Wraps | Props |
|---|---|
| Button | `size="sm" colorVariant="colorful" theme="dark" className="inline-flex align-middle"` |
| Card / panel | `size="md" colorVariant="colorful" theme="dark" className="block"` |
| Single-line input | `size="line" colorVariant="colorful" theme="dark" className="block w-full"` |
| Textarea / prompt box | `size="md" colorVariant="colorful" theme="dark" className="block w-full"` |

Where it goes: the prompt box, and an element while a generation is running. At most **one beam visible at a time**. Never on lists, nav or every card.

## 5. Principles

1. **The work is the hero.** Images and video get the space; chrome stays quiet and dark.
2. **One bright thing per screen.** Emerald or the beam, not both fighting.
3. **Fast feedback.** Every generate click shows a running state at once.
4. **Honest states.** Queued, running, failed (with the reason), done.
5. **Accessible.** Color is never the only signal. Visible focus. Respect reduced motion.

## 6. Anti-patterns (AI slop)

Checked by `hallmark` and `impeccable` on every screen:
- gradients and glow other than the BorderBeam
- glassmorphism, blurred blobs, noise or grid backgrounds
- rows of identical stat cards, random badges, emoji as UI
- centered hero with three feature cards
- purple-to-blue gradients, sparkle icons for "AI"
- vague copy ("Unleash your creativity"). Say what the button does.
