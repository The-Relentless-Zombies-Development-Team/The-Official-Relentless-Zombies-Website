# Framer Artifacts Audit — 4 Main HTML Pages

Audit date: 2026-06-16

Checks performed:
1. Lines containing "framer" (case-insensitive)
2. Lines containing "Made in Framer" or "Published"
3. `data-framer-` attributes
4. `__framer_` JavaScript references
5. `framerusercontent.com` references (OK if font src URLs)
6. `framer-variant` script
7. `<style data-framer-` blocks

---

## `index.html` (root)

**Verdict: NOT CLEAN**

Lines with non-font framer references:
| Line | Issue |
|------|-------|
| 127  | `framer.website` in `<meta property="og:url" content="https://relentlesszombies.framer.website/">` and canonical/alternate links |
| 142  | `framer.website` reference in body section (likely in hero-section inline styles or URLs) |

OK: Lines 103–123 are font `@font-face` src URLs from `framerusercontent.com` (acceptable).

---

## `updates.html` (root)

**Verdict: NOT CLEAN — heavily contaminated**

Lines with non-font framer references:
| Line | Issue |
|------|-------|
| 131  | `framer.website` in `<meta property="og:url" content="https://relentlesszombies.framer.website/updates">` and canonical/alternate links |
| 142  | Framer-generated class names throughout nav: `framer-1xjy48w-container`, `framer-mw4sn`, `framer-3hS73`, `framer-uQBff`, `framer-JCzHX`, `framer-jg69J`, `framer-K50fR`, `framer-194852r`, `framer-v-194852r`, `framer-1n0vyxx`, `framer-21h62h-container`, `framer-k2ptlb`, `framer-61ax1x`, `framer-text` |
| 143  | Framer class names: `framer-13n06v2`, `framer-text`, `framer-styles-preset-7uouqm` |
| 144  | Framer class names: `framer-13n06v2`, `framer-text`, `framer-styles-preset-7uouqm`, `framer-1metdh3`, `framer-styles-preset-ey6m83` |
| 145  | Framer class names: `framer-1gbry59`, `framer-text`, `framer-styles-preset-1hmoryp`, `framer-14o80ct`, `framer-styles-preset-1d5gab2`, `framer-qs44zn`, `framer-styles-preset-1tqcde0`, `framer-lepfcy`, `framer-styles-preset-aexbeb`, `framer-1pas4bb`, `framer-dautxi-container` |

OK: Lines 107–127 are font `@font-face` src URLs from `framerusercontent.com` (acceptable).

---

## `en/index.html`

**Verdict: CLEAN**

All framer references (lines 107–127) are only `@font-face` src URLs from `framerusercontent.com`. No framer class names, attributes, scripts, or domain references.

---

## `en/updates.html`

**Verdict: NOT CLEAN**

Lines with non-font framer references:
| Line | Issue |
|------|-------|
| 132  | `framer.website` in `<meta property="og:url" content="https://relentlesszombies.framer.website/en/updates">` and canonical/alternate links |

OK: Lines 109–129 are font `@font-face` src URLs from `framerusercontent.com` (acceptable).

---

## Summary

| File | Clean? | Non-font framer references |
|------|--------|---------------------------|
| `index.html` | ✗ | 2 lines — `framer.website` in meta + body |
| `updates.html` | ✗ | 5 lines — `framer.website` in meta + full framer nav classes |
| `en/index.html` | ✓ | 0 — only font CDN URLs |
| `en/updates.html` | ✗ | 1 line — `framer.website` in meta |

No `data-framer-` attributes, `__framer_` JS refs, `framer-variant` scripts, `<style data-framer-` blocks, or "Made in Framer"/"Published" text were found in any file.
