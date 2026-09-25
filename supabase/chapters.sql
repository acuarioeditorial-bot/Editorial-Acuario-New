-- Ejecuta en Supabase > SQL Editor.
-- Añade capítulos y permita al autor gestionar sus obras.

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  novel_id uuid not null references public.novels(id) on delete cascade,
  title text not null,
  content text not null,
  chapter_number integer not null check (chapter_number > 0),
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (novel_id, chapter_number)
);

alter table public.chapters enable row level security;

-- Los lectores pueden ver capítulos publicados.
create policy "capitulos publicos visibles"
on public.chapters
for select
using (status = 'published' or exists (
  select 1 from public.novels n
  where n.id = novel_id and n.author_id = auth.uid()
));

-- El autor puede crear y editar sus propios capítulos.
create policy "autores gestionan sus capitulos"
on public.chapters
for all
using (exists (
  select 1 from public.novels n
  where n.id = novel_id and n.author_id = auth.uid()
))
with check (exists (
  select 1 from public.novels n
  where n.id = novel_id and n.author_id = auth.uid()
));

create index if not exists chapters_novel_idx on public.chapters(novel_id, chapter_number);
