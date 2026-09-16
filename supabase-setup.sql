-- Run this once in your Supabase project's SQL editor (Project > SQL Editor > New query)

create table if not exists jfs_workspace_records (
  id text primary key,
  table_name text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jfs_workspace_records_table_name_idx on jfs_workspace_records (table_name);
create index if not exists jfs_workspace_records_updated_at_idx on jfs_workspace_records (updated_at desc);

-- Row Level Security: app uses the anon key directly from the browser (password-gated in-app),
-- so we open read/write to anon. Since this is a single small internal tool, this is the
-- simplest safe-enough setup. Do not reuse this anon key for a public-facing product.
alter table jfs_workspace_records enable row level security;

drop policy if exists "jfs_anon_all" on jfs_workspace_records;
create policy "jfs_anon_all" on jfs_workspace_records
  for all
  to anon
  using (true)
  with check (true);
