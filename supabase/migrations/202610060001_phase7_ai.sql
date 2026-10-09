create schema if not exists extensions;
create extension if not exists vector with schema extensions;

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation' check (length(title) between 1 and 120),
  mode text not null default 'general' check (mode in ('general', 'study', 'career', 'interview', 'project', 'campus', 'resource')),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null check (length(content) between 1 and 12000),
  model text,
  tokens_used integer not null default 0 check (tokens_used >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_message_sources (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.ai_messages(id) on delete cascade,
  source_type text not null check (source_type in ('resource', 'event', 'internship', 'club', 'announcement', 'faq', 'database', 'external')),
  source_id uuid,
  title text not null,
  relevance_score real check (relevance_score is null or relevance_score between 0 and 1),
  citation_text text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.ai_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating text not null check (rating in ('positive', 'negative')),
  feedback text check (feedback is null or length(feedback) <= 1000),
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('chat', 'search', 'study_plan', 'quiz', 'summary', 'career', 'interview', 'project', 'embedding')),
  request_count integer not null default 0 check (request_count >= 0),
  tokens_used bigint not null default 0 check (tokens_used >= 0),
  date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, feature, date)
);

create table if not exists public.ai_documents (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('resource', 'announcement', 'faq', 'event', 'internship', 'club', 'project', 'academic_content', 'external')),
  source_id uuid,
  title text not null check (length(title) between 1 and 300),
  content text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  embedding extensions.vector(1536),
  access_scope text not null default 'public' check (access_scope in ('public', 'owner', 'role', 'admin')),
  owner_id uuid references auth.users(id) on delete cascade,
  required_role public.user_role,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((access_scope = 'owner' and owner_id is not null) or access_scope <> 'owner'),
  check ((access_scope = 'role' and required_role is not null) or access_scope <> 'role')
);

create table if not exists public.ai_document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.ai_documents(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null check (length(content) between 1 and 12000),
  page_number integer check (page_number is null or page_number > 0),
  metadata jsonb not null default '{}'::jsonb,
  embedding extensions.vector(1536) not null,
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 160),
  description text not null default '',
  start_date date not null,
  end_date date not null,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_date <= end_date)
);

create table if not exists public.study_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.study_plans(id) on delete cascade,
  subject text not null check (length(subject) between 1 and 160),
  topic text not null default '',
  scheduled_date date not null,
  duration_minutes integer not null check (duration_minutes between 5 and 720),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'completed', 'skipped')),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.ai_quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  subject text not null default '',
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard', 'mixed')),
  question_count integer not null check (question_count between 5 and 20),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.ai_quizzes(id) on delete cascade,
  question text not null check (length(question) between 1 and 2000),
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  correct_answer text not null,
  explanation text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.ai_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.ai_quizzes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null check (score >= 0),
  total_questions integer not null check (total_questions between 1 and 20),
  answers jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now()
);

create table if not exists public.campus_faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null check (length(question) between 4 and 1000),
  answer text not null check (length(answer) between 1 and 12000),
  category text not null default 'general' check (length(category) <= 100),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.career_roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 180),
  target_role text not null default '',
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.career_roadmap_milestones (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.career_roadmaps(id) on delete cascade,
  stage text not null check (stage in ('skills', 'learning', 'projects', 'internships', 'interview', 'target_role')),
  title text not null check (length(title) between 1 and 200),
  description text not null default '',
  resource_ids uuid[] not null default '{}',
  due_date date,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_title text not null default '',
  interview_type text not null check (interview_type in ('technical', 'hr', 'behavioral', 'mixed')),
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.ai_interview_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ai_interview_sessions(id) on delete cascade,
  question text not null,
  answer text not null default '',
  evaluation jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ai_conversations_user_updated_idx on public.ai_conversations(user_id, updated_at desc);
create index if not exists ai_messages_conversation_created_idx on public.ai_messages(conversation_id, created_at);
create index if not exists ai_sources_message_idx on public.ai_message_sources(message_id);
create index if not exists ai_usage_user_date_idx on public.ai_usage(user_id, date desc);
create index if not exists ai_documents_source_idx on public.ai_documents(source_type, source_id);
create index if not exists ai_chunks_document_idx on public.ai_document_chunks(document_id, chunk_index);
create index if not exists study_plans_user_idx on public.study_plans(user_id, updated_at desc);
create index if not exists study_plan_items_date_idx on public.study_plan_items(plan_id, scheduled_date);
create index if not exists ai_quizzes_user_idx on public.ai_quizzes(user_id, created_at desc);
create index if not exists ai_quiz_attempts_user_idx on public.ai_quiz_attempts(user_id, completed_at desc);
create index if not exists career_roadmaps_user_idx on public.career_roadmaps(user_id, updated_at desc);
create index if not exists ai_interview_sessions_user_idx on public.ai_interview_sessions(user_id, created_at desc);
create index if not exists ai_chunks_embedding_hnsw_idx on public.ai_document_chunks using hnsw (embedding extensions.vector_cosine_ops) with (m = 16, ef_construction = 64);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_message_sources enable row level security;
alter table public.ai_feedback enable row level security;
alter table public.ai_usage enable row level security;
alter table public.ai_documents enable row level security;
alter table public.ai_document_chunks enable row level security;
alter table public.study_plans enable row level security;
alter table public.study_plan_items enable row level security;
alter table public.ai_quizzes enable row level security;
alter table public.ai_quiz_questions enable row level security;
alter table public.ai_quiz_attempts enable row level security;
alter table public.campus_faqs enable row level security;
alter table public.career_roadmaps enable row level security;
alter table public.career_roadmap_milestones enable row level security;
alter table public.ai_interview_sessions enable row level security;
alter table public.ai_interview_questions enable row level security;
create or replace function public.can_read_ai_document(target_document_id uuid)
returns boolean
language sql stable security definer
set search_path = public, extensions
set row_security = off
as $$
  select exists (
    select 1
    from public.ai_documents d
    where d.id = target_document_id
      and case d.access_scope
        when 'public' then case d.source_type
          when 'resource' then exists (select 1 from public.resources r where r.id = d.source_id and public.can_access_resource(r.id))
          when 'event' then exists (select 1 from public.events e where e.id = d.source_id and e.status = 'published')
          when 'internship' then exists (select 1 from public.internships i where i.id = d.source_id and i.status = 'published')
          when 'faq' then exists (select 1 from public.campus_faqs f where f.id = d.source_id and f.status = 'published')
          else false
        end
        when 'owner' then d.owner_id = auth.uid()
        when 'role' then exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.role = d.required_role)
        when 'admin' then public.is_current_user_admin()
        else false
      end
  );
$$;

revoke all on function public.can_read_ai_document(uuid) from public;
grant execute on function public.can_read_ai_document(uuid) to authenticated;

create policy ai_conversations_owner_all on public.ai_conversations for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ai_messages_owner_read on public.ai_messages for select to authenticated using (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()));
create policy ai_messages_owner_insert on public.ai_messages for insert to authenticated with check (role <> 'system' and exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()));
create policy ai_messages_owner_delete on public.ai_messages for delete to authenticated using (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()));
create policy ai_message_sources_owner_read on public.ai_message_sources for select to authenticated using (exists (select 1 from public.ai_messages m join public.ai_conversations c on c.id = m.conversation_id where m.id = message_id and c.user_id = auth.uid()));
create policy ai_message_sources_owner_insert on public.ai_message_sources for insert to authenticated with check (exists (select 1 from public.ai_messages m join public.ai_conversations c on c.id = m.conversation_id where m.id = message_id and c.user_id = auth.uid()));
create policy ai_feedback_owner_all on public.ai_feedback for all to authenticated using (user_id = auth.uid() and exists (select 1 from public.ai_messages m join public.ai_conversations c on c.id = m.conversation_id where m.id = message_id and c.user_id = auth.uid())) with check (user_id = auth.uid() and exists (select 1 from public.ai_messages m join public.ai_conversations c on c.id = m.conversation_id where m.id = message_id and c.user_id = auth.uid()));
create policy ai_usage_owner_read on public.ai_usage for select to authenticated using (user_id = auth.uid());
create policy ai_documents_visible_read on public.ai_documents for select to authenticated using (public.can_read_ai_document(id));
create policy ai_documents_admin_insert on public.ai_documents for insert to authenticated with check (public.is_current_user_admin());
create policy ai_documents_admin_update on public.ai_documents for update to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());
create policy ai_documents_admin_delete on public.ai_documents for delete to authenticated using (public.is_current_user_admin());
create policy ai_chunks_visible_read on public.ai_document_chunks for select to authenticated using (public.can_read_ai_document(document_id));
create policy ai_chunks_admin_insert on public.ai_document_chunks for insert to authenticated with check (public.is_current_user_admin());
create policy ai_chunks_admin_update on public.ai_document_chunks for update to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());
create policy ai_chunks_admin_delete on public.ai_document_chunks for delete to authenticated using (public.is_current_user_admin());
create policy study_plans_owner_all on public.study_plans for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy study_plan_items_owner_all on public.study_plan_items for all to authenticated using (exists (select 1 from public.study_plans p where p.id = plan_id and p.user_id = auth.uid())) with check (exists (select 1 from public.study_plans p where p.id = plan_id and p.user_id = auth.uid()));
create policy ai_quizzes_owner_all on public.ai_quizzes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ai_quiz_questions_owner_insert on public.ai_quiz_questions for insert to authenticated with check (exists (select 1 from public.ai_quizzes q where q.id = quiz_id and q.user_id = auth.uid()));
create policy ai_quiz_questions_owner_read_after_attempt on public.ai_quiz_questions for select to authenticated using (exists (select 1 from public.ai_quizzes q join public.ai_quiz_attempts a on a.quiz_id = q.id where q.id = quiz_id and q.user_id = auth.uid() and a.user_id = auth.uid()));
create policy ai_quiz_attempts_owner_read on public.ai_quiz_attempts for select to authenticated using (user_id = auth.uid());
create policy campus_faqs_published_read on public.campus_faqs for select to authenticated using (status = 'published' or public.is_current_user_admin());
create policy campus_faqs_admin_manage on public.campus_faqs for all to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());
create policy career_roadmaps_owner_all on public.career_roadmaps for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy career_roadmap_milestones_owner_all on public.career_roadmap_milestones for all to authenticated using (exists (select 1 from public.career_roadmaps r where r.id = roadmap_id and r.user_id = auth.uid())) with check (exists (select 1 from public.career_roadmaps r where r.id = roadmap_id and r.user_id = auth.uid()));
create policy ai_interview_sessions_owner_all on public.ai_interview_sessions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ai_interview_questions_owner_all on public.ai_interview_questions for all to authenticated using (exists (select 1 from public.ai_interview_sessions s where s.id = session_id and s.user_id = auth.uid())) with check (exists (select 1 from public.ai_interview_sessions s where s.id = session_id and s.user_id = auth.uid()));
create or replace function public.consume_ai_usage(target_feature text, max_requests integer default 30)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  if auth.uid() is null or target_feature not in ('chat', 'search', 'study_plan', 'quiz', 'summary', 'career', 'interview', 'project', 'embedding') then
    return false;
  end if;
  insert into public.ai_usage (user_id, feature, date, request_count)
  values (auth.uid(), target_feature, current_date, 1)
  on conflict (user_id, feature, date) do update
    set request_count = public.ai_usage.request_count + 1
    where public.ai_usage.request_count < greatest(1, least(max_requests, 100))
  returning request_count into updated_count;
  return updated_count is not null;
end;
$$;

create or replace function public.record_ai_usage_tokens(target_feature text, token_count integer)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null or target_feature not in ('chat', 'search', 'study_plan', 'quiz', 'summary', 'career', 'interview', 'project', 'embedding') then
    return;
  end if;
  insert into public.ai_usage (user_id, feature, date, tokens_used)
  values (auth.uid(), target_feature, current_date, greatest(0, least(coalesce(token_count, 0), 100000)))
  on conflict (user_id, feature, date) do update
    set tokens_used = public.ai_usage.tokens_used + greatest(0, least(coalesce(token_count, 0), 100000));
end;
$$;

create or replace function public.match_ai_document_chunks(
  query_embedding extensions.vector(1536),
  match_count integer default 8,
  source_filter text[] default null
)
returns table (
  id uuid,
  document_id uuid,
  chunk_index integer,
  content text,
  title text,
  source_type text,
  source_id uuid,
  similarity real,
  metadata jsonb
)
language sql stable security invoker
set search_path = public, extensions
as $$
  select c.id, c.document_id, c.chunk_index, c.content, d.title, d.source_type, d.source_id,
         (1 - (c.embedding <=> query_embedding))::real as similarity, d.metadata || c.metadata as metadata
  from public.ai_document_chunks c
  join public.ai_documents d on d.id = c.document_id
  where (source_filter is null or d.source_type = any(source_filter))
    and public.can_read_ai_document(d.id)
  order by c.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 20);
$$;

create or replace function public.get_ai_quiz_questions(target_quiz_id uuid)
returns table (id uuid, question text, options jsonb, correct_answer text, explanation text, answer_visible boolean)
language sql stable security definer
set search_path = public
set row_security = off
as $$
  select q.id, q.question, q.options,
    case when exists (select 1 from public.ai_quiz_attempts a where a.quiz_id = target_quiz_id and a.user_id = auth.uid()) then q.correct_answer else null end,
    case when exists (select 1 from public.ai_quiz_attempts a where a.quiz_id = target_quiz_id and a.user_id = auth.uid()) then q.explanation else null end,
    exists (select 1 from public.ai_quiz_attempts a where a.quiz_id = target_quiz_id and a.user_id = auth.uid())
  from public.ai_quiz_questions q
  join public.ai_quizzes quiz on quiz.id = q.quiz_id
  where quiz.id = target_quiz_id and quiz.user_id = auth.uid()
  order by q.created_at;
$$;

create or replace function public.submit_ai_quiz_attempt(target_quiz_id uuid, submitted_answers jsonb)
returns jsonb
language plpgsql security definer
set search_path = public
set row_security = off
as $$
declare
  total integer;
  score_value integer;
  attempt_id uuid;
  result_items jsonb;
begin
  if auth.uid() is null or jsonb_typeof(submitted_answers) <> 'object' then
    raise exception 'Invalid quiz submission';
  end if;
  if not exists (select 1 from public.ai_quizzes q where q.id = target_quiz_id and q.user_id = auth.uid()) then
    raise exception 'Quiz not found';
  end if;
  select count(*), count(*) filter (where submitted_answers ->> q.id::text = q.correct_answer)
    into total, score_value
    from public.ai_quiz_questions q where q.quiz_id = target_quiz_id;
  if total = 0 then raise exception 'Quiz has no questions'; end if;
  insert into public.ai_quiz_attempts (quiz_id, user_id, score, total_questions, answers)
  values (target_quiz_id, auth.uid(), score_value, total, submitted_answers)
  returning id into attempt_id;
  select jsonb_agg(jsonb_build_object(
    'id', q.id, 'question', q.question, 'correct_answer', q.correct_answer,
    'selected_answer', submitted_answers ->> q.id::text,
    'is_correct', submitted_answers ->> q.id::text = q.correct_answer,
    'explanation', q.explanation
  ) order by q.created_at) into result_items
  from public.ai_quiz_questions q where q.quiz_id = target_quiz_id;
  return jsonb_build_object('attempt_id', attempt_id, 'score', score_value, 'total_questions', total, 'results', result_items);
end;
$$;

create or replace function public.get_ai_usage_analytics(start_day date default current_date - 30, end_day date default current_date)
returns table (day date, feature text, requests bigint, tokens bigint, users bigint)
language sql stable security definer
set search_path = public
set row_security = off
as $$
  select u.date, u.feature, sum(u.request_count)::bigint, sum(u.tokens_used)::bigint, count(distinct u.user_id)::bigint
  from public.ai_usage u
  where public.is_current_user_admin() and u.date between start_day and end_day
  group by u.date, u.feature
  order by u.date desc, u.feature;
$$;

revoke all on function public.consume_ai_usage(text, integer) from public;
grant execute on function public.consume_ai_usage(text, integer) to authenticated;
revoke all on function public.record_ai_usage_tokens(text, integer) from public;
grant execute on function public.record_ai_usage_tokens(text, integer) to authenticated;
revoke all on function public.match_ai_document_chunks(extensions.vector, integer, text[]) from public;
grant execute on function public.match_ai_document_chunks(extensions.vector, integer, text[]) to authenticated;
revoke all on function public.get_ai_quiz_questions(uuid) from public;
grant execute on function public.get_ai_quiz_questions(uuid) to authenticated;
revoke all on function public.submit_ai_quiz_attempt(uuid, jsonb) from public;
grant execute on function public.submit_ai_quiz_attempt(uuid, jsonb) to authenticated;
revoke all on function public.get_ai_usage_analytics(date, date) from public;
grant execute on function public.get_ai_usage_analytics(date, date) to authenticated;

revoke all on public.ai_conversations, public.ai_messages, public.ai_message_sources, public.ai_feedback, public.ai_usage,
  public.ai_documents, public.ai_document_chunks, public.study_plans, public.study_plan_items, public.ai_quizzes,
  public.ai_quiz_questions, public.ai_quiz_attempts, public.campus_faqs, public.career_roadmaps,
  public.career_roadmap_milestones, public.ai_interview_sessions, public.ai_interview_questions from anon;

grant select, insert, update, delete on public.ai_conversations, public.ai_messages, public.ai_message_sources,
  public.ai_feedback, public.ai_usage, public.ai_documents, public.ai_document_chunks, public.study_plans,
  public.study_plan_items, public.ai_quizzes, public.ai_quiz_questions, public.ai_quiz_attempts, public.campus_faqs,
  public.career_roadmaps, public.career_roadmap_milestones, public.ai_interview_sessions, public.ai_interview_questions
  to authenticated;
