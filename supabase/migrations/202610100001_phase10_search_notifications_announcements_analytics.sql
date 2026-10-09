begin;

create table if not exists public.user_search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null check (length(trim(query)) between 2 and 100),
  created_at timestamptz not null default now()
);
create index if not exists user_search_history_user_created_idx
  on public.user_search_history (user_id, created_at desc);
alter table public.user_search_history enable row level security;
drop policy if exists user_search_history_owner_read on public.user_search_history;
create policy user_search_history_owner_read on public.user_search_history
  for select to authenticated using (user_id = auth.uid());
drop policy if exists user_search_history_owner_delete on public.user_search_history;
create policy user_search_history_owner_delete on public.user_search_history
  for delete to authenticated using (user_id = auth.uid());
grant select, delete on public.user_search_history to authenticated;
revoke insert, update on public.user_search_history from anon, authenticated;

create or replace function public.record_user_search(search_query text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  normalized_query text := trim(regexp_replace(coalesce(search_query, ''), '\s+', ' ', 'g'));
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if length(normalized_query) < 2 or length(normalized_query) > 100 then
    raise exception 'Search terms must be between 2 and 100 characters';
  end if;
  insert into public.user_search_history (user_id, query)
  values (auth.uid(), normalized_query);
  delete from public.user_search_history h
  where h.user_id = auth.uid() and h.id not in (
    select recent.id from public.user_search_history recent
    where recent.user_id = auth.uid()
    order by recent.created_at desc limit 50
  );
  delete from public.user_search_history
  where user_id = auth.uid() and created_at < now() - interval '30 days';
end;
$$;
revoke all on function public.record_user_search(text) from public, anon;
grant execute on function public.record_user_search(text) to authenticated;

alter table public.notifications
  add column if not exists action_url text,
  add column if not exists read_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;
update public.notifications set read_at = created_at where is_read and read_at is null;
alter table public.notifications
  drop constraint if exists notifications_action_url_check,
  drop constraint if exists notifications_metadata_object_check,
  drop constraint if exists notifications_expiry_check;
alter table public.notifications
  add constraint notifications_action_url_check check (
    action_url is null or (action_url like '/%' and action_url not like '//%' and action_url not like '%\%' and action_url not like '%:%')
  ),
  add constraint notifications_metadata_object_check check (jsonb_typeof(metadata) = 'object'),
  add constraint notifications_expiry_check check (expires_at is null or expires_at > created_at);
create index if not exists notifications_owner_unread_idx
  on public.notifications (user_id, created_at desc) where is_read = false;
create index if not exists notifications_expiry_idx on public.notifications (expires_at) where expires_at is not null;
alter table public.notifications enable row level security;
drop policy if exists notifications_delete_owner on public.notifications;
create policy notifications_delete_owner on public.notifications
  for delete to authenticated using (user_id = auth.uid());
grant select, delete on public.notifications to authenticated;
revoke update on public.notifications from anon, authenticated;
grant update (is_read, read_at) on public.notifications to authenticated;
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'event_registration', 'event_reminder', 'event_cancelled', 'event_updated', 'ticket_issued',
  'internship_deadline', 'application_updated', 'interview_reminder', 'internship_published',
  'attendance_warning', 'academic_update', 'class_reminder', 'resource_published',
  'message', 'mention', 'club_join_approval', 'club_invitation', 'project_team_invitation',
  'club_activity', 'team_task', 'message_reaction', 'message_reply', 'support_update',
  'lost_found_update', 'feedback_response', 'announcement'
));
create or replace function public.sync_notification_read_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.is_read and not old.is_read then
    new.read_at := coalesce(new.read_at, now());
  elsif not new.is_read then
    new.read_at := null;
  end if;
  return new;
end;
$$;
drop trigger if exists sync_notification_read_at_trigger on public.notifications;
create trigger sync_notification_read_at_trigger before update of is_read on public.notifications
for each row execute function public.sync_notification_read_at();
create or replace function public.respect_notification_preference()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  preference_category text := case
    when new.type in ('event_registration', 'event_reminder', 'event_cancelled', 'event_updated', 'ticket_issued') then 'events'
    when new.type in ('internship_deadline', 'application_updated', 'interview_reminder', 'internship_published') then 'internships'
    when new.type in ('resource_published') then 'resources'
    when new.type in ('message', 'mention', 'message_reaction', 'message_reply') then 'chat'
    when new.type in ('club_join_approval', 'club_invitation', 'club_activity') then 'clubs'
    when new.type in ('project_team_invitation', 'team_task') then 'project_teams'
    when new.type in ('academic_update', 'class_reminder') then 'academic'
    when new.type in ('attendance_warning') then 'attendance'
    when new.type in ('support_update', 'lost_found_update', 'feedback_response') then 'support'
    when new.type = 'announcement' then 'announcements'
    else 'system'
  end;
begin
  if exists (
    select 1 from public.notification_preferences p
    where p.user_id = new.user_id and p.category = preference_category and not p.in_app_enabled
  ) then return null; end if;
  return new;
end;
$$;
drop trigger if exists notifications_respect_preferences_trigger on public.notifications;
create trigger notifications_respect_preferences_trigger before insert on public.notifications
for each row execute function public.respect_notification_preference();

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in (
    'academic', 'events', 'resources', 'internships', 'clubs', 'project_teams',
    'chat', 'career', 'support', 'attendance', 'announcements', 'system'
  )),
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, category),
  check (email_enabled = false)
);
create index if not exists notification_preferences_user_idx
  on public.notification_preferences (user_id, category);
alter table public.notification_preferences enable row level security;
drop policy if exists notification_preferences_owner_manage on public.notification_preferences;
create policy notification_preferences_owner_manage on public.notification_preferences
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.notification_preferences to authenticated;
create or replace function public.touch_notification_preference()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); return new; end; $$;
drop trigger if exists notification_preferences_updated_at_trigger on public.notification_preferences;
create trigger notification_preferences_updated_at_trigger before update on public.notification_preferences
for each row execute function public.touch_notification_preference();

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 4 and 180),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  summary text not null check (length(trim(summary)) between 10 and 500),
  content text not null check (length(trim(content)) between 10 and 20000),
  category text not null check (category in ('academic', 'events', 'career', 'clubs', 'student_support', 'general', 'system')),
  priority text not null default 'normal' check (priority in ('normal', 'important', 'urgent')),
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published', 'archived', 'cancelled')),
  author_id uuid not null references auth.users(id) on delete restrict,
  published_at timestamptz,
  scheduled_at timestamptz,
  expires_at timestamptz,
  is_pinned boolean not null default false,
  requires_acknowledgement boolean not null default false,
  attachment_paths jsonb not null default '[]'::jsonb
    check (jsonb_typeof(attachment_paths) = 'array' and jsonb_array_length(attachment_paths) <= 10),
  notifications_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or published_at is null or expires_at > published_at),
  check (status <> 'scheduled' or scheduled_at is not null)
);
create index if not exists announcements_publication_idx
  on public.announcements (status, published_at desc, expires_at);
create index if not exists announcements_search_idx
  on public.announcements using gin (to_tsvector('simple', title || ' ' || summary || ' ' || content));
create table if not exists public.announcement_audiences (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  role public.user_role,
  department text,
  semester smallint check (semester is null or semester between 1 and 8),
  section text,
  created_at timestamptz not null default now(),
  check (department is null or length(trim(department)) between 1 and 120),
  check (section is null or length(trim(section)) between 1 and 40)
);
create index if not exists announcement_audiences_announcement_idx
  on public.announcement_audiences (announcement_id);
create index if not exists announcement_audiences_target_idx
  on public.announcement_audiences (role, department, semester, section);
create table if not exists public.announcement_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  unique (announcement_id, user_id)
);
create index if not exists announcement_acknowledgements_user_idx
  on public.announcement_acknowledgements (user_id, announcement_id);

create or replace function public.can_view_announcement_for_user(target_announcement_id uuid, target_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select target_user_id is not null and exists (
    select 1 from public.announcements a
    where a.id = target_announcement_id
      and (
        (select p.role from public.profiles p where p.auth_user_id = target_user_id) = 'admin'
        or (
          a.status = 'published' and a.published_at <= now()
          and (a.expires_at is null or a.expires_at > now())
          and exists (
            select 1 from public.announcement_audiences aa
            join public.profiles p on p.auth_user_id = target_user_id
            where aa.announcement_id = a.id
              and (aa.role is null or aa.role = p.role)
              and (aa.department is null or lower(aa.department) = lower(p.department))
              and (aa.semester is null or aa.semester = p.semester)
              and (aa.section is null or lower(aa.section) = lower(p.section))
          )
        )
      )
  );
$$;
create or replace function public.can_view_announcement(target_announcement_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select public.can_view_announcement_for_user(target_announcement_id, auth.uid()); $$;

alter table public.announcements enable row level security;
alter table public.announcement_audiences enable row level security;
alter table public.announcement_acknowledgements enable row level security;
drop policy if exists announcements_visible_read on public.announcements;
create policy announcements_visible_read on public.announcements for select to authenticated
  using (public.can_view_announcement(id));
drop policy if exists announcements_admin_manage on public.announcements;
create policy announcements_admin_manage on public.announcements for all to authenticated
  using (public.is_current_user_admin()) with check (public.is_current_user_admin());
drop policy if exists announcement_audiences_visible_read on public.announcement_audiences;
create policy announcement_audiences_visible_read on public.announcement_audiences for select to authenticated
  using (public.can_view_announcement(announcement_id) or public.is_current_user_admin());
drop policy if exists announcement_audiences_admin_manage on public.announcement_audiences;
create policy announcement_audiences_admin_manage on public.announcement_audiences for all to authenticated
  using (public.is_current_user_admin()) with check (public.is_current_user_admin());
drop policy if exists announcement_acknowledgements_owner_read on public.announcement_acknowledgements;
create policy announcement_acknowledgements_owner_read on public.announcement_acknowledgements for select to authenticated
  using (user_id = auth.uid() or public.is_current_user_admin());
drop policy if exists announcement_acknowledgements_owner_insert on public.announcement_acknowledgements;
create policy announcement_acknowledgements_owner_insert on public.announcement_acknowledgements for insert to authenticated
  with check (user_id = auth.uid() and public.can_view_announcement(announcement_id));
grant select on public.announcements, public.announcement_audiences, public.announcement_acknowledgements to authenticated;
grant insert, update, delete on public.announcements, public.announcement_audiences to authenticated;
grant insert, delete on public.announcement_acknowledgements to authenticated;
revoke update on public.announcement_acknowledgements from anon, authenticated;
revoke all on function public.can_view_announcement_for_user(uuid, uuid) from public, anon, authenticated;
revoke all on function public.can_view_announcement(uuid) from public, anon;
grant execute on function public.can_view_announcement(uuid) to authenticated;

create or replace function public.save_announcement(
  target_id uuid,
  announcement_title text,
  announcement_slug text,
  announcement_summary text,
  announcement_content text,
  announcement_category text,
  announcement_priority text,
  announcement_status text,
  announcement_scheduled_at timestamptz,
  announcement_expires_at timestamptz,
  announcement_is_pinned boolean,
  announcement_requires_acknowledgement boolean,
  announcement_attachment_paths jsonb,
  announcement_audiences jsonb
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  saved_id uuid;
  audience jsonb;
  next_published_at timestamptz;
begin
  if current_user_id is null or not public.is_current_user_admin() then
    raise exception 'Administrator access required to publish campus announcements';
  end if;
  if announcement_attachment_paths is null or announcement_audiences is null
    or announcement_status is null
    or announcement_status not in ('draft', 'scheduled', 'published', 'archived', 'cancelled')
    or jsonb_typeof(announcement_attachment_paths) <> 'array'
    or jsonb_array_length(announcement_attachment_paths) > 10
    or jsonb_typeof(announcement_audiences) <> 'array'
    or jsonb_array_length(announcement_audiences) > 100 then
    raise exception 'Invalid announcement data';
  end if;
  if (announcement_status = 'published' and announcement_expires_at is not null and announcement_expires_at <= now())
    or (announcement_status = 'scheduled' and announcement_expires_at is not null
      and announcement_expires_at <= announcement_scheduled_at) then
    raise exception 'The expiration must be later than the publication time';
  end if;
  if exists (
    select 1 from jsonb_array_elements_text(announcement_attachment_paths) as paths(value)
    where not public.owns_announcement_object(paths.value)
  ) then raise exception 'Announcement attachments must be uploaded by an administrator'; end if;
  if exists (
    select 1 from jsonb_array_elements(announcement_audiences) as audiences(value)
    where jsonb_typeof(audiences.value) <> 'object'
      or coalesce(audiences.value->>'role', '') not in ('', 'student', 'faculty', 'admin')
      or coalesce(audiences.value->>'semester', '') !~ '^(|[1-8])$'
      or length(coalesce(audiences.value->>'department', '')) > 120
      or length(coalesce(audiences.value->>'section', '')) > 40
  ) then raise exception 'Invalid announcement audience'; end if;
  next_published_at := case when announcement_status = 'published' then now() else null end;
  if target_id is null then
    insert into public.announcements (
      title, slug, summary, content, category, priority, status, author_id, published_at, scheduled_at,
      expires_at, is_pinned, requires_acknowledgement, attachment_paths
    ) values (
      announcement_title, announcement_slug, announcement_summary, announcement_content,
      announcement_category, announcement_priority, 'draft', current_user_id,
      null, announcement_scheduled_at, announcement_expires_at, announcement_is_pinned,
      announcement_requires_acknowledgement, announcement_attachment_paths
    ) returning id into saved_id;
  else
    update public.announcements set
      title = announcement_title, slug = announcement_slug, summary = announcement_summary,
      content = announcement_content, category = announcement_category, priority = announcement_priority,
      scheduled_at = announcement_scheduled_at, expires_at = announcement_expires_at,
      is_pinned = announcement_is_pinned, requires_acknowledgement = announcement_requires_acknowledgement,
      attachment_paths = announcement_attachment_paths, updated_at = now()
    where id = target_id returning id into saved_id;
    if saved_id is null then raise exception 'Announcement not found'; end if;
    delete from public.announcement_audiences where announcement_id = saved_id;
  end if;
  if jsonb_array_length(announcement_audiences) = 0 then
    insert into public.announcement_audiences (announcement_id) values (saved_id);
  else
    for audience in select value from jsonb_array_elements(announcement_audiences) loop
      insert into public.announcement_audiences (announcement_id, role, department, semester, section)
      values (
        saved_id,
        nullif(audience->>'role', '')::public.user_role,
        nullif(trim(audience->>'department'), ''),
        nullif(audience->>'semester', '')::smallint,
        nullif(trim(audience->>'section'), '')
      );
    end loop;
  end if;
  update public.announcements set
    status = announcement_status,
    published_at = case when announcement_status = 'published' then coalesce(published_at, now()) else published_at end,
    updated_at = now()
  where id = saved_id and status is distinct from announcement_status;
  insert into public.audit_logs (actor_id, action, target_type, target_id, metadata)
  values (current_user_id, case when target_id is null then 'create_announcement' else 'update_announcement' end,
    'announcement', saved_id, jsonb_build_object('status', announcement_status, 'category', announcement_category));
  return saved_id;
end;
$$;
revoke all on function public.save_announcement(
  uuid, text, text, text, text, text, text, text, timestamptz, timestamptz, boolean, boolean, jsonb, jsonb
) from public, anon;
grant execute on function public.save_announcement(
  uuid, text, text, text, text, text, text, text, timestamptz, timestamptz, boolean, boolean, jsonb, jsonb
) to authenticated;

create or replace function public.notify_announcement_published()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'published' and new.notifications_sent_at is null then
    insert into public.notifications (user_id, title, message, type, action_url, expires_at, metadata)
    select p.auth_user_id, 'New campus announcement', new.title, 'announcement',
      '/announcements/' || new.id::text, new.expires_at, jsonb_build_object('announcement_id', new.id)
    from public.profiles p
    where public.can_view_announcement_for_user(new.id, p.auth_user_id)
      and not exists (
        select 1 from public.notification_preferences np
        where np.user_id = p.auth_user_id and np.category = 'announcements' and not np.in_app_enabled
      )
    on conflict do nothing;
    update public.announcements set notifications_sent_at = now() where id = new.id;
    new.notifications_sent_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists announcements_notify_publish_trigger on public.announcements;
create trigger announcements_notify_publish_trigger after insert or update of status on public.announcements
for each row execute function public.notify_announcement_published();

create or replace function public.publish_due_announcements()
returns integer language plpgsql security definer set search_path = ''
as $$
declare
  affected integer;
begin
  update public.announcements set status = 'archived', updated_at = now()
  where status = 'scheduled' and scheduled_at <= now() and expires_at is not null and expires_at <= now();
  update public.announcements set status = 'published', published_at = now(), updated_at = now()
  where status = 'scheduled' and scheduled_at <= now() and (expires_at is null or expires_at > now());
  get diagnostics affected = row_count;
  update public.announcements set status = 'archived', updated_at = now()
  where status = 'published' and expires_at is not null and expires_at <= now();
  return affected;
end;
$$;
revoke all on function public.publish_due_announcements() from public, anon, authenticated;
grant execute on function public.publish_due_announcements() to service_role;

create or replace function public.can_view_announcement_attachment(target_path text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.announcements a
    where a.attachment_paths @> jsonb_build_array(target_path)
      and public.can_view_announcement(a.id)
  );
$$;
revoke all on function public.can_view_announcement_attachment(text) from public, anon;
grant execute on function public.can_view_announcement_attachment(text) to authenticated;

create or replace function public.owns_announcement_object(target_path text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from storage.objects o
    where o.bucket_id = 'campus-announcements-private'
      and o.name = target_path and o.owner_id = auth.uid()::text
  );
$$;
revoke all on function public.owns_announcement_object(text) from public, anon;
grant execute on function public.owns_announcement_object(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('campus-announcements-private', 'campus-announcements-private', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists campus_announcement_admin_upload on storage.objects;
create policy campus_announcement_admin_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'campus-announcements-private' and public.is_current_user_admin() and owner_id = auth.uid()::text);
drop policy if exists campus_announcement_eligible_read on storage.objects;
create policy campus_announcement_eligible_read on storage.objects for select to authenticated
  using (bucket_id = 'campus-announcements-private' and (
    public.is_current_user_admin() or public.can_view_announcement_attachment(name)
  ));
drop policy if exists campus_announcement_admin_delete on storage.objects;
create policy campus_announcement_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'campus-announcements-private' and public.is_current_user_admin());

drop function if exists public.search_campus_content(text, text, integer, integer);
create function public.search_campus_content(
  search_query text,
  result_category text default null,
  page_number integer default 0,
  page_size integer default 20,
  search_filters jsonb default '{}'::jsonb,
  sort_order text default 'relevance'
)
returns table (
  id uuid,
  title text,
  description text,
  category text,
  href text,
  metadata jsonb,
  created_at timestamptz,
  relevance real,
  total_count bigint
)
language plpgsql stable security invoker set search_path = ''
as $$
declare
  normalized_query text := trim(regexp_replace(coalesce(search_query, ''), '\s+', ' ', 'g'));
  search_terms tsquery;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if length(normalized_query) < 2 or length(normalized_query) > 100 then
    raise exception 'Search terms must be between 2 and 100 characters';
  end if;
  if result_category is not null and result_category not in (
    'resource', 'subject', 'event', 'internship', 'club', 'team', 'announcement',
    'service', 'lost_found', 'faq'
  ) then raise exception 'Invalid search category'; end if;
  if page_number < 0 or page_number > 200 or page_size < 1 or page_size > 50 then
    raise exception 'Invalid search pagination';
  end if;
  if search_filters is null or jsonb_typeof(search_filters) <> 'object'
    or sort_order is null
    or sort_order not in ('relevance', 'newest', 'oldest') then
    raise exception 'Invalid search filters or sort order';
  end if;
  if exists (
    select 1 from jsonb_object_keys(search_filters) as filter_keys(key)
    where filter_keys.key not in (
      'resourceSubject', 'resourceSemester', 'resourceDepartment', 'resourceType',
      'eventCategory', 'eventTime', 'internshipWorkMode', 'internshipType', 'internshipSkill',
      'clubCategory', 'announcementCategory', 'announcementFrom', 'announcementTo'
    )
  ) then raise exception 'Unsupported search filter'; end if;
  if coalesce(search_filters->>'resourceSemester', '') !~ '^(|[1-8])$'
    or coalesce(search_filters->>'eventTime', '') not in ('', 'upcoming', 'past')
    or coalesce(search_filters->>'internshipWorkMode', '') not in ('', 'remote', 'hybrid', 'on_site')
    or coalesce(search_filters->>'internshipType', '') not in ('', 'full_time', 'part_time', 'summer', 'winter', 'academic', 'research')
    or coalesce(search_filters->>'announcementFrom', '') !~ '^(|[0-9]{4}-[0-9]{2}-[0-9]{2})$'
    or coalesce(search_filters->>'announcementTo', '') !~ '^(|[0-9]{4}-[0-9]{2}-[0-9]{2})$'
    or length(coalesce(search_filters->>'resourceSubject', '')) > 120
    or length(coalesce(search_filters->>'resourceDepartment', '')) > 120
    or length(coalesce(search_filters->>'resourceType', '')) > 80
    or length(coalesce(search_filters->>'eventCategory', '')) > 80
    or length(coalesce(search_filters->>'internshipSkill', '')) > 80
    or length(coalesce(search_filters->>'clubCategory', '')) > 80
    or length(coalesce(search_filters->>'announcementCategory', '')) > 40 then
    raise exception 'Invalid search filter value';
  end if;
  search_terms := websearch_to_tsquery('simple', normalized_query);
  return query
  with candidates as (
    select r.id, r.title::text, coalesce(r.description, '')::text description,
      'resource'::text category, ('/resources/' || r.id::text)::text href,
      jsonb_build_object('resource_type', rt.label, 'subject', s.subject_name, 'semester', r.semester) metadata,
      r.created_at,
      ts_rank(to_tsvector('simple', coalesce(r.title, '') || ' ' || coalesce(r.description, '')), search_terms) relevance
    from public.resources r
    join public.subjects s on s.id = r.subject_id
    join public.resource_types rt on rt.code = r.resource_type
    join public.branches b on b.id = r.branch_id
    where (result_category is null or result_category = 'resource')
      and (coalesce(search_filters->>'resourceSubject', '') = '' or s.subject_name ilike '%' || (search_filters->>'resourceSubject') || '%')
      and (coalesce(search_filters->>'resourceSemester', '') = '' or r.semester::text = search_filters->>'resourceSemester')
      and (coalesce(search_filters->>'resourceDepartment', '') = '' or b.name ilike '%' || (search_filters->>'resourceDepartment') || '%')
      and (coalesce(search_filters->>'resourceType', '') = '' or rt.label ilike '%' || (search_filters->>'resourceType') || '%')
      and (to_tsvector('simple', coalesce(r.title, '') || ' ' || coalesce(r.description, '')) @@ search_terms
        or r.title ilike '%' || normalized_query || '%' or coalesce(r.description, '') ilike '%' || normalized_query || '%')
    union all
    select s.id, s.subject_name::text, coalesce(s.description, '')::text,
      'subject'::text, ('/academics/subjects/' || s.id::text)::text,
      jsonb_build_object('code', s.subject_code, 'semester', s.semester, 'branch', b.name),
      s.created_at, ts_rank(to_tsvector('simple', s.subject_name || ' ' || coalesce(s.description, '')), search_terms)
    from public.subjects s join public.branches b on b.id = s.branch_id
    where s.is_active and (result_category is null or result_category = 'subject')
      and (to_tsvector('simple', s.subject_name || ' ' || coalesce(s.description, '')) @@ search_terms
        or s.subject_name ilike '%' || normalized_query || '%' or coalesce(s.description, '') ilike '%' || normalized_query || '%')
    union all
    select e.id, e.title::text, coalesce(e.short_description, e.description, '')::text,
      'event'::text, ('/events/' || e.id::text)::text,
      jsonb_build_object('event_date', e.event_date, 'category', e.category, 'venue', e.venue),
      e.created_at, ts_rank(to_tsvector('simple', e.title || ' ' || coalesce(e.short_description, '') || ' ' || e.description), search_terms)
    from public.events e
    where e.status = 'published' and (result_category is null or result_category = 'event')
      and (coalesce(search_filters->>'eventCategory', '') = '' or e.category ilike '%' || (search_filters->>'eventCategory') || '%')
      and (coalesce(search_filters->>'eventTime', '') = ''
        or (search_filters->>'eventTime' = 'upcoming' and e.event_date >= current_date)
        or (search_filters->>'eventTime' = 'past' and e.event_date < current_date))
      and (to_tsvector('simple', e.title || ' ' || coalesce(e.short_description, '') || ' ' || e.description) @@ search_terms
        or e.title ilike '%' || normalized_query || '%' or e.short_description ilike '%' || normalized_query || '%')
    union all
    select i.id, i.role_title::text, coalesce(i.short_description, i.description, '')::text,
      'internship'::text, ('/internships/' || i.id::text)::text,
      jsonb_build_object('company', c.name, 'work_mode', i.work_mode, 'internship_type', i.internship_type, 'deadline', i.application_deadline),
      i.created_at, ts_rank(to_tsvector('simple', i.role_title || ' ' || coalesce(i.short_description, '') || ' ' || i.description || ' ' || array_to_string(i.skills, ' ')), search_terms)
    from public.internships i join public.companies c on c.id = i.company_id
    where i.status = 'published' and not i.is_demo and (result_category is null or result_category = 'internship')
      and (coalesce(search_filters->>'internshipWorkMode', '') = '' or i.work_mode = search_filters->>'internshipWorkMode')
      and (coalesce(search_filters->>'internshipType', '') = '' or i.internship_type = search_filters->>'internshipType')
      and (coalesce(search_filters->>'internshipSkill', '') = '' or exists (
        select 1 from unnest(i.skills) skill where lower(skill) = lower(search_filters->>'internshipSkill')
      ))
      and (to_tsvector('simple', i.role_title || ' ' || coalesce(i.short_description, '') || ' ' || i.description || ' ' || array_to_string(i.skills, ' ')) @@ search_terms
        or i.role_title ilike '%' || normalized_query || '%' or i.short_description ilike '%' || normalized_query || '%')
    union all
    select c.id, c.name::text, coalesce(c.description, '')::text,
      'club'::text, ('/clubs/' || c.slug)::text,
      jsonb_build_object('category', c.category, 'status', c.status),
      c.created_at, ts_rank(to_tsvector('simple', c.name || ' ' || c.description || ' ' || c.category), search_terms)
    from public.clubs c
    where c.status = 'active' and not c.is_demo and (result_category is null or result_category = 'club')
      and (coalesce(search_filters->>'clubCategory', '') = '' or c.category ilike '%' || (search_filters->>'clubCategory') || '%')
      and (to_tsvector('simple', c.name || ' ' || c.description || ' ' || c.category) @@ search_terms
        or c.name ilike '%' || normalized_query || '%' or c.description ilike '%' || normalized_query || '%')
    union all
    select t.id, t.name::text, coalesce(t.description, '')::text,
      'team'::text, ('/teams/' || t.id::text)::text,
      jsonb_build_object('project_title', t.project_title, 'domain', t.project_domain, 'status', t.status),
      t.created_at, ts_rank(to_tsvector('simple', t.name || ' ' || t.project_title || ' ' || t.project_domain || ' ' || t.description), search_terms)
    from public.project_teams t
    where (result_category is null or result_category = 'team')
      and (to_tsvector('simple', t.name || ' ' || t.project_title || ' ' || t.project_domain || ' ' || t.description) @@ search_terms
        or t.name ilike '%' || normalized_query || '%' or t.project_title ilike '%' || normalized_query || '%')
    union all
    select a.id, a.title::text, a.summary::text,
      'announcement'::text, ('/announcements/' || a.id::text)::text,
      jsonb_build_object('category', a.category, 'priority', a.priority, 'published_at', a.published_at),
      a.published_at, ts_rank(to_tsvector('simple', a.title || ' ' || a.summary || ' ' || a.content), search_terms)
    from public.announcements a
    where public.can_view_announcement(a.id) and (result_category is null or result_category = 'announcement')
      and (coalesce(search_filters->>'announcementCategory', '') = '' or a.category = search_filters->>'announcementCategory')
      and (coalesce(search_filters->>'announcementFrom', '') = '' or a.published_at::date >= (search_filters->>'announcementFrom')::date)
      and (coalesce(search_filters->>'announcementTo', '') = '' or a.published_at::date <= (search_filters->>'announcementTo')::date)
      and (to_tsvector('simple', a.title || ' ' || a.summary || ' ' || a.content) @@ search_terms
        or a.title ilike '%' || normalized_query || '%' or a.summary ilike '%' || normalized_query || '%')
    union all
    select s.id, s.name::text, s.description::text,
      'service'::text, ('/campus-services/' || s.id::text)::text,
      jsonb_build_object('category', s.category, 'service_type', s.service_type),
      s.created_at, ts_rank(to_tsvector('simple', s.name || ' ' || s.description), search_terms)
    from public.campus_services s
    where s.is_active and (result_category is null or result_category = 'service')
      and (to_tsvector('simple', s.name || ' ' || s.description) @@ search_terms
        or s.name ilike '%' || normalized_query || '%' or s.description ilike '%' || normalized_query || '%')
    union all
    select i.id, i.title::text, i.description::text,
      'lost_found'::text, ('/lost-found/' || i.id::text)::text,
      jsonb_build_object('report_type', i.report_type, 'category', i.category, 'location', i.location_description),
      i.created_at, ts_rank(to_tsvector('simple', i.title || ' ' || i.description), search_terms)
    from public.lost_found_items i
    where i.status in ('open', 'potential_match') and (result_category is null or result_category = 'lost_found')
      and (to_tsvector('simple', i.title || ' ' || i.description) @@ search_terms
        or i.title ilike '%' || normalized_query || '%' or i.description ilike '%' || normalized_query || '%')
    union all
    select f.id, f.question::text, f.answer::text,
      'faq'::text, '/support/faq'::text,
      jsonb_build_object('category', f.category),
      f.updated_at, ts_rank(to_tsvector('simple', f.question || ' ' || f.answer), search_terms)
    from public.campus_faqs f
    where f.status = 'published' and (result_category is null or result_category = 'faq')
      and (to_tsvector('simple', f.question || ' ' || f.answer) @@ search_terms
        or f.question ilike '%' || normalized_query || '%' or f.answer ilike '%' || normalized_query || '%')
  ), ranked as (
    select candidates.*, count(*) over () as result_count
    from candidates
  )
  select ranked.id, ranked.title,
    left(regexp_replace(ranked.description, '<[^>]*>', '', 'g'), 240),
    ranked.category, ranked.href, ranked.metadata, ranked.created_at,
    ranked.relevance, ranked.result_count
  from ranked
  order by
    case when sort_order = 'relevance' then ranked.relevance end desc,
    case when sort_order = 'newest' then ranked.created_at end desc,
    case when sort_order = 'oldest' then ranked.created_at end asc,
    ranked.created_at desc
  limit page_size offset (page_number * page_size);
end;
$$;
revoke all on function public.search_campus_content(text, text, integer, integer, jsonb, text) from public, anon;
grant execute on function public.search_campus_content(text, text, integer, integer, jsonb, text) to authenticated;

create index if not exists resources_search_idx
  on public.resources using gin (to_tsvector('simple', title || ' ' || coalesce(description, '')));
create index if not exists events_search_idx
  on public.events using gin (to_tsvector('simple', title || ' ' || short_description || ' ' || description))
  where status = 'published';
create index if not exists internships_search_idx
  on public.internships using gin (to_tsvector('simple', role_title || ' ' || short_description || ' ' || description || ' ' || array_to_string(skills, ' ')))
  where status = 'published' and not is_demo;
create index if not exists clubs_search_idx
  on public.clubs using gin (to_tsvector('simple', name || ' ' || description || ' ' || category))
  where status = 'active' and not is_demo;
create index if not exists project_teams_search_idx
  on public.project_teams using gin (to_tsvector('simple', name || ' ' || project_title || ' ' || project_domain || ' ' || description));
create index if not exists campus_faqs_search_idx
  on public.campus_faqs using gin (to_tsvector('simple', question || ' ' || answer))
  where status = 'published';

create or replace function public.get_phase10_analytics(
  from_date date default current_date - 30,
  to_date date default current_date,
  department_filter text default null,
  semester_filter smallint default null
)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.is_current_user_admin() then raise exception 'Administrator access required'; end if;
  if from_date is null or to_date is null or from_date > to_date or to_date > current_date
    or to_date - from_date > 366 then
    raise exception 'Select a date range of up to 366 days ending today or earlier';
  end if;
  result := jsonb_build_object(
    'users', (select count(*) from public.profiles p where p.created_at::date between from_date and to_date
      and (department_filter is null or p.department = department_filter)
      and (semester_filter is null or p.semester = semester_filter)),
    'students', (select count(*) from public.profiles p where p.role = 'student' and p.created_at::date between from_date and to_date
      and (department_filter is null or p.department = department_filter) and (semester_filter is null or p.semester = semester_filter)),
    'faculty', (select count(*) from public.profiles p where p.role = 'faculty' and p.created_at::date between from_date and to_date
      and (department_filter is null or p.department = department_filter)),
    'resources', (select count(*) from public.resources r where r.status = 'published' and r.created_at::date between from_date and to_date),
    'published_events', (select count(*) from public.events e where e.status = 'published' and e.created_at::date between from_date and to_date),
    'event_registrations', (select count(*) from public.event_registrations r where r.status <> 'cancelled' and r.registered_at::date between from_date and to_date),
    'active_internships', (select count(*) from public.internships i where i.status = 'published' and not i.is_demo and i.created_at::date between from_date and to_date),
    'internship_applications', (select count(*) from public.internship_applications a where a.status not in ('saved', 'withdrawn') and a.created_at::date between from_date and to_date),
    'active_clubs', (select count(*) from public.clubs c where c.status = 'active' and not c.is_demo and c.created_at::date between from_date and to_date),
    'active_teams', (select count(*) from public.project_teams t where t.status in ('forming', 'active') and t.created_at::date between from_date and to_date),
    'open_support_tickets', (select count(*) from public.support_tickets t where t.status not in ('resolved', 'closed', 'rejected') and t.created_at::date between from_date and to_date),
    'published_announcements', (select count(*) from public.announcements a where a.status = 'published' and a.published_at::date between from_date and to_date),
    'notifications_created', (select count(*) from public.notifications n where n.created_at::date between from_date and to_date),
    'notifications_read', (select count(*) from public.notifications n where n.read_at::date between from_date and to_date),
    'ai_tokens_used', (select coalesce(sum(u.tokens_used), 0) from public.ai_usage u where u.date between from_date and to_date
      and (department_filter is null or exists (select 1 from public.profiles p where p.auth_user_id = u.user_id and p.department = department_filter))
      and (semester_filter is null or exists (select 1 from public.profiles p where p.auth_user_id = u.user_id and p.semester = semester_filter))),
    'attendance_records', (select count(*) from public.attendance_records r join public.attendance_sessions s on s.id = r.attendance_session_id
      where s.session_date between from_date and to_date
      and (department_filter is null or exists (select 1 from public.profiles p where p.auth_user_id = r.student_id and p.department = department_filter))
      and (semester_filter is null or exists (select 1 from public.profiles p where p.auth_user_id = r.student_id and p.semester = semester_filter)))
  );
  return result;
end;
$$;
revoke all on function public.get_phase10_analytics(date, date, text, smallint) from public, anon;
grant execute on function public.get_phase10_analytics(date, date, text, smallint) to authenticated;

create or replace function public.get_phase10_analytics_trend(
  from_date date,
  to_date date,
  module_filter text default 'all',
  department_filter text default null,
  semester_filter smallint default null
)
returns table (period_start date, metric text, value bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_current_user_admin() then raise exception 'Administrator access required'; end if;
  if from_date is null or to_date is null or from_date > to_date or to_date > current_date
    or to_date - from_date > 366 then
    raise exception 'Select a date range of up to 366 days ending today or earlier';
  end if;
  if module_filter is null or module_filter not in (
    'all', 'users', 'resources', 'events', 'internships', 'support',
    'announcements', 'ai', 'attendance'
  ) then raise exception 'Invalid analytics module'; end if;
  return query
  with months as (
    select generate_series(
      date_trunc('month', from_date::timestamp)::date,
      date_trunc('month', to_date::timestamp)::date,
      interval '1 month'
    )::date as month_start
  ), observations as (
    select 'users'::text metric_name, p.created_at::date observed_on, 1::bigint amount
    from public.profiles p
    where p.created_at::date between from_date and to_date
      and (department_filter is null or p.department = department_filter)
      and (semester_filter is null or p.semester = semester_filter)
      and module_filter in ('all', 'users')
    union all
    select 'resources', r.created_at::date, 1::bigint
    from public.resources r
    left join public.branches b on b.id = r.branch_id
    where r.status = 'published' and r.created_at::date between from_date and to_date
      and (department_filter is null or b.name = department_filter)
      and (semester_filter is null or r.semester = semester_filter)
      and module_filter in ('all', 'resources')
    union all
    select 'events', e.created_at::date, 1::bigint
    from public.events e
    where e.status = 'published' and e.created_at::date between from_date and to_date
      and module_filter in ('all', 'events')
    union all
    select 'internships', i.created_at::date, 1::bigint
    from public.internships i
    where i.status = 'published' and not i.is_demo and i.created_at::date between from_date and to_date
      and module_filter in ('all', 'internships')
    union all
    select 'support', t.created_at::date, 1::bigint
    from public.support_tickets t
    where t.created_at::date between from_date and to_date
      and module_filter in ('all', 'support')
    union all
    select 'announcements', a.published_at::date, 1::bigint
    from public.announcements a
    where a.status = 'published' and a.published_at::date between from_date and to_date
      and module_filter in ('all', 'announcements')
    union all
    select 'ai', u.date, u.tokens_used
    from public.ai_usage u
    where u.date between from_date and to_date
      and (department_filter is null or exists (
        select 1 from public.profiles p where p.auth_user_id = u.user_id and p.department = department_filter
      ))
      and (semester_filter is null or exists (
        select 1 from public.profiles p where p.auth_user_id = u.user_id and p.semester = semester_filter
      ))
      and module_filter in ('all', 'ai')
    union all
    select 'attendance', s.session_date, 1::bigint
    from public.attendance_records r
    join public.attendance_sessions s on s.id = r.attendance_session_id
    where s.session_date between from_date and to_date
      and (department_filter is null or exists (
        select 1 from public.profiles p where p.auth_user_id = r.student_id and p.department = department_filter
      ))
      and (semester_filter is null or exists (
        select 1 from public.profiles p where p.auth_user_id = r.student_id and p.semester = semester_filter
      ))
      and module_filter in ('all', 'attendance')
  ), aggregated as (
    select date_trunc('month', observed_on::timestamp)::date as month_start,
      observations.metric_name, sum(observations.amount)::bigint as total
    from observations
    group by 1, 2
  ), selected_metrics as (
    select unnest(case when module_filter = 'all'
      then array['users', 'resources', 'events', 'internships', 'support', 'announcements', 'ai', 'attendance']::text[]
      else array[module_filter] end) as metric_name
  )
  select months.month_start, selected_metrics.metric_name,
    coalesce(aggregated.total, 0)::bigint
  from months cross join selected_metrics
  left join aggregated on aggregated.month_start = months.month_start
    and aggregated.metric_name = selected_metrics.metric_name
  order by months.month_start, selected_metrics.metric_name;
end;
$$;
revoke all on function public.get_phase10_analytics_trend(date, date, text, text, smallint) from public, anon;
grant execute on function public.get_phase10_analytics_trend(date, date, text, text, smallint) to authenticated;

do $$
declare
  cron_configured boolean := false;
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
    and not exists (select 1 from pg_extension where extname = 'pg_cron') then
    create extension pg_cron;
  end if;
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute 'select exists (select 1 from cron.job where jobname = $1)' into cron_configured
      using 'campusconnect-publish-announcements';
    if not cron_configured then
      execute $schedule$select cron.schedule('campusconnect-publish-announcements', '* * * * *', 'select public.publish_due_announcements()')$schedule$;
    end if;
  else
    raise notice 'pg_cron is unavailable; configure scheduled announcement publishing with a trusted server-side scheduler.';
  end if;
exception
  when insufficient_privilege or feature_not_supported then
    raise notice 'pg_cron is installed but could not be configured; configure scheduled announcement publishing manually.';
end;
$$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
    ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

commit;
