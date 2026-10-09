create table if not exists public.ai_saved_content (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('notes', 'summary', 'career', 'project')),
  title text not null check (length(title) between 1 and 200),
  content text not null check (length(content) between 1 and 12000),
  created_at timestamptz not null default now()
);

create index if not exists ai_saved_content_user_created_idx on public.ai_saved_content(user_id, created_at desc);

alter table public.ai_saved_content enable row level security;
drop policy if exists ai_saved_content_owner_all on public.ai_saved_content;
create policy ai_saved_content_owner_all on public.ai_saved_content
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.ai_saved_content from anon;
grant select, insert, update, delete on public.ai_saved_content to authenticated;

alter table public.ai_quiz_questions
  add column if not exists question_type text not null default 'mcq'
  check (question_type in ('mcq', 'true_false', 'short_answer'));

drop function if exists public.get_ai_quiz_questions(uuid);
create function public.get_ai_quiz_questions(target_quiz_id uuid)
returns table (id uuid, question text, question_type text, options jsonb, correct_answer text, explanation text, answer_visible boolean)
language sql stable security definer
set search_path = public
set row_security = off
as $$
  select q.id, q.question, q.question_type, q.options,
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
  select count(*), count(*) filter (where lower(btrim(submitted_answers ->> q.id::text)) = lower(btrim(q.correct_answer)))
    into total, score_value
    from public.ai_quiz_questions q where q.quiz_id = target_quiz_id;
  if total = 0 then raise exception 'Quiz has no questions'; end if;
  insert into public.ai_quiz_attempts (quiz_id, user_id, score, total_questions, answers)
  values (target_quiz_id, auth.uid(), score_value, total, submitted_answers)
  returning id into attempt_id;
  select jsonb_agg(jsonb_build_object(
    'id', q.id, 'question', q.question, 'correct_answer', q.correct_answer,
    'selected_answer', submitted_answers ->> q.id::text,
    'is_correct', lower(btrim(submitted_answers ->> q.id::text)) = lower(btrim(q.correct_answer)),
    'explanation', q.explanation
  ) order by q.created_at) into result_items
  from public.ai_quiz_questions q where q.quiz_id = target_quiz_id;
  return jsonb_build_object('attempt_id', attempt_id, 'score', score_value, 'total_questions', total, 'results', result_items);
end;
$$;

revoke all on function public.get_ai_quiz_questions(uuid) from public;
grant execute on function public.get_ai_quiz_questions(uuid) to authenticated;

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
          when 'club' then exists (select 1 from public.clubs c where c.id = d.source_id and c.status = 'active')
          else false
        end
        when 'owner' then d.owner_id = auth.uid()
        when 'role' then exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.role = d.required_role)
        when 'admin' then public.is_current_user_admin()
        else false
      end
  );
$$;
