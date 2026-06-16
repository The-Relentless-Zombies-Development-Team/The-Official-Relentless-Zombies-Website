# Official Relentless Zombies Website

The official website for the [Relentless Zombies](https://www.roblox.com/games/84589007827805/) Roblox game.

Built with Framer + Supabase (Auth, Database, Edge Functions) + Resend (email).

## Features

- **Authentication** — Sign up, log in, password reset, magic link
- **User dropdown** — Click username in nav, theme toggle (light/dark), manage account
- **Account management** — Profile & Security tabs: change password, MFA/2FA (TOTP via authenticator app), username change (email confirmation, 2-week cooldown)
- **Email** — Unlimited via Resend Broadcasts (signup confirmation, password reset, email change, verification codes, username change confirmation)
- **Fan Art** — Gallery with community-submitted artwork stored in Supabase Storage
- **Updates** — Game update changelog

## Stack

| Layer | Technology |
|---|---|
| Hosting | GitHub Pages + Cloudflare DNS (`officialrelentlesszombies.dpdns.org`) |
| Framework | Framer (static export) |
| Auth | Supabase Auth (custom SMTP via Resend) |
| Database | Supabase PostgreSQL (Fan Art, username change tokens) |
| Storage | Supabase Storage (fan art images) |
| Email | Resend Broadcasts (unlimited free tier) |
| MFA/2FA | Supabase Auth TOTP (authenticator app) |

## Deployment

Push to `main` → auto-deploys to GitHub Pages.
Custom domain: `officialrelentlesszombies.dpdns.org` (proxied through Cloudflare).

## Development

```bash
# Install Supabase CLI
npm install -g supabase

# Link to project
supabase link

# Deploy Edge Functions
supabase functions deploy send-email
supabase functions deploy send-username-change

# Push migrations
supabase db push

# Set secrets
supabase secrets set RESEND_API_KEY=<key>
supabase secrets set RESEND_AUDIENCE_ID=<id>
supabase secrets set RESEND_BROADCAST_ID=<id>
supabase secrets set SITE_URL=https://officialrelentlesszombies.dpdns.org
```
