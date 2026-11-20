# Theme Variables

Defined in `index.css`. Dark mode switches with `<html class="dark">` or `<html data-theme="dark">`; every variable below changes automatically.

## Colors (theme-aware)

| Variable | Tailwind utility | Explanation |
|---|---|---|
| `--bg` | `bg-bg` | Main page background. |
| `--surface` | `bg-surface` | Cards, modals, dropdowns, inputs and other raised elements. |
| `--surface-alt` | `bg-surface-alt` | Alternate section background and hover fill for ghost buttons. |
| `--border` | `border-border` | Borders, dividers and input outlines. |
| `--text` | `text-text` | Primary text color. |
| `--text-muted` | `text-muted` | Secondary text: captions, helper text, placeholders. |
| `--accent` | `bg-accent`, `text-accent` | Brand color for primary buttons, links, focus rings. |
| `--tone-hue-1` to `--tone-hue-8` | — | Hue rotations shared by app icons and the matching chart color tones. |
| `--accent-tone-1` to `--accent-tone-8` | `text-accent-tone-*`, `bg-accent-tone-*` | The matching theme colors used across charts, badges and icon labels. |
| `--accent-hover` | `hover:bg-accent-hover` | Accent on hover or pressed state. |
| `--on-accent` | `text-on-accent` | Text or icon color on top of the accent color. |
| `--success` | `text-success`, `bg-success` | Positive states: confirmations, in stock. |
| `--warning` | `text-warning`, `bg-warning` | Caution states: low stock, pending. |
| `--error` | `text-error`, `bg-error` | Errors, destructive actions, out of stock. |
| `--shadow` | `shadow-soft` | Soft elevation shadow for hovered cards and floating elements. |
| `--card-shadow` | `var(--card-shadow)` | Shadow color used by the coming-soon page. |

## Legacy names (coming-soon page)

These only point at the variables above, so the page keeps working and follows the theme.

| Variable / utility | Points to |
|---|---|
| `--page` / `bg-page` | `--bg` |
| `--glow` / `bg-glow` | `--surface` |
| `--field` / `bg-field` | `--surface` |
| `--ink` / `text-ink` | `--text` |
| `--line` / `border-line` | `--border` |
| `--sage` / `bg-sage` | `--accent` |
| `--sage-deep` / `bg-sage-deep` | `--accent-hover` |
| `--sage-wash` / `bg-sage-wash` | soft 12% tint of `--accent` over `--bg` |
| `--btn` / `bg-btn` | `--text` (inverts in dark mode) |
| `--btn-ink` / `text-btn-ink` | `--bg` |
| `--btn-hover` / `hover:bg-btn-hover` | `--text` mixed 15% toward `--bg` |

## Fonts (fixed)

| Variable | Tailwind utility | Explanation |
|---|---|---|
| `--font-display` | `font-display` | Barlow Condensed: tall font for headings, hero text, logo and big numbers. |
| `--font-body` / `--font-sans` | `font-body`, `font-sans` | Inter: body text, buttons, forms and UI. |
| `--font-serif` | `font-serif` | Cormorant Garamond: elegant accent text. |
| `--font-antonio` | `font-antonio` | Antonio: the previous tall font of the coming-soon page. |

## Radius (fixed)

| Variable | Tailwind utility | Explanation |
|---|---|---|
| `--radius-sm` | `rounded-sm` | 6px: buttons and inputs. |
| `--radius-md` | `rounded-md` | 10px: cards. |
| `--radius-lg` | `rounded-lg` | 16px: modals, panels, images. |

## Animations (fixed)

| Variable | Tailwind utility | Explanation |
|---|---|---|
| `--animate-fade` | `animate-fade` | Gentle 1.2s fade-in. |
| `--animate-jelly-drop` | `animate-jelly-drop` | Element drops from the top and wobbles like jelly on landing (2.1s). |
| `--animate-ground-pulse` | `animate-ground-pulse` | Ground shadow that pulses in sync with the jelly drop (2.1s). |