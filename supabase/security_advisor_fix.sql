-- Ejecuta este archivo en Supabase > SQL Editor.
-- Soluciona el aviso de Security Advisor para la vista de métricas.
-- La vista no necesita privilegios SECURITY DEFINER porque solo muestra métricas públicas.
create or replace view public.novel_metrics
with (security_invoker = true)
as
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
group by n.id, n.title, n.author_id;
