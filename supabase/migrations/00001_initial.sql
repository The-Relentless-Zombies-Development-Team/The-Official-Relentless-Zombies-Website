create table public.fanart (
  id         bigint generated always as identity primary key,
  created_at timestamptz default now(),
  user_id    uuid references auth.users not null default auth.uid(),
  image_url  text not null,
  caption    text,
  approved   boolean default false
);

alter table public.fanart enable row level security;

create policy "public_select_approved" on public.fanart
  for select using (approved = true);

create policy "user_select_own" on public.fanart
  for select using (auth.uid() = user_id);

create policy "user_insert_own" on public.fanart
  for insert with check (auth.uid() = user_id);

-- Create a storage bucket for fanart images
insert into storage.buckets (id, name, public) values ('fanart', 'fanart', true);

create policy "public_select_fanart" on storage.objects
  for select using (bucket_id = 'fanart');

create policy "authenticated_insert_fanart" on storage.objects
  for insert with check (bucket_id = 'fanart' and auth.role() = 'authenticated');
