alter table public.ai_usage
  add column if not exists completed_request_count integer not null default 0 check (completed_request_count >= 0),
  add column if not exists response_time_ms_total bigint not null default 0 check (response_time_ms_total >= 0),
  add column if not exists error_count integer not null default 0 check (error_count >= 0);

create or replace function public.record_ai_request_metrics(
  target_feature text,
  elapsed_ms integer,
  request_failed boolean default false
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null or target_feature not in ('chat', 'search', 'study_plan', 'quiz', 'summary', 'career', 'interview', 'project', 'embedding') then
    raise exception 'Invalid AI metrics request';
  end if;
  update public.ai_usage
  set completed_request_count = completed_request_count + 1,
      response_time_ms_total = response_time_ms_total + greatest(0, least(coalesce(elapsed_ms, 0), 300000)),
      error_count = error_count + case when coalesce(request_failed, false) then 1 else 0 end
  where user_id = auth.uid() and feature = target_feature and date = current_date;
end;
$$;

create or replace function public.get_ai_quality_analytics()
returns table (
  requests bigint,
  completed_requests bigint,
  failed_requests bigint,
  average_response_ms numeric,
  positive_feedback bigint,
  negative_feedback bigint
)
language plpgsql stable security definer
set search_path = public
set row_security = off
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'Administrator access required';
  end if;
  return query
  with usage_totals as (
    select coalesce(sum(u.request_count), 0)::bigint as requests,
      coalesce(sum(u.completed_request_count), 0)::bigint as completed,
      coalesce(sum(u.error_count), 0)::bigint as failed,
      case when sum(u.completed_request_count) > 0
        then round(sum(u.response_time_ms_total)::numeric / sum(u.completed_request_count), 0)
        else 0 end as average_ms
    from public.ai_usage u
    where u.date >= current_date - 29 and u.date <= current_date
  ),
  feedback_totals as (
    select count(*) filter (where f.rating = 'positive')::bigint as positive,
      count(*) filter (where f.rating = 'negative')::bigint as negative
    from public.ai_feedback f
    where f.created_at >= now() - interval '30 days'
  )
  select usage_totals.requests, usage_totals.completed, usage_totals.failed, usage_totals.average_ms,
    feedback_totals.positive, feedback_totals.negative
  from usage_totals cross join feedback_totals;
end;
$$;

revoke all on function public.record_ai_request_metrics(text, integer, boolean) from public;
grant execute on function public.record_ai_request_metrics(text, integer, boolean) to authenticated;
revoke all on function public.get_ai_quality_analytics() from public;
grant execute on function public.get_ai_quality_analytics() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ai-uploads', 'ai-uploads', false, 262144, array['text/plain', 'text/markdown'])
on conflict (id) do update
set public = false, file_size_limit = 262144, allowed_mime_types = array['text/plain', 'text/markdown'];

drop policy if exists ai_uploads_owner_insert on storage.objects;
create policy ai_uploads_owner_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'ai-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists ai_uploads_owner_read on storage.objects;
create policy ai_uploads_owner_read on storage.objects
for select to authenticated
using (bucket_id = 'ai-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists ai_uploads_owner_delete on storage.objects;
create policy ai_uploads_owner_delete on storage.objects
for delete to authenticated
using (bucket_id = 'ai-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
