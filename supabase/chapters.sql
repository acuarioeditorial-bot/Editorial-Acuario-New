-- Extensión para publicar novelas por capítulos.
-- Ejecuta este archivo después de supabase/schema.sql en Supabase SQL Editor.

create type public.chapter_status as enum ('draft', 'published');

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  novel_id uuid not null references public.novels(id) on delete cascade,
  chapter_number integer not null check (chapter_number > 0),
  title text not null,
  synopsis text,
  content text,
  status public.chapter_status not null default 'draft',
  audio_path text,
  braille_available boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (novel_id, chapter_number)
);

create index chapters_novel_order_idx on public.chapters(novel_id, chapter_number);

alter table public.chapters enable row level security;

create policy "capítulos publicados visibles" on public.chapters
  for select using (
    status = 'published'
    or exists (
      select 1 from public.novels n
      where n.id = novel_id and n.author_id = auth.uid()
    )
  );

create policy "autores crean capítulos propios" on public.chapters
  for insert with check (
    exists (
      select 1 from public.novels n
      where n.id = novel_id and n.author_id = auth.uid()
    )
  );

create policy "autores editan capítulos propios" on public.chapters
  for update using (
    exists (
      select 1 from public.novels n
      where n.id = novel_id and n.author_id = auth.uid()
    )
  );

create policy "autores eliminan capítulos propios" on public.chapters
  for delete using (
    exists (
      select 1 from public.novels n
      where n.id = novel_id and n.author_id = auth.uid()
    )
  );

-- El audio puede guardarse en un bucket privado y servirse mediante URLs firmadas.
insert into storage.buckets (id, name, public)
values ('chapter-audio', 'chapter-audio', false)
on conflict (id) do nothing;
