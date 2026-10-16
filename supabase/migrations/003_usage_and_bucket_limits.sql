-- One row per Claude-backed request, for per-user rate limiting.
-- Kept separate from loads so deleting loads (or a demo reset) doesn't reset the count.
create table if not exists usage_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('extract', 'followup')),
  created_at timestamptz not null default now()
);

create index if not exists usage_events_user_created_idx on usage_events(user_id, created_at);

alter table usage_events enable row level security;

-- Users can record and count their own usage, but never update or delete it
create policy "usage: owner insert"
  on usage_events for insert
  with check (auth.uid() = user_id);

create policy "usage: owner read"
  on usage_events for select
  using (auth.uid() = user_id);

-- Storage: only PDFs, 10 MB max
update storage.buckets
  set file_size_limit = 10485760,
      allowed_mime_types = array['application/pdf']
  where id = 'load-documents';
