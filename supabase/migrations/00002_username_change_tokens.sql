create table if not exists public.username_change_tokens (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  new_username text not null,
  token text not null unique,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_username_change_tokens_user_id on public.username_change_tokens(user_id);
create index if not exists idx_username_change_tokens_token on public.username_change_tokens(token);
