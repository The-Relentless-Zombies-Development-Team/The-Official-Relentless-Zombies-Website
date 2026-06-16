# Official Relentless Zombies Website

The official website for the [Relentless Zombies](https://www.roblox.com/games/84589007827805/) Roblox game.

Built with Supabase (Auth, Database, Edge Functions) + Resend (email).

## Features

- **Authentication** — Sign up, log in, password reset
- **User dropdown** — Click username in nav, theme toggle (light/dark), manage account
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
