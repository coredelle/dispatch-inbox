-- loads table
create table if not exists loads (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  status           text not null default 'needs_review'
                     check (status in ('needs_review', 'approved', 'rejected')),
  source_type      text not null check (source_type in ('email', 'pdf')),
  source_text      text,
  source_file_path text,
  extracted        jsonb,
  fields           jsonb,
  missing_fields   text[] not null default '{}',
  low_confidence_fields text[] not null default '{}',
  followup_draft   text,
  created_at       timestamptz not null default now(),
  approved_at      timestamptz
);

-- extraction_runs table
create table if not exists extraction_runs (
  id            uuid primary key default gen_random_uuid(),
  load_id       uuid not null references loads(id) on delete cascade,
  model         text not null,
  input_tokens  int not null default 0,
  output_tokens int not null default 0,
  latency_ms    int not null default 0,
  est_cost_usd  numeric(10, 6) not null default 0,
  stop_reason   text not null,
  error         text,
  created_at    timestamptz not null default now()
);

-- indexes
create index if not exists loads_user_id_idx on loads(user_id);
create index if not exists loads_status_idx  on loads(status);
create index if not exists extraction_runs_load_id_idx on extraction_runs(load_id);

-- row-level security
alter table loads           enable row level security;
alter table extraction_runs enable row level security;

-- loads: users see only their own rows
create policy "loads: owner access"
  on loads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- extraction_runs: visible if you own the parent load
create policy "runs: owner access"
  on extraction_runs for all
  using (
    exists (
      select 1 from loads
      where loads.id = extraction_runs.load_id
        and loads.user_id = auth.uid()
    )
  );

-- storage bucket policy: users can CRUD their own files
-- (bucket 'load-documents' must be created in the dashboard)
insert into storage.buckets (id, name, public)
values ('load-documents', 'load-documents', false)
on conflict (id) do nothing;

create policy "storage: owner upload"
  on storage.objects for insert
  with check (
    bucket_id = 'load-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "storage: owner read"
  on storage.objects for select
  using (
    bucket_id = 'load-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "storage: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'load-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
