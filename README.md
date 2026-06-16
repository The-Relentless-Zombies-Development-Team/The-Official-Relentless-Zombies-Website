# Official Relentless Zombies Website

The official website for the [Relentless Zombies](https://www.roblox.com/games/84589007827805/) Roblox game.

Built with Supabase (Auth, Database, Edge Functions) + Resend (email).  
Frontend: Framer-generated HTML/CSS, customized with vanilla JS.

## Features

- **Authentication** — Sign up, log in, password reset, sign out
- **Account management** — Profile & Security tabs: change password, MFA/2FA (TOTP via authenticator app), username change (email confirmation, 2-week cooldown)
- **Email** — Unlimited via Resend Broadcasts (signup confirmation, password reset, email change, verification codes, username change confirmation)
- **Fan Art** — Gallery with community-submitted artwork stored in Supabase Storage
- **Updates** — Game update changelog

## Stack

| Layer | Technology |
|---|---|
| Hosting | GitHub Pages + Cloudflare DNS (`officialrelentlesszombies.dpdns.org`) |
| Auth | Supabase Auth (custom SMTP via Resend) |
| Database | Supabase PostgreSQL (Fan Art, username change tokens) |
| Storage | Supabase Storage (fan art images) |
| Email | Resend Broadcasts (unlimited free tier) |
| MFA/2FA | Supabase Auth TOTP (authenticator app) |

## Architecture

- All pages are Framer-generated static HTML with `css/site.css` (73KB single-line framer styling extracted from Framer export).
- Auth scripts (`js/auth.js`, `js/account.js`, `js/supabase-init.js`) are injected into `<body>` via `bodyStart` placeholders.
- Navbar uses `position:fixed` (injected via `auth.js` CSS): targets the first `<div>` child of `[data-framer-root]`, applies `width:1200px;height:64px;top:0;left:50%;transform:translateX(-50%)`. Root gets `padding-top:64px` so content clears the fixed nav.
- Updates page's nav container (`framer-1xjy48w-container`) has **no CSS rules** in `site.css` — explicit dimensions are provided by the injected CSS.
- Two locale variants: `/index.html` (non-en) and `/en/index.html` (English). Both have identical framer content (title, description, gameplay trailer video placeholder, CTA boxes) maintained manually.

## Pages

| Path | Description |
|---|---|
| `/index.html`, `/en/index.html` | Home — nav, title "RELENTLESS ZOMBIES", gameplay trailer placeholder, CTA boxes (Fan Art, Tester) |
| `/updates.html`, `/en/updates.html` | Game update changelog |
| `/fanart.html` | Community fan art gallery |
| `/login.html`, `/en/login.html` | Sign in (redirects to 2FA if enrolled) |
| `/login/signup.html` | Sign up |
| `/login/2fa.html` | TOTP challenge after login |
| `/login/change-username.html` | Username change confirmation link handler |
| `/account.html`, `/en/account.html` | Profile + Security tab management |

## Development

The site is fully static (no build step). Edit HTML/CSS/JS directly and push to `main` — GitHub Pages auto-deploys.

### Key scripts

- `js/supabase-init.js` — initializes Supabase client
- `js/auth.js` — sign in/up/out, session handling, nav auth state, navbar fixed CSS injection, login-page MFA redirect
- `js/account.js` — username change, password change, MFA enroll/verify/disable, status refresh
- `js/fanart.js` — fan art upload and gallery
- `js/2fa.js` — TOTP verification on challenge page

### Navbar maintenance

When editing nav links, update **all 6 pages**: `index.html`, `en/index.html`, `updates.html`, `en/updates.html`, `fanart.html`, `account.html`.  
The nav uses home-page framer classes (`framer-SJqHS`, `framer-4jap0m`, `framer-fqrpvg`) which exist in `site.css` — avoid using page-specific nav classes (e.g. `framer-awE7j`, `framer-1xjy48w-container` children).

### Deployment

Push to `main` → GitHub Actions deploys to GitHub Pages.  
Cloudflare proxying caches assets — hard refresh (Cmd+Shift+R) may be needed to see changes.

## Relevant Files

- `js/auth.js` — injected CSS for navbar fixed positioning + sign-out size
- `js/account.js` — MFA status/enroll/disable, QR code fallback, visibilitychange listener
- `index.html`, `updates.html`, `en/index.html`, `en/updates.html` — nav structures per page
- `css/site.css` — framer-generated styling (73KB, single line)
