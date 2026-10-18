-- Private demo sandboxes: each visitor is an anonymous user whose rows are
-- deleted after 24 hours. Keep the cost log and usage counts when that happens.

-- Cost log outlives the load it describes (stats on the About page)
alter table extraction_runs alter column load_id drop not null;
alter table extraction_runs drop constraint if exists extraction_runs_load_id_fkey;
alter table extraction_runs
  add constraint extraction_runs_load_id_fkey
  foreign key (load_id) references loads(id) on delete set null;

-- Seeded sample loads copy their runs into every sandbox; stats skip those copies
alter table extraction_runs add column if not exists is_seed boolean not null default false;
-- Seed runs were inserted with the same timestamp as their load; real runs finish after it
update extraction_runs r
  set is_seed = true
  from loads l
  where r.load_id = l.id and r.created_at = l.created_at;

-- Usage events outlive the user, so the daily spending cap still counts them
alter table usage_events alter column user_id drop not null;
alter table usage_events drop constraint if exists usage_events_user_id_fkey;
alter table usage_events
  add constraint usage_events_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;
create index if not exists usage_events_created_idx on usage_events(created_at);
