create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  parent_name text,
  child_name text,
  child_id uuid,
  child_age integer,
  child_photo_url text,
  relationship text,
  state text,
  tier text not null default 'free',
  role text not null default 'parent',
  has_completed_onboarding boolean not null default false,
  onboarding_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  date_of_birth date,
  age_years integer,
  gender text,
  diagnoses text[] not null default '{}',
  communication_level text,
  sensory_sensitivities text[] not null default '{}',
  strengths text[] not null default '{}',
  challenges text[] not null default '{}',
  current_therapies text[] not null default '{}',
  school_info jsonb not null default '{}'::jsonb,
  avatar_url text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_children_parent_id on public.children(parent_id);
create index if not exists idx_children_user_id on public.children(user_id);

create table if not exists public.user_streaks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'daily_checkin',
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_activity_date date,
  total_activities integer not null default 0,
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, type)
);

create table if not exists public.screening_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid references public.children(id) on delete set null,
  instrument_id text not null,
  instrument_name text not null,
  answers jsonb not null default '{}'::jsonb,
  total_score numeric,
  risk_level text,
  summary text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.treatment_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid references public.children(id) on delete cascade,
  title text not null,
  description text,
  domain text,
  status text not null default 'not_started',
  current numeric not null default 0,
  current_progress numeric not null default 0,
  priority text not null default 'medium',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_treatment_goals_user_child on public.treatment_goals(user_id, child_id);

create table if not exists public.ai_conversations (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid references public.children(id) on delete set null,
  title text not null,
  summary text,
  message_count integer not null default 0,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_conversations_user_id on public.ai_conversations(user_id);
create index if not exists idx_ai_conversations_child_id on public.ai_conversations(child_id);
create index if not exists idx_ai_conversations_last_message_at on public.ai_conversations(last_message_at desc);

create table if not exists public.ai_messages (
  id text primary key,
  conversation_id text not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_messages_conversation_id on public.ai_messages(conversation_id);
create index if not exists idx_ai_messages_created_at on public.ai_messages(created_at);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid references public.children(id) on delete set null,
  title text,
  archived boolean not null default false,
  messages jsonb not null default '[]'::jsonb,
  message_count integer not null default 0,
  facts_extracted text[] not null default '{}',
  topics text[] not null default '{}',
  sentiment text not null default 'neutral',
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_conversations_user_id on public.conversations(user_id);
create index if not exists idx_conversations_child_id on public.conversations(child_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation_id on public.messages(conversation_id);

create table if not exists public.conversation_compat_map (
  ai_conversation_id text primary key references public.ai_conversations(id) on delete cascade,
  conversation_id uuid not null unique references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid references public.children(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_conversation_compat_map_user_id on public.conversation_compat_map(user_id);

create table if not exists public.memory_facts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  category text not null,
  key text not null,
  value text not null,
  confidence numeric,
  source text,
  source_id text,
  extracted_at timestamptz not null default now(),
  last_verified timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, child_id, key)
);

create index if not exists idx_memory_facts_user_child on public.memory_facts(user_id, child_id);
create index if not exists idx_memory_facts_extracted_at on public.memory_facts(extracted_at desc);

create table if not exists public.conversation_summaries (
  id text primary key,
  conversation_id text not null unique references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid references public.children(id) on delete set null,
  summary text not null,
  key_topics text[] not null default '{}',
  emotional_tone text not null default 'neutral',
  action_items text[] not null default '{}',
  strategies_mentioned text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_conversation_summaries_user_child on public.conversation_summaries(user_id, child_id, created_at desc);

create table if not exists public.daily_plan_snapshots (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  plan_date date not null,
  version integer not null default 1,
  status text not null default 'active' check (status in ('active', 'superseded', 'archived')),
  source text not null default 'generated' check (source in ('generated', 'manual', 'recovered')),
  items jsonb not null default '[]'::jsonb,
  generated_from_goal_ids text[] not null default '{}',
  generated_from_memory_fact_ids text[] not null default '{}',
  generated_from_conversation_summary_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_daily_plan_snapshots_active_per_day
  on public.daily_plan_snapshots(user_id, child_id, plan_date)
  where status = 'active';
create index if not exists idx_daily_plan_snapshots_lookup on public.daily_plan_snapshots(user_id, child_id, plan_date, version desc);

create table if not exists public.routine_completions (
  id text primary key,
  routine_id text not null,
  routine_name text,
  user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid references public.children(id) on delete set null,
  scheduled_date date not null default current_date,
  started_at timestamptz,
  completed_at timestamptz,
  status text not null default 'pending',
  completion_status text not null default 'pending',
  steps_completed integer not null default 0,
  total_steps integer not null default 0,
  adherence_score integer not null default 0,
  notes text,
  plan_snapshot_id text references public.daily_plan_snapshots(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_routine_completions_unique_plan_item
  on public.routine_completions(user_id, plan_snapshot_id, routine_id);
create index if not exists idx_routine_completions_user_date on public.routine_completions(user_id, scheduled_date desc);

create table if not exists public.jr_sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  parent_id uuid not null references auth.users(id) on delete cascade,
  session_type text not null,
  activity_name text,
  duration_seconds integer,
  coins_earned integer not null default 0,
  xp_earned integer not null default 0,
  completed boolean not null default false,
  score integer,
  data jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_jr_sessions_parent_child on public.jr_sessions(parent_id, child_id, completed_at desc);

create table if not exists public.caregiver_summaries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  snapshot jsonb not null,
  summary_text text not null,
  notes text,
  source_plan_snapshot_ids text[] not null default '{}',
  source_conversation_summary_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_caregiver_summaries_user_child_period on public.caregiver_summaries(user_id, child_id, period_end desc);

alter table public.profiles enable row level security;
alter table public.children enable row level security;
alter table public.user_streaks enable row level security;
alter table public.screening_results enable row level security;
alter table public.treatment_goals enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_compat_map enable row level security;
alter table public.memory_facts enable row level security;
alter table public.conversation_summaries enable row level security;
alter table public.daily_plan_snapshots enable row level security;
alter table public.routine_completions enable row level security;
alter table public.jr_sessions enable row level security;
alter table public.caregiver_summaries enable row level security;

drop policy if exists "profiles_owner_all" on public.profiles;
create policy "profiles_owner_all" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "children_owner_all" on public.children;
create policy "children_owner_all" on public.children for all using (auth.uid() = parent_id) with check (auth.uid() = parent_id);

drop policy if exists "user_streaks_owner_all" on public.user_streaks;
create policy "user_streaks_owner_all" on public.user_streaks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "screening_results_owner_all" on public.screening_results;
create policy "screening_results_owner_all" on public.screening_results for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "treatment_goals_owner_all" on public.treatment_goals;
create policy "treatment_goals_owner_all" on public.treatment_goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "ai_conversations_owner_all" on public.ai_conversations;
create policy "ai_conversations_owner_all" on public.ai_conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "ai_messages_owner_all" on public.ai_messages;
create policy "ai_messages_owner_all" on public.ai_messages for all using (
  exists (
    select 1 from public.ai_conversations c
    where c.id = ai_messages.conversation_id and c.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.ai_conversations c
    where c.id = ai_messages.conversation_id and c.user_id = auth.uid()
  )
);

drop policy if exists "conversations_owner_all" on public.conversations;
create policy "conversations_owner_all" on public.conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "messages_owner_all" on public.messages;
create policy "messages_owner_all" on public.messages for all using (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id and c.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id and c.user_id = auth.uid()
  )
);

drop policy if exists "conversation_compat_map_owner_all" on public.conversation_compat_map;
create policy "conversation_compat_map_owner_all" on public.conversation_compat_map for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "memory_facts_owner_all" on public.memory_facts;
create policy "memory_facts_owner_all" on public.memory_facts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "conversation_summaries_owner_all" on public.conversation_summaries;
create policy "conversation_summaries_owner_all" on public.conversation_summaries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "daily_plan_snapshots_owner_all" on public.daily_plan_snapshots;
create policy "daily_plan_snapshots_owner_all" on public.daily_plan_snapshots for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "routine_completions_owner_all" on public.routine_completions;
create policy "routine_completions_owner_all" on public.routine_completions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "jr_sessions_owner_all" on public.jr_sessions;
create policy "jr_sessions_owner_all" on public.jr_sessions for all using (auth.uid() = parent_id) with check (auth.uid() = parent_id);

drop policy if exists "caregiver_summaries_owner_all" on public.caregiver_summaries;
create policy "caregiver_summaries_owner_all" on public.caregiver_summaries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists children_set_updated_at on public.children;
create trigger children_set_updated_at before update on public.children for each row execute function public.set_updated_at();
drop trigger if exists user_streaks_set_updated_at on public.user_streaks;
create trigger user_streaks_set_updated_at before update on public.user_streaks for each row execute function public.set_updated_at();
drop trigger if exists treatment_goals_set_updated_at on public.treatment_goals;
create trigger treatment_goals_set_updated_at before update on public.treatment_goals for each row execute function public.set_updated_at();
drop trigger if exists ai_conversations_set_updated_at on public.ai_conversations;
create trigger ai_conversations_set_updated_at before update on public.ai_conversations for each row execute function public.set_updated_at();
drop trigger if exists memory_facts_set_updated_at on public.memory_facts;
create trigger memory_facts_set_updated_at before update on public.memory_facts for each row execute function public.set_updated_at();
drop trigger if exists daily_plan_snapshots_set_updated_at on public.daily_plan_snapshots;
create trigger daily_plan_snapshots_set_updated_at before update on public.daily_plan_snapshots for each row execute function public.set_updated_at();
drop trigger if exists routine_completions_set_updated_at on public.routine_completions;
create trigger routine_completions_set_updated_at before update on public.routine_completions for each row execute function public.set_updated_at();
drop trigger if exists caregiver_summaries_set_updated_at on public.caregiver_summaries;
create trigger caregiver_summaries_set_updated_at before update on public.caregiver_summaries for each row execute function public.set_updated_at();
