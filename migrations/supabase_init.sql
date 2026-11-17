create table if not exists public.templates (
  id text primary key,
  name text not null,
  canvas_w integer not null,
  canvas_h integer not null,
  slots_json jsonb not null,
  overlay_key text not null,
  background text not null default '#ffffff',
  published boolean not null default false,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_templates_pub_sort on public.templates (published, sort);


alter table public.templates add column if not exists base_layer_key text;
alter table public.templates add column if not exists bleed integer not null default 0;
