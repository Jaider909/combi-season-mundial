drop policy if exists "Public predictions delete" on public.predictions;

create policy "Public predictions delete"
on public.predictions
for delete
to anon, authenticated
using (true);
