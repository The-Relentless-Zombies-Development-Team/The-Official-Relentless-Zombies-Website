-- Enable RLS (already enabled by default, but be explicit)
alter table public.username_change_tokens enable row level security;

-- Allow users to read their own tokens
create policy "Users can read their own tokens"
  on public.username_change_tokens
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Allow users to update their own tokens (e.g., mark as used)
create policy "Users can update their own tokens"
  on public.username_change_tokens
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow the Edge Function (via service_role) to insert tokens
create policy "Service role can insert tokens"
  on public.username_change_tokens
  for insert
  to service_role
  with check (true);
