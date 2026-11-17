-- Admin accounts (opsional, untuk auth berbasis DB di Supabase).
-- Catatan: implementasi login saat ini memakai env ADMIN_EMAIL + ADMIN_PASSWORD_HASH (sha256 hex).
-- Tetap set env tersebut di Vercel/Supabase deploy; tabel ini menyiapkan data admin/role di DB
-- jika nanti autentikasi dipindahkan ke Supabase/DB.

create extension if not exists pgcrypto;

create table if not exists public.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null, -- sha256 hex, selaras dengan ADMIN_PASSWORD_HASH
  role text not null default 'admin' check (role in ('admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_admin_accounts_email on public.admin_accounts (lower(email));

-- Seed admin lokal/default (GANTI email & password_hash sebelum production)
insert into public.admin_accounts (email, password_hash, role, is_active)
values (
  'admin@imaginez.local',
  'ac9689e2272427085e35b9d3e3e8bed88cb3434828b43b86fc0596cad4c6e270', -- password: admin1234
  'admin',
  true
)
on conflict (email) do update
set password_hash = excluded.password_hash,
    role = excluded.role,
    is_active = excluded.is_active,
    updated_at = now();

-- (Opsional) RLS: server yang memakai service role key akan bypass RLS.
-- Aktifkan dan tambah policy jika tabel ini akan diakses langsung dari client.
-- alter table public.admin_accounts enable row level security;
