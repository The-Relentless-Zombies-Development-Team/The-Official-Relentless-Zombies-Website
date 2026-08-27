-- Update fanart bucket with file size limits and allowed MIME types
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
where id = 'fanart';

-- Replace insert policy with folder-scoped check: users can only upload to their own folder
drop policy if exists "authenticated_insert_fanart" on storage.objects;
create policy "authenticated_insert_fanart" on storage.objects
  for insert
  to authenticated
  using (bucket_id = 'fanart' and (storage.foldername(name))[1] = auth.uid()::text);