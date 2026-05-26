# Snagged brand kit

Drop-in design system matching Snagged.com / SnaggedReviews — plain CSS, no build step.
Copy this whole folder into a project (e.g. into the web root / `public/`) and you get the
same palette, fonts, sticker buttons, cards, and pills.

## Contents
- `snagged-brand.css` — tokens (`:root` CSS variables) + base styles + components.
- `fonts/` — self-hosted **Gasoek One** (display) and **Bricolage Grotesque** (body) woff2.
- `assets/` — brand marks and mascots:
  - `logomark.svg`, `logomark-round.svg`, `logomark-square.svg`, `favicon-32.png`
  - `wordmark-white.png`
  - `mascot-hero.png`, `mascot-negotiation.png`, `mascot-closing.png`, `sticker-fresh.png`

## Use
```html
<link rel="icon" href="/assets/favicon-32.png" />
<link rel="stylesheet" href="/snagged-brand.css" />
```
Keep `fonts/` next to `snagged-brand.css` (the `@font-face` paths are relative: `./fonts/...`).
If you place the CSS elsewhere, update those two `url()` paths.

### Components
```html
<!-- wordmark -->
<div class="wordmark"><img class="brand-mark" src="/assets/logomark-round.svg" alt=""><span class="wm-a">Snagged</span> <span class="wm-b">Section</span></div>

<!-- buttons -->
<button class="btn btn--primary">Primary</button>
<button class="btn btn--navy">Navy</button>
<button class="btn btn--ghost">Ghost</button>

<!-- field, card, pill, chip -->
<input class="field" placeholder="example.com" />
<div class="card">…</div>
<span class="eyebrow">Verified</span>
<button class="chip" aria-pressed="true">Filter</button>
```

## Tokens (most-used)
| Variable | Value | Use |
|---|---|---|
| `--cream` | `#f4eee1` | page background |
| `--cream-2` | `#fbf7ec` | cards / surfaces |
| `--navy` | `#254254` | primary ink + headings |
| `--coral` / `--coral-deep` | `#e48069` / `#c75f45` | primary accent |
| `--teal-deep` | `#25749c` | links |
| `--line` | `#e4dac6` | hairlines / borders |
| `--radius` / `--radius-sm` | `20px` / `14px` | corners |
| `--display` | Gasoek One | headings only |
| `--body` | Bricolage Grotesque | everything else |

Headings use Gasoek One at `font-weight: 400` (it's already heavy). Buttons are the
"sticker" style: a 2px border plus an offset drop-shadow that lifts on hover.
