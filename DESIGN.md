# DESIGN.md — Fleet Telematics RRD Sim

Color system agreed by web and mobile. Use these tokens instead of hardcoding hex values in components, so both platforms stay visually in sync.

## Philosophy

- **Dark mode** is primary/default: black base with green accents — matches an ops/monitoring tool feel (dashboards, alerts, telemetry).
- **Light mode**: white base, same green accent, darkened slightly for contrast on white.
- Status colors (safe / caution / not recommended) stay consistent across both modes — only backgrounds and neutrals shift.

---

## 🌙 Dark Mode

| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#0D0D0D` | App background |
| `bg-surface` | `#1A1A1A` | Cards, panels, table rows |
| `bg-surface-alt` | `#242424` | Hover / alt row |
| `border` | `#2E2E2E` | Dividers, table borders |
| `text-primary` | `#FFFFFF` | Headings, primary text |
| `text-secondary` | `#B3B3B3` | Body/secondary text |
| `text-muted` | `#7A7A7A` | Captions, disabled text |
| `accent-primary` | `#2ECC71` | Primary green — buttons, links, active states |
| `accent-primary-hover` | `#27AE60` | Hover/pressed state |
| `accent-primary-subtle` | `#1B3A2A` | Green-tinted backgrounds (badges, highlights) |

## ☀️ Light Mode

| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#FFFFFF` | App background |
| `bg-surface` | `#F5F5F5` | Cards, panels, table rows |
| `bg-surface-alt` | `#EBEBEB` | Hover / alt row |
| `border` | `#DDDDDD` | Dividers, table borders |
| `text-primary` | `#121212` | Headings, primary text |
| `text-secondary` | `#4A4A4A` | Body/secondary text |
| `text-muted` | `#8A8A8A` | Captions, disabled text |
| `accent-primary` | `#1B873F` | Primary green (darkened for contrast on white) |
| `accent-primary-hover` | `#156C33` | Hover/pressed state |
| `accent-primary-subtle` | `#E3F5E9` | Green-tinted backgrounds (badges, highlights) |

---

## 🚦 Status Colors (Route-Risk Classification)

Same values in both modes — these carry meaning and must not shift with theme.

| State | Hex | Usage |
|---|---|---|
| Safe | `#2ECC71` | Route-risk: safe |
| Caution | `#F1C40F` | Route-risk: caution |
| Not Recommended | `#E74C3C` | Route-risk: not recommended |
| Info | `#3498DB` | Neutral alerts / info banners |

---

## Usage Notes

- Never hardcode hex values directly in components — reference the token names above (e.g. `accent-primary`, not `#2ECC71`) so a future palette tweak only touches one place.
- `accent-primary-subtle` is for backgrounds behind badges/pills/tags, not for large surfaces.
- Status colors are theme-independent by design — a "not recommended" flag should look the same in light or dark mode for quick scanning.
- Mobile and web should implement these as design tokens (e.g. CSS variables / a shared theme object) rather than duplicating hex codes per platform.
