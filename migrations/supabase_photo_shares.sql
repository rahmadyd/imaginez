-- Temporary public photo shares for QR download (user opt-in, TTL ~5 minutes)
create table if not exists public.photo_shares (
  id text primary key,
  storage_key text not null,
  content_type text not null default 'image/png',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_photo_shares_expires_at on public.photo_shares (expires_at);
