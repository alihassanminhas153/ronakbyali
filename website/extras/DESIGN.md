# Design System: Theme, Fonts & Styling

A clean, minimal and professional design system with a light and dark theme, one tall display font and one everyday body font. Both fonts are free and open-source, and are meant to be self-hosted in the project.

---

## 1. Fonts

| Role | Font | License | Use for |
|---|---|---|---|
| **Display (tall / condensed)** | **Barlow Condensed** (500, 600, 700) | SIL OFL | Hero headlines, section titles, big numbers, nav logo |
| **Body (normal)** | **Inter** (400, 500, 600) | SIL OFL | Paragraphs, buttons, forms, UI text |

Barlow Condensed gives the tall, narrow look while staying clean and professional. For something more dramatic and all-caps, swap in **Bebas Neue** (also OFL).

**Getting the files**
- Download from Google Fonts, or
- `npm i @fontsource/barlow-condensed @fontsource/inter`
- Use `.woff2` files only to keep things light.

**Suggested folder structure**
```
/public/fonts/
  BarlowCondensed-SemiBold.woff2
  BarlowCondensed-Bold.woff2
  Inter-Variable.woff2
```

**@font-face**
```css
@font-face {
  font-family: "Barlow Condensed";
  src: url("/fonts/BarlowCondensed-SemiBold.woff2") format("woff2");
  font-weight: 600; font-style: normal; font-display: swap;
}
@font-face {
  font-family: "Barlow Condensed";
  src: url("/fonts/BarlowCondensed-Bold.woff2") format("woff2");
  font-weight: 700; font-style: normal; font-display: swap;
}
@font-face {
  font-family: "Inter";
  src: url("/fonts/Inter-Variable.woff2") format("woff2");
  font-weight: 400 600; font-style: normal; font-display: swap;
}
```

---

## 2. Color Palette

One neutral scale plus a single accent keeps it minimal.

| Token | Light | Dark |
|---|---|---|
| Background | `#FAFAF9` | `#0B0D10` |
| Surface (cards) | `#FFFFFF` | `#14171C` |
| Surface alt (sections) | `#F3F4F6` | `#1B1F26` |
| Border | `#E5E7EB` | `#262B33` |
| Text primary | `#111827` | `#F1F3F5` |
| Text secondary | `#5B6472` | `#9AA3B0` |
| Accent | `#2F5BEA` | `#7C9BFF` |
| Accent hover | `#2448C4` | `#9DB4FF` |
| Text on accent | `#FFFFFF` | `#0B0D10` |
| Success | `#16A34A` | `#4ADE80` |
| Warning | `#D97706` | `#FBBF24` |
| Error | `#DC2626` | `#F87171` |

Text and accent colors meet WCAG AA contrast on their backgrounds in both themes.

---

## 3. CSS Variables (copy-paste)

```css
:root {
  --font-display: "Barlow Condensed", "Arial Narrow", sans-serif;
  --font-body: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;

  --bg: #FAFAF9;
  --surface: #FFFFFF;
  --surface-alt: #F3F4F6;
  --border: #E5E7EB;
  --text: #111827;
  --text-muted: #5B6472;
  --accent: #2F5BEA;
  --accent-hover: #2448C4;
  --on-accent: #FFFFFF;

  --success: #16A34A;
  --warning: #D97706;
  --error: #DC2626;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --shadow: 0 1px 2px rgba(16,24,40,.06), 0 4px 12px rgba(16,24,40,.06);
}

/* Auto dark mode from system preference */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0B0D10; --surface: #14171C; --surface-alt: #1B1F26;
    --border: #262B33; --text: #F1F3F5; --text-muted: #9AA3B0;
    --accent: #7C9BFF; --accent-hover: #9DB4FF; --on-accent: #0B0D10;
    --success: #4ADE80; --warning: #FBBF24; --error: #F87171;
    --shadow: 0 1px 2px rgba(0,0,0,.4), 0 4px 12px rgba(0,0,0,.35);
  }
}

/* Manual toggle: <html data-theme="dark"> */
:root[data-theme="dark"] {
  --bg: #0B0D10; --surface: #14171C; --surface-alt: #1B1F26;
  --border: #262B33; --text: #F1F3F5; --text-muted: #9AA3B0;
  --accent: #7C9BFF; --accent-hover: #9DB4FF; --on-accent: #0B0D10;
  --success: #4ADE80; --warning: #FBBF24; --error: #F87171;
  --shadow: 0 1px 2px rgba(0,0,0,.4), 0 4px 12px rgba(0,0,0,.35);
}
```

---

## 4. Typography Scale

```css
body {
  font-family: var(--font-body);
  font-size: 1rem;          /* 16px */
  line-height: 1.65;
  color: var(--text);
  background: var(--bg);
}

h1, h2, h3, .display {
  font-family: var(--font-display);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: 0.01em;
  text-transform: uppercase;   /* optional: strong tall look */
}

h1 { font-size: clamp(3rem, 8vw, 6rem); }
h2 { font-size: clamp(2rem, 4vw, 3.25rem); }
h3 { font-size: 1.75rem; font-weight: 600; }
h4, h5 { font-family: var(--font-body); font-weight: 600; }
small, .caption { font-size: .875rem; color: var(--text-muted); }
```

**Tip:** use the tall font sparingly (hero, section titles, stats, logo). Everything else stays in Inter so the page feels calm, not loud.

---

## 5. Styling Patterns

### Spacing and layout
- 8px grid: 8, 16, 24, 32, 48, 64, 96.
- Section padding: 96px vertical on desktop, 64px on mobile.
- Max content width 1200px, centered, 12-column grid, plenty of white space.

### Buttons
```css
.btn {
  font: 500 .95rem var(--font-body);
  padding: .75rem 1.5rem;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  transition: background .2s, transform .2s;
}
.btn-primary { background: var(--accent); color: var(--on-accent); }
.btn-primary:hover { background: var(--accent-hover); transform: translateY(-1px); }
.btn-ghost { border-color: var(--border); color: var(--text); background: transparent; }
.btn-ghost:hover { background: var(--surface-alt); }
```

### Cards
```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 24px;
  transition: box-shadow .2s, transform .2s;
}
.card:hover { box-shadow: var(--shadow); }
```

### Links
Accent color, no underline by default, underline on hover.

### Inputs
```css
input, textarea, select {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: .65rem .9rem;
}
input:focus, textarea:focus, select:focus {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
```

### Motion
Subtle only: 150-250ms ease transitions, fades and small lifts. Respect reduced motion:
```css
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}
```

### Imagery and icons
- Thin-line icons (Lucide or Phosphor, both free).
- Rounded corners on images, no heavy gradients.
- For a touch of color, use a very soft accent tint as a section background:
  `background: color-mix(in srgb, var(--accent) 8%, transparent);`

---

## 6. Theme Toggle (JS)

```js
const root = document.documentElement;
const saved = localStorage.getItem("theme");
if (saved) root.dataset.theme = saved;

function toggleTheme() {
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  localStorage.setItem("theme", next);
}
```

---

## 7. Quick Rules Checklist

- [ ] Barlow Condensed only for headings, logo and big numbers.
- [ ] Inter for everything else.
- [ ] One accent color, used for buttons, links and focus states only.
- [ ] Always use CSS variables, never hard-coded colors.
- [ ] Test every page in both light and dark themes.
- [ ] Keep generous spacing and minimal shadows.