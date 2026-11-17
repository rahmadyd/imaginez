-- Admin accounts (auth berbasis DB di Supabase).
-- Login memakai tabel ini: query .eq("email", ...).eq("role", "admin").eq is_active.
-- password_hash = sha256 hex dari password (bukan bcrypt).
-- Jika Supabase tidak terkonfigurasi, login fallback ke env ADMIN_EMAIL + ADMIN_PASSWORD_HASH.

create extension if not exists pgcrypto;

create table if not exists public.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null, -- sha256 hex
  role text not null default 'admin' check (role in ('admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_admin_accounts_email on public.admin_accounts (lower(email));

-- Cara buat password_hash:
--   node -e "console.log(require('crypto').createHash('sha256').update('PASSWORD_ANDA').digest('hex'))"
-- Lalu ganti nilai di bawah ini (contoh hash untuk password "GANTI_PASSWORD_ANDA"):
--   52d81de10516de584183cf74626fd83ccf11ebcbad9c1afff3e8fd12d68a1760

insert into public.admin_accounts (email, password_hash, role, is_active)
values (
  'admin@yourdomain.com',
  '52d81de10516de584183cf74626fd83ccf11ebcbad9c1afff3e8fd12d68a1760',
  'admin',
  true
)
on conflict (email) do update
set password_hash = excluded.password_hash,
    role = excluded.role,
    is_active = excluded.is_active,
    updated_at = now();

-- (Opsional) RLS: server yang memakai secret key akan bypass RLS.
-- alter table public.admin_accounts enable row level security;
