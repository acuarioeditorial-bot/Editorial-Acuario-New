-- Ejecuta este archivo una sola vez en Supabase > SQL Editor.
-- El nombre y el correo son obligatorios; la necesidad y el mensaje son opcionales.
create table if not exists public.access_requests (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  need text,
  message text,
  created_at timestamptz not null default now()
);

alter table public.access_requests enable row level security;

drop policy if exists "cualquiera puede enviar una solicitud de accesibilidad" on public.access_requests;
create policy "cualquiera puede enviar una solicitud de accesibilidad"
on public.access_requests
for insert
to anon, authenticated
with check (true);
