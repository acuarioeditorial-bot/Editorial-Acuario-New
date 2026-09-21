-- Editorial Acuario: esquema inicial para Supabase/Postgres
-- Ejecutar en SQL Editor de un proyecto nuevo.

create extension if not exists pgcrypto;

create type public.novel_status as enum ('draft', 'pending_review', 'approved', 'rejected', 'published');
create type public.publication_kind as enum ('ebook', 'print_on_demand');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  username text unique,
  bio text,
  avatar_url text,
  role text not null default 'author' check (role in ('author', 'editor', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.novels (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  slug text unique not null,
  synopsis text not null,
  genre text not null,
  cover_path text,
  manuscript_path text,
  status public.novel_status not null default 'draft',
  is_editorial_selection boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.publications (
  id uuid primary key default gen_random_uuid(),
  novel_id uuid not null references public.novels(id) on delete cascade,
  kind public.publication_kind not null,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'EUR' check (char_length(currency) = 3),
  external_product_id text,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (novel_id, kind)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  novel_id uuid not null references public.novels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.reactions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  novel_id uuid not null references public.novels(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (user_id, novel_id)
);

create table public.ratings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  novel_id uuid not null references public.novels(id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, novel_id)
);

create table public.read_events (
  id bigint generated always as identity primary key,
  novel_id uuid not null references public.novels(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.supports (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  supporter_id uuid references public.profiles(id) on delete set null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'EUR' check (char_length(currency) = 3),
  provider text not null default 'stripe',
  provider_payment_id text unique,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  created_at timestamptz not null default now()
);

create index novels_status_idx on public.novels(status, created_at desc);
create index novels_genre_idx on public.novels(genre);
create index comments_novel_idx on public.comments(novel_id, created_at desc);
create index read_events_novel_idx on public.read_events(novel_id);

-- Perfil automático para cada cuenta nueva.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Vista de métricas para catálogo y comité editorial.
create or replace view public.novel_metrics as
select n.id, n.title, n.author_id,
  count(distinct case when r.value = 1 then r.user_id end)::int as likes,
  count(distinct case when r.value = -1 then r.user_id end)::int as dislikes,
  coalesce(round(avg(rt.score)::numeric, 2), 0) as average_rating,
  count(distinct rt.user_id)::int as rating_count,
  count(distinct re.id)::int as reads
from public.novels n
left join public.reactions r on r.novel_id = n.id
left join public.ratings rt on rt.novel_id = n.id
left join public.read_events re on re.novel_id = n.id
group by n.id;

-- RLS: el contenido publicado es público; los autores gestionan solo lo suyo.
alter table public.profiles enable row level security;
alter table public.novels enable row level security;
alter table public.publications enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.ratings enable row level security;
alter table public.read_events enable row level security;
alter table public.supports enable row level security;

create policy "perfiles visibles" on public.profiles for select using (true);
create policy "editar propio perfil" on public.profiles for update using (auth.uid() = id);
create policy "novelas publicadas visibles" on public.novels for select using (status = 'published' or author_id = auth.uid());
create policy "autores crean novelas" on public.novels for insert with check (author_id = auth.uid());
create policy "autores editan sus novelas" on public.novels for update using (author_id = auth.uid());
create policy "autores eliminan sus novelas" on public.novels for delete using (author_id = auth.uid());
create policy "publicaciones activas visibles" on public.publications for select using (active = true or exists (select 1 from public.novels n where n.id = novel_id and n.author_id = auth.uid()));
create policy "comentarios visibles" on public.comments for select using (is_visible = true);
create policy "usuarios comentan" on public.comments for insert with check (user_id = auth.uid());
create policy "usuarios editan sus comentarios" on public.comments for update using (user_id = auth.uid());
create policy "usuarios reaccionan" on public.reactions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "usuarios valoran" on public.ratings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "registrar lecturas" on public.read_events for insert with check (user_id is null or user_id = auth.uid());
create policy "apoyos propios visibles" on public.supports for select using (supporter_id = auth.uid() or author_id = auth.uid());

-- Los archivos de manuscritos deben permanecer privados. Genera URLs firmadas desde el servidor.
insert into storage.buckets (id, name, public) values ('covers', 'covers', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('manuscripts', 'manuscripts', false) on conflict (id) do nothing;
