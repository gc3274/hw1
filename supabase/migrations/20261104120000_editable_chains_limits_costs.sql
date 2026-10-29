-- Editable prompt chains, generation limits and LLM costs
--
-- How to run: Supabase dashboard -> SQL Editor -> New query -> paste this
-- whole file -> Run, with the role picker on "postgres". Safe to run more
-- than once. Run it after 20261028120000_prompt_chains_and_observability.sql.
--
-- Additive only, so deploys from before this file keep working: they never
-- read the new columns or tables, still find the one-pass chain by its slug,
-- and their inserts leave the new columns null.
--
-- The seeds in section 4 only run the first time (while generation_settings
-- is empty), so a re-run never brings back a limit or model an admin changed
-- or removed.
--
-- Adds:
--   * prompt_chains.is_default: the chain a run falls back to when the mix
--     picks one that can't run (was always the one-pass slug)
--   * prompt_chain_steps order: checked at the end of each statement, so the
--     functions below can swap and shift steps in one update
--   * functions the admin area calls to copy a chain, insert, edit, move and
--     delete steps, set the default chain and add up spend, each in one
--     transaction
--   * generation_settings: posts per user per day, the wait between posts
--     and a daily budget, all editable in the admin area
--   * llm_models prices and llm_responses tokens and cost
--
-- Same access as the other prompt tables: service role only, no grants for
-- anon or authenticated.

begin;

-- 1. The default chain ------------------------------------------------------

alter table public.prompt_chains
  add column if not exists is_default boolean not null default false;

-- At most one default
create unique index if not exists prompt_chains_one_default
  on public.prompt_chains (is_default) where is_default;

-- The seeded one-pass chain, or else the most-used one
update public.prompt_chains c
   set is_default = true
 where c.id = (
         select c2.id
           from public.prompt_chains c2
           left join public.prompt_chain_mix m on m.prompt_chain_id = c2.id
          order by (c2.slug = 'one-pass') desc, coalesce(m.weight, 0) desc, c2.id
          limit 1
       )
   and not exists (select 1 from public.prompt_chains d where d.is_default);

-- Runs fall back to the default, so it can't be deleted until another chain
-- takes over (the admin area says so first; this catches anything else)
create or replace function public.prompt_chains_keep_default()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_default then
    raise exception 'default_chain' using
      hint = 'Make another chain the default before deleting this one.';
  end if;
  return old;
end;
$$;

drop trigger if exists prompt_chains_keep_default on public.prompt_chains;
create trigger prompt_chains_keep_default
  before delete on public.prompt_chains
  for each row execute function public.prompt_chains_keep_default();

comment on table public.prompt_chains is
  'Prompt chains that turn a photo into roasts, edited in the admin area. is_default marks the one runs fall back to.';


-- 2. Step order -------------------------------------------------------------

-- Deferrable, so uniqueness is checked at the end of each statement and one
-- update can swap or shift steps. Nothing uses it as an upsert target.
do $$
begin
  if exists (
    select 1 from pg_constraint
     where conrelid = 'public.prompt_chain_steps'::regclass
       and conname = 'prompt_chain_steps_order_key'
       and not condeferrable
  ) then
    alter table public.prompt_chain_steps
      drop constraint prompt_chain_steps_order_key,
      add constraint prompt_chain_steps_order_key
        unique (prompt_chain_id, step_order) deferrable initially immediate;
  end if;
end $$;

-- The set-nulls when a chain or step is deleted
create index if not exists llm_responses_prompt_chain_id_idx
  on public.llm_responses (prompt_chain_id);
create index if not exists llm_responses_prompt_chain_step_id_idx
  on public.llm_responses (prompt_chain_step_id);


-- 3. Prices, tokens and cost ------------------------------------------------

alter table public.llm_models
  add column if not exists input_usd_per_million  numeric(10, 4),
  add column if not exists output_usd_per_million numeric(10, 4);

alter table public.llm_models
  drop constraint if exists llm_models_prices_check,
  add constraint llm_models_prices_check check (
    (input_usd_per_million is null) = (output_usd_per_million is null)
    and (input_usd_per_million is null or input_usd_per_million between 0 and 1000)
    and (output_usd_per_million is null or output_usd_per_million between 0 and 1000)
  );

comment on column public.llm_models.input_usd_per_million is
  'US dollars per million input tokens (the photo included). Null = no price, so calls to it have no cost.';
comment on column public.llm_models.output_usd_per_million is
  'US dollars per million output tokens, thinking included.';

alter table public.llm_responses
  add column if not exists input_tokens  integer,
  add column if not exists output_tokens integer,
  add column if not exists cost_usd      numeric(12, 6);

alter table public.llm_responses
  drop constraint if exists llm_responses_tokens_min,
  add constraint llm_responses_tokens_min check (
    (input_tokens is null or input_tokens >= 0) and (output_tokens is null or output_tokens >= 0)
  ),
  drop constraint if exists llm_responses_cost_min,
  add constraint llm_responses_cost_min check (cost_usd is null or cost_usd >= 0);

comment on column public.llm_responses.output_tokens is
  'Answer plus thinking tokens. Null when not recorded: older rows, or a call that never answered.';
comment on column public.llm_responses.cost_usd is
  'Tokens times the called model''s price at the time. Null when the model had no price or nothing was recorded.';


-- 4. Limits -----------------------------------------------------------------

create table if not exists public.generation_settings (
  -- Always true: one row
  id                    boolean primary key default true,
  -- Roast runs per user in any 24 hours; refused tries don't count
  posts_per_day         smallint not null default 5,
  -- 0 = no wait
  seconds_between_posts integer not null default 0,
  -- Spend across everyone in any 24 hours, admin runs included; null = no cap
  daily_budget_usd      numeric(10, 2),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint generation_settings_single_row check (id),
  constraint generation_settings_posts_per_day_range check (posts_per_day between 1 and 100),
  constraint generation_settings_seconds_between_posts_range
    check (seconds_between_posts between 0 and 3600),
  constraint generation_settings_daily_budget_range
    check (daily_budget_usd is null or daily_budget_usd between 0 and 10000)
);

comment on table public.generation_settings is
  'Limits on roast runs from the app. One row; the main app reads it before every run.';

-- First run only: the limits as they were, and a model row for the fallback
-- so its calls can be priced
do $seed$
begin
  if exists (select 1 from public.generation_settings) then
    return;
  end if;

  insert into public.generation_settings (id) values (true);

  insert into public.llm_models
    (name, llm_provider_id, provider_model_id, is_temperature_supported, thinking_level)
  select 'Gemini Flash Lite (fallback)', p.id, 'gemini-flash-lite-latest', true, 'minimal'
    from public.llm_providers p
   where p.slug = 'google'
  on conflict (llm_provider_id, provider_model_id) do nothing;
end
$seed$;


-- 5. Access and updated_at --------------------------------------------------

revoke all on public.generation_settings from anon, authenticated;
grant all on public.generation_settings to service_role;
alter table public.generation_settings enable row level security;

drop trigger if exists generation_settings_set_updated_at on public.generation_settings;
create trigger generation_settings_set_updated_at
  before update on public.generation_settings
  for each row execute function public.set_updated_at();


-- 6. Functions for the admin area -------------------------------------------

-- Each locks the chain it changes, so two edits to one chain run one after
-- the other, and raises a short code the admin area turns into a message:
-- chain_not_found, step_not_found, chain_full, only_step, bad_direction,
-- stale. p_expected is the chain's updated_at when the admin area checked the
-- change: every change bumps it, so a check made against an older chain is
-- refused (stale) instead of applied to a chain it was never checked on.

-- A new chain with the same steps as p_source. It starts with weight 0, so no
-- run picks it until an admin gives it a share or makes it the default.
create or replace function public.copy_prompt_chain(
  p_source bigint, p_slug text, p_name text, p_description text
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id bigint;
begin
  perform 1 from public.prompt_chains where id = p_source for share;
  if not found then
    raise exception 'chain_not_found';
  end if;

  insert into public.prompt_chains (slug, name, description)
  values (p_slug, p_name, p_description)
  returning id into v_id;

  insert into public.prompt_chain_steps
    (prompt_chain_id, step_order, description, input_type, output_type, llm_model_id,
     temperature, system_prompt, user_prompt)
  select v_id, s.step_order, s.description, s.input_type, s.output_type, s.llm_model_id,
         s.temperature, s.system_prompt, s.user_prompt
    from public.prompt_chain_steps s
   where s.prompt_chain_id = p_source;

  insert into public.prompt_chain_mix (prompt_chain_id, weight) values (v_id, 0);

  return v_id;
end;
$$;

-- Puts a step at p_position (1 = first; past the end = last) and moves the
-- later ones down. A chain has at most 10 steps.
create or replace function public.insert_prompt_chain_step(
  p_chain bigint, p_position integer, p_step jsonb, p_expected timestamptz default null
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_last     integer;
  v_position integer;
  v_id       bigint;
begin
  perform 1 from public.prompt_chains where id = p_chain for update;
  if not found then
    raise exception 'chain_not_found';
  end if;
  -- Someone else changed the chain since the caller read it
  if p_expected is not null and not exists (
    select 1 from public.prompt_chains where id = p_chain and updated_at = p_expected
  ) then
    raise exception 'stale';
  end if;

  select coalesce(max(step_order), 0) into v_last
    from public.prompt_chain_steps
   where prompt_chain_id = p_chain;
  -- step_order is checked row by row (1 to 10), so a full chain can't shift
  if v_last >= 10 then
    raise exception 'chain_full';
  end if;

  v_position := least(greatest(coalesce(p_position, v_last + 1), 1), v_last + 1);

  update public.prompt_chain_steps
     set step_order = step_order + 1
   where prompt_chain_id = p_chain and step_order >= v_position;

  insert into public.prompt_chain_steps
    (prompt_chain_id, step_order, description, input_type, output_type, llm_model_id,
     temperature, system_prompt, user_prompt)
  values (
    p_chain, v_position, p_step ->> 'description', p_step ->> 'input_type',
    p_step ->> 'output_type', (p_step ->> 'llm_model_id')::bigint,
    (p_step ->> 'temperature')::numeric, p_step ->> 'system_prompt', p_step ->> 'user_prompt'
  )
  returning id into v_id;

  update public.prompt_chains set updated_at = now() where id = p_chain;
  return v_id;
end;
$$;

-- Swaps a step with the one before (-1) or after (1). Nothing happens at
-- either end.
create or replace function public.move_prompt_chain_step(
  p_step bigint, p_direction integer, p_expected timestamptz default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_chain bigint;
  v_order integer;
  v_other integer;
begin
  if p_direction is null or p_direction not in (-1, 1) then
    raise exception 'bad_direction';
  end if;

  select prompt_chain_id into v_chain from public.prompt_chain_steps where id = p_step;
  if not found then
    raise exception 'step_not_found';
  end if;
  perform 1 from public.prompt_chains where id = v_chain for update;
  -- Someone else changed the chain since the caller read it
  if p_expected is not null and not exists (
    select 1 from public.prompt_chains where id = v_chain and updated_at = p_expected
  ) then
    raise exception 'stale';
  end if;

  -- Again under the lock, in case another edit moved it
  select step_order into v_order from public.prompt_chain_steps where id = p_step;
  if not found then
    raise exception 'step_not_found';
  end if;
  v_other := v_order + p_direction;

  if not exists (
    select 1 from public.prompt_chain_steps
     where prompt_chain_id = v_chain and step_order = v_other
  ) then
    return;
  end if;

  update public.prompt_chain_steps
     set step_order = case when id = p_step then v_other else v_order end
   where prompt_chain_id = v_chain and step_order in (v_order, v_other);

  update public.prompt_chains set updated_at = now() where id = v_chain;
end;
$$;

-- Deletes a step and closes the gap. A chain keeps at least one step.
create or replace function public.delete_prompt_chain_step(p_step bigint, p_expected timestamptz default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_chain bigint;
  v_order integer;
begin
  select prompt_chain_id into v_chain from public.prompt_chain_steps where id = p_step;
  if not found then
    raise exception 'step_not_found';
  end if;
  perform 1 from public.prompt_chains where id = v_chain for update;
  -- Someone else changed the chain since the caller read it
  if p_expected is not null and not exists (
    select 1 from public.prompt_chains where id = v_chain and updated_at = p_expected
  ) then
    raise exception 'stale';
  end if;

  select step_order into v_order from public.prompt_chain_steps where id = p_step;
  if not found then
    raise exception 'step_not_found';
  end if;
  if (select count(*) from public.prompt_chain_steps where prompt_chain_id = v_chain) <= 1 then
    raise exception 'only_step';
  end if;

  delete from public.prompt_chain_steps where id = p_step;
  update public.prompt_chain_steps
     set step_order = step_order - 1
   where prompt_chain_id = v_chain and step_order > v_order;

  update public.prompt_chains set updated_at = now() where id = v_chain;
end;
$$;

-- Saves a step's settings and prompts; where it sits only changes by moving it
create or replace function public.update_prompt_chain_step(
  p_chain bigint, p_step bigint, p_data jsonb, p_expected timestamptz default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform 1 from public.prompt_chains where id = p_chain for update;
  if not found then
    raise exception 'chain_not_found';
  end if;
  -- Someone else changed the chain since the caller read it
  if p_expected is not null and not exists (
    select 1 from public.prompt_chains where id = p_chain and updated_at = p_expected
  ) then
    raise exception 'stale';
  end if;

  update public.prompt_chain_steps
     set description   = p_data ->> 'description',
         input_type    = p_data ->> 'input_type',
         output_type   = p_data ->> 'output_type',
         llm_model_id  = (p_data ->> 'llm_model_id')::bigint,
         temperature   = (p_data ->> 'temperature')::numeric,
         system_prompt = p_data ->> 'system_prompt',
         user_prompt   = p_data ->> 'user_prompt'
   where id = p_step and prompt_chain_id = p_chain;
  if not found then
    raise exception 'step_not_found';
  end if;

  update public.prompt_chains set updated_at = now() where id = p_chain;
end;
$$;

-- Makes p_chain the default and gives it every new run: weight 100, every
-- other chain 0
create or replace function public.set_default_prompt_chain(p_chain bigint, p_expected timestamptz default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- One change of default at a time
  perform pg_advisory_xact_lock(hashtext('public.set_default_prompt_chain'));

  perform 1 from public.prompt_chains where id = p_chain for update;
  if not found then
    raise exception 'chain_not_found';
  end if;
  -- Someone else changed the chain since the caller read it
  if p_expected is not null and not exists (
    select 1 from public.prompt_chains where id = p_chain and updated_at = p_expected
  ) then
    raise exception 'stale';
  end if;

  -- In this order: the one-default index can't wait for the end
  update public.prompt_chains set is_default = false where is_default and id <> p_chain;
  update public.prompt_chains set is_default = true where id = p_chain and not is_default;

  insert into public.prompt_chain_mix (prompt_chain_id, weight)
  select c.id, case when c.id = p_chain then 100 else 0 end
    from public.prompt_chains c
  on conflict (prompt_chain_id) do update
    set weight = excluded.weight
    where public.prompt_chain_mix.weight is distinct from excluded.weight;

  -- A step change checked before this is now stale
  update public.prompt_chains set updated_at = now() where id = p_chain;
end;
$$;

-- What the logged model calls since p_since cost. Calls without a price count
-- as 0, so this is a floor.
create or replace function public.llm_spend_since(p_since timestamptz)
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(cost_usd), 0) from public.llm_responses where created_at >= p_since;
$$;

revoke execute on function public.prompt_chains_keep_default() from public, anon, authenticated;
revoke execute on function public.copy_prompt_chain(bigint, text, text, text) from public, anon, authenticated;
revoke execute on function public.insert_prompt_chain_step(bigint, integer, jsonb, timestamptz) from public, anon, authenticated;
revoke execute on function public.move_prompt_chain_step(bigint, integer, timestamptz) from public, anon, authenticated;
revoke execute on function public.delete_prompt_chain_step(bigint, timestamptz) from public, anon, authenticated;
revoke execute on function public.update_prompt_chain_step(bigint, bigint, jsonb, timestamptz) from public, anon, authenticated;
revoke execute on function public.set_default_prompt_chain(bigint, timestamptz) from public, anon, authenticated;
revoke execute on function public.llm_spend_since(timestamptz) from public, anon, authenticated;

grant execute on function public.copy_prompt_chain(bigint, text, text, text) to service_role;
grant execute on function public.insert_prompt_chain_step(bigint, integer, jsonb, timestamptz) to service_role;
grant execute on function public.move_prompt_chain_step(bigint, integer, timestamptz) to service_role;
grant execute on function public.delete_prompt_chain_step(bigint, timestamptz) to service_role;
grant execute on function public.update_prompt_chain_step(bigint, bigint, jsonb, timestamptz) to service_role;
grant execute on function public.set_default_prompt_chain(bigint, timestamptz) to service_role;
grant execute on function public.llm_spend_since(timestamptz) to service_role;

notify pgrst, 'reload schema';

commit;


-- 7. Quick checks (run separately if you want) ------------------------------

-- One default chain, the settings row and the fallback model (expect 1, 1, 1):
-- select (select count(*) from public.prompt_chains where is_default),
--        (select count(*) from public.generation_settings),
--        (select count(*) from public.llm_models where provider_model_id = 'gemini-flash-lite-latest');
--
-- The step order is deferrable (expect true):
-- select condeferrable from pg_constraint where conname = 'prompt_chain_steps_order_key';
--
-- Only the service role may call the new functions (expect no rows):
-- select routine_name, grantee from information_schema.role_routine_grants
--  where routine_schema = 'public' and grantee in ('anon', 'authenticated', 'PUBLIC')
--    and routine_name in ('copy_prompt_chain', 'insert_prompt_chain_step', 'move_prompt_chain_step',
--      'update_prompt_chain_step', 'delete_prompt_chain_step', 'set_default_prompt_chain', 'llm_spend_since');
