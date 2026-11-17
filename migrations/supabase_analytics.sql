-- Analytics/events and template fields for dashboard tracking
alter table public.templates add column if not exists is_active boolean not null default false;
alter table public.templates add column if not exists usage_count integer not null default 0;

-- Backfill is_active from published where applicable
update public.templates set is_active = published where published = true and is_active = false;

create table if not exists public.booth_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('page_view', 'session_completed', 'photo_downloaded')),
  template_id text references public.templates(id) on delete set null,
  filter_used text,
  export_method text,
  session_code text,
  location text,
  created_at timestamptz not null default now()
);

create index if not exists idx_booth_events_created_at on public.booth_events (created_at desc);
create index if not exists idx_booth_events_type_created_at on public.booth_events (event_type, created_at desc);
create index if not exists idx_booth_events_template on public.booth_events (template_id);

create or replace function public.increment_template_usage(row_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.templates
  set usage_count = coalesce(usage_count, 0) + 1,
      updated_at = now()
  where id = row_id::text;
end;
$$;
