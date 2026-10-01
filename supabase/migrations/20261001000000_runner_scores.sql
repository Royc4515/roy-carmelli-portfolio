-- Roy Runner: per-player best scores and a public leaderboard.
--
-- The browser never touches these tables directly (RLS is on with no policies). Every
-- read and write goes through the SECURITY DEFINER functions below, so the client can't
-- set an arbitrary best, read e-mails or user ids, or write a score for someone else.

create table public.runner_scores (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 32),
  best_score   integer not null check (best_score between 0 and 1000000),
  updated_at   timestamptz not null default now()
);

-- One open run per player: when the server saw it start. A submitted score must fit the
-- time that has really passed since then, so a forged "999999" needs ~35 hours of waiting.
create table public.runner_runs (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  started_at timestamptz not null default now()
);

alter table public.runner_scores enable row level security;
alter table public.runner_runs enable row level security;
-- No policies on purpose: anon/authenticated get no direct access to either table.

create index runner_scores_rank_idx on public.runner_scores (best_score desc, updated_at asc);

-- Opens (or restarts) the caller's run.
create or replace function public.start_runner_run()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.runner_runs (user_id, started_at)
  values (auth.uid(), now())
  on conflict (user_id) do update set started_at = excluded.started_at;
end;
$$;

-- Closes the caller's run with its score and returns the caller's best (old or new).
create or replace function public.submit_runner_score(p_score integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- don't touch / must match SCORE_CONFIG.pointsPerSecond in src/components/MiniGame/config.ts
  points_per_second constant numeric := 8;
  v_uid     uuid := auth.uid();
  v_started timestamptz;
  v_elapsed numeric;
  v_meta    jsonb;
  v_full    text;
  v_parts   text[];
  v_name    text;
  v_best    integer;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_score is null or p_score < 0 or p_score > 1000000 then
    raise exception 'invalid score' using errcode = '22023';
  end if;

  delete from public.runner_runs where user_id = v_uid returning started_at into v_started;
  if v_started is null then
    raise exception 'no run in progress' using errcode = 'P0002';
  end if;

  -- The engine caps each frame at 0.1s, so game time never outruns wall time. 5% plus
  -- 3 seconds of slack covers a slow start_runner_run round trip.
  v_elapsed := extract(epoch from now() - v_started);
  if p_score > floor(v_elapsed * points_per_second * 1.05) + 3 * points_per_second then
    raise exception 'implausible score' using errcode = '22023';
  end if;

  -- Public name is "First L." from the Google profile, never the full name or e-mail.
  select raw_user_meta_data into v_meta from auth.users where id = v_uid;
  v_full := coalesce(
    nullif(btrim(v_meta ->> 'full_name'), ''),
    nullif(btrim(v_meta ->> 'name'), ''),
    'Player'
  );
  v_parts := regexp_split_to_array(v_full, '\s+');
  v_name := left(v_parts[1], 24);
  if array_length(v_parts, 1) > 1 then
    v_name := v_name || ' ' || left(v_parts[array_length(v_parts, 1)], 1) || '.';
  end if;

  insert into public.runner_scores as s (user_id, display_name, best_score)
  values (v_uid, v_name, p_score)
  on conflict (user_id) do update
    set best_score   = greatest(s.best_score, excluded.best_score),
        display_name = excluded.display_name,
        -- Ties rank by who got there first, so only a new best moves the timestamp.
        updated_at   = case when excluded.best_score > s.best_score then now() else s.updated_at end
  returning best_score into v_best;

  return v_best;
end;
$$;

-- Top p_limit players, plus the caller's own row when they are outside it.
create or replace function public.runner_leaderboard(p_limit integer default 10)
returns table (rank bigint, display_name text, best_score integer, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with ranked as (
    select
      s.user_id,
      s.display_name,
      s.best_score,
      rank() over (order by s.best_score desc) as rank,
      row_number() over (order by s.best_score desc, s.updated_at asc) as pos
    from public.runner_scores s
  )
  select r.rank, r.display_name, r.best_score, coalesce(r.user_id = auth.uid(), false)
  from ranked r
  where r.pos <= least(greatest(coalesce(p_limit, 10), 1), 50)
     or r.user_id = auth.uid()
  order by r.pos;
$$;

-- The caller's best, or 0 before their first score.
create or replace function public.my_runner_best()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select best_score from public.runner_scores where user_id = auth.uid()), 0);
$$;

revoke all on function public.start_runner_run() from public, anon;
revoke all on function public.submit_runner_score(integer) from public, anon;
revoke all on function public.my_runner_best() from public, anon;
revoke all on function public.runner_leaderboard(integer) from public;

grant execute on function public.start_runner_run() to authenticated;
grant execute on function public.submit_runner_score(integer) to authenticated;
grant execute on function public.my_runner_best() to authenticated;
grant execute on function public.runner_leaderboard(integer) to anon, authenticated;
