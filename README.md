# Official Relentless Zombies Website

The official website for the [Relentless Zombies](https://www.roblox.com/games/84589007827805/) Roblox game.

Built with Supabase (Auth, Database, Edge Functions) + Resend (email).  
Frontend: Framer-generated HTML/CSS, customized with vanilla JS.

## Features

- **Authentication** — Sign up, log in, password reset, sign out
- **Account management** — Profile & Security tabs: change password, MFA/2FA (TOTP via authenticator app), username change (email confirmation, 2-week cooldown), **delete account (MFA or email OTP verification)**
- **Email** — Unlimited via Resend Broadcasts (signup confirmation, password reset, email change, verification codes, username change confirmation, account deletion codes)
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
- 2FA logic is inline in `en/login/2fa.html` and `login/2fa.html` (no separate `js/2fa.js` file)

### Navbar maintenance

When editing nav links, update **all 6 pages**: `index.html`, `en/index.html`, `updates.html`, `en/updates.html`, `fanart.html`, `account.html`.  
The nav uses home-page framer classes (`framer-SJqHS`, `framer-4jap0m`, `framer-fqrpvg`) which exist in `site.css` — avoid using page-specific nav classes (e.g. `framer-awE7j`, `framer-1xjy48w-container` children).

### Client-side cooldown

Username change cooldown is now 7 days (reduced from 14). The cooldown is enforced both client-side (via `user_metadata.last_username_change_at`) and server-side (via `send-username-change` Edge Function). Ensure both are in sync.

### Deployment

Push to `main` → GitHub Actions deploys to GitHub Pages.  
Cloudflare proxying caches assets — hard refresh (Cmd+Shift+R) may be needed to see changes.

### Environment variables

Required Supabase Edge Function environment vars (set in Supabase Dashboard → Functions → Secrets):

- `RESEND_API_KEY` — Resend API key for email broadcasts
- `RESEND_AUDIENCE_ID` — Resend audience ID for contact management
- `RESEND_BROADCAST_ID` — Resend broadcast ID for email templates
- `SEND_EMAIL_HOOK_SECRET` — Webhook secret for Supabase Auth email hooks (required; function will return 500 if unset)
- `SUPABASE_URL` — Supabase project URL (e.g. `https://qyoortkrlfxzuzjxwfge.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key for admin operations (required for delete-account Edge Function)

### Delete Account

Account deletion requires identity verification:

- **If MFA/2FA is enrolled**: Verify with a 6-digit authenticator code, then the account is deleted.
- **If MFA/2FA is not enrolled**: A 6-digit verification code is sent to the user's email via Resend. Enter the code to verify, then the account is deleted.

Edge Functions:
- `send-email` — Sends authentication and transactional emails via Resend
- `send-username-change` — Sends username change confirmation emails via Resend
- `send-delete-code` — Sends account deletion verification codes via Resend
- `delete-account` — Deletes the authenticated user's account (requires service role)

## Relevant Files

- `js/auth.js` — injected CSS for navbar fixed positioning + sign-out size
- `js/account.js` — MFA status/enroll/disable, QR code fallback, visibilitychange listener, **account deletion with MFA or email OTP verification**
- `index.html`, `updates.html`, `en/index.html`, `en/updates.html` — nav structures per page
- `css/site.css` — framer-generated styling (73KB, single line)
- `supabase/migrations/` — SQL migrations (00001–00004)
