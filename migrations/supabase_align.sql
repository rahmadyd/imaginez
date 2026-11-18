-- Menyamakan tabel templates yang sudah dibuat dengan versi lama
-- (published integer, slots_json text, tanpa is_active/usage_count)
-- ke skema yang dipakai aplikasi sekarang. Aman dijalankan berulang kali.

do $$
declare
  published_type text;
  published_default text;
  slots_type text;
  slots_default text;
begin
  select data_type, column_default into published_type, published_default
    from information_schema.columns
    where table_schema = 'public' and table_name = 'templates' and column_name = 'published';

  if published_type = 'integer' then
    alter table public.templates alter column published drop default;
    alter table public.templates alter column published type boolean using (published <> 0);
    if published_default is not null then
      alter table public.templates alter column published set default false;
    end if;
  end if;

  select data_type, column_default into slots_type, slots_default
    from information_schema.columns
    where table_schema = 'public' and table_name = 'templates' and column_name = 'slots_json';

  if slots_type = 'text' then
    alter table public.templates alter column slots_json drop default;
    alter table public.templates alter column slots_json type jsonb using (slots_json::jsonb);
    if slots_default is not null then
      alter table public.templates alter column slots_json set default '[]'::jsonb;
    end if;
  end if;
end $$;

alter table public.templates add column if not exists base_layer_key text;
alter table public.templates add column if not exists bleed integer not null default 0;
alter table public.templates add column if not exists is_active boolean not null default false;
alter table public.templates add column if not exists usage_count integer not null default 0;

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

create or replace function public.increment_template_usage(row_id text)
returns void
language plpgsql
security definer
as $$
begin
  update public.templates
  set usage_count = coalesce(usage_count, 0) + 1,
      updated_at = now()
  where id = row_id;
end;
$$;
