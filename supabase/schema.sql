create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('student', 'faculty', 'admin');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  role public.user_role not null default 'student',
  full_name text not null,
  usn text,
  profile_photo text,
  phone text,
  department text,
  semester integer,
  section text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  branch text,
  roll_number text,
  admission_year integer,
  skills text[],
  interests text[],
  github_url text,
  linkedin_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.faculty (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  employee_id text,
  designation text,
  subjects text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  employee_id text,
  permissions text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.faculty enable row level security;
alter table public.admins enable row level security;

drop policy if exists "profiles_view_self" on public.profiles;
create policy "profiles_view_self" on public.profiles
for select using (auth.uid() = auth_user_id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
for update using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);

drop policy if exists "students_view_self" on public.students;
create policy "students_view_self" on public.students
for select using (
  exists (
    select 1 from public.profiles p
    where p.id = profile_id and p.auth_user_id = auth.uid()
  )
);

drop policy if exists "faculty_view_self" on public.faculty;
create policy "faculty_view_self" on public.faculty
for select using (
  exists (
    select 1 from public.profiles p
    where p.id = profile_id and p.auth_user_id = auth.uid()
  )
);

drop policy if exists "admins_view_self" on public.admins;
create policy "admins_view_self" on public.admins
for select using (
  exists (
    select 1 from public.profiles p
    where p.id = profile_id and p.auth_user_id = auth.uid()
  )
);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
for insert with check (auth.uid() = auth_user_id and role = 'student');

drop policy if exists "students_insert_self" on public.students;
create policy "students_insert_self" on public.students
for insert with check (
  exists (
    select 1 from public.profiles p
    where p.id = profile_id and p.auth_user_id = auth.uid()
  )
);

drop policy if exists "faculty_insert_self" on public.faculty;
create policy "faculty_insert_self" on public.faculty
for insert with check (
  exists (
    select 1 from public.profiles p
    where p.id = profile_id and p.auth_user_id = auth.uid() and p.role = 'faculty'
  )
);

drop policy if exists "admins_insert_self" on public.admins;
create policy "admins_insert_self" on public.admins
for insert with check (
  exists (
    select 1 from public.profiles p
    where p.id = profile_id and p.auth_user_id = auth.uid() and p.role = 'admin'
  )
);

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute procedure public.handle_updated_at();

drop trigger if exists students_updated_at on public.students;
create trigger students_updated_at
before update on public.students
for each row execute procedure public.handle_updated_at();

drop trigger if exists faculty_updated_at on public.faculty;
create trigger faculty_updated_at
before update on public.faculty
for each row execute procedure public.handle_updated_at();

drop trigger if exists admins_updated_at on public.admins;
create trigger admins_updated_at
before update on public.admins
for each row execute procedure public.handle_updated_at();

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null,
  short_description text not null,
  category text not null,
  organizer_name text not null,
  organizer_profile_id uuid references public.profiles(id) on delete set null,
  venue text not null,
  event_date date not null,
  start_time time not null,
  end_time time not null,
  registration_deadline timestamptz not null,
  capacity integer not null check (capacity > 0),
  banner_image_url text,
  status text not null default 'draft' check (status in ('draft', 'published', 'registration_closed', 'completed', 'cancelled')),
  is_featured boolean not null default false,
  registration_count integer not null default 0 check (registration_count >= 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

alter table public.events add column if not exists registration_count integer not null default 0;

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  registration_number text not null unique,
  status text not null default 'registered' check (status in ('registered', 'cancelled', 'attended', 'no_show')),
  registered_at timestamptz not null default now(),
  attended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_tickets (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.event_registrations(id) on delete cascade,
  ticket_code text not null unique default encode(gen_random_bytes(16), 'hex'),
  qr_payload text not null unique default encode(gen_random_bytes(32), 'hex'),
  status text not null default 'valid' check (status in ('valid', 'used', 'cancelled')),
  issued_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null check (type in ('event_registration', 'event_reminder', 'event_cancelled', 'event_updated', 'ticket_issued')),
  related_event_id uuid references public.events(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists events_public_schedule_idx on public.events (event_date, start_time) where status = 'published';
create index if not exists event_registrations_profile_idx on public.event_registrations (profile_id, registered_at desc);
create unique index if not exists event_registrations_active_unique_idx on public.event_registrations (event_id, profile_id) where status <> 'cancelled';
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.event_tickets enable row level security;
alter table public.notifications enable row level security;

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.role = 'admin');
$$;

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.role is distinct from old.role
    and auth.uid() is not null
    and not public.is_current_user_admin() then
    raise exception 'Only an administrator can change a profile role.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
before update of role on public.profiles
for each row execute function public.prevent_profile_role_escalation();

create or replace function public.can_manage_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.events e
    where e.id = target_event_id and (e.created_by = auth.uid() or public.is_current_user_admin())
  );
$$;

drop policy if exists events_read_published_or_managed on public.events;
create policy events_read_published_or_managed on public.events
for select using (
  status = 'published'
  or created_by = auth.uid()
  or public.is_current_user_admin()
);

drop policy if exists events_create_managed on public.events;
create policy events_create_managed on public.events
for insert with check (
  created_by = auth.uid()
  and exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.role in ('faculty', 'admin'))
);

drop policy if exists events_update_managed on public.events;
create policy events_update_managed on public.events
for update using (
  created_by = auth.uid()
  or public.is_current_user_admin()
) with check (
  created_by = auth.uid()
  or public.is_current_user_admin()
);

drop policy if exists registrations_read_owner_or_manager on public.event_registrations;
create policy registrations_read_owner_or_manager on public.event_registrations
for select using (
  exists (select 1 from public.profiles p where p.id = profile_id and p.auth_user_id = auth.uid())
  or public.can_manage_event(event_id)
);

drop policy if exists profiles_view_managed_attendees on public.profiles;
create policy profiles_view_managed_attendees on public.profiles
for select using (
  exists (
    select 1 from public.event_registrations r
    where r.profile_id = profiles.id and public.can_manage_event(r.event_id)
  )
);

drop policy if exists tickets_read_owner_or_manager on public.event_tickets;
create policy tickets_read_owner_or_manager on public.event_tickets
for select using (
  exists (
    select 1 from public.event_registrations r
    join public.profiles p on p.id = r.profile_id
    where r.id = registration_id and p.auth_user_id = auth.uid()
  )
  or exists (select 1 from public.event_registrations r where r.id = registration_id and public.can_manage_event(r.event_id))
);

drop policy if exists notifications_read_owner on public.notifications;
create policy notifications_read_owner on public.notifications
for select using (user_id = auth.uid());

drop policy if exists notifications_update_owner on public.notifications;
create policy notifications_update_owner on public.notifications
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.register_for_event(target_event_id uuid)
returns table (registration_id uuid, ticket_id uuid, registration_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile_id uuid;
  target_event public.events%rowtype;
  new_registration_id uuid;
  new_ticket_id uuid;
  new_registration_number text;
begin
  select id into current_profile_id from public.profiles where auth_user_id = auth.uid();
  if current_profile_id is null then
    raise exception 'Complete your profile before registering for events';
  end if;

  select * into target_event from public.events where id = target_event_id for update;
  if not found or target_event.status <> 'published' then
    raise exception 'This event is not open for registration';
  end if;
  if target_event.registration_deadline <= now() then
    raise exception 'Registration for this event is closed';
  end if;
  if (select count(*) from public.event_registrations r where r.event_id = target_event_id and r.status <> 'cancelled') >= target_event.capacity then
    raise exception 'This event has reached capacity';
  end if;
  if exists (select 1 from public.event_registrations r where r.event_id = target_event_id and r.profile_id = current_profile_id and r.status <> 'cancelled') then
    raise exception 'You are already registered for this event';
  end if;

  new_registration_number := 'AIT-' || to_char(current_date, 'YYYY') || '-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 12));
  insert into public.event_registrations (event_id, profile_id, registration_number)
  values (target_event_id, current_profile_id, new_registration_number)
  returning id into new_registration_id;

  insert into public.event_tickets (registration_id)
  values (new_registration_id)
  returning id into new_ticket_id;

  insert into public.notifications (user_id, title, message, type, related_event_id)
  values (auth.uid(), 'Registration confirmed', 'Your place at ' || target_event.title || ' is confirmed.', 'event_registration', target_event_id);

  return query select new_registration_id, new_ticket_id, new_registration_number;
end;
$$;

revoke all on function public.register_for_event(uuid) from public;
grant execute on function public.register_for_event(uuid) to authenticated;

create or replace function public.verify_event_ticket(target_event_id uuid, target_qr_payload text)
returns table (registration_number text, student_name text, student_usn text)
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_ticket public.event_tickets%rowtype;
  matched_registration public.event_registrations%rowtype;
  matched_event public.events%rowtype;
  manager_role public.user_role;
begin
  select p.role into manager_role from public.profiles p where p.auth_user_id = auth.uid();
  select * into matched_event from public.events e where e.id = target_event_id;
  if not found then raise exception 'Event not found'; end if;
  if matched_event.created_by is distinct from auth.uid() and coalesce(manager_role, 'student') <> 'admin' then
    raise exception 'You do not have permission to check in this event';
  end if;

  select t.* into matched_ticket from public.event_tickets t
  join public.event_registrations r on r.id = t.registration_id
  where t.qr_payload = target_qr_payload and r.event_id = target_event_id
  for update of t;
  if not found then raise exception 'Ticket is not valid for this event'; end if;
  if matched_ticket.status <> 'valid' then raise exception 'Ticket has already been used or cancelled'; end if;

  update public.event_tickets set status = 'used', verified_at = now(), verified_by = auth.uid()
  where id = matched_ticket.id;
  update public.event_registrations set status = 'attended', attended_at = now()
  where id = matched_ticket.registration_id
  returning * into matched_registration;

  return query
  select matched_registration.registration_number, p.full_name, p.usn
  from public.profiles p where p.id = matched_registration.profile_id;
end;
$$;

revoke all on function public.verify_event_ticket(uuid, text) from public;
grant execute on function public.verify_event_ticket(uuid, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-banners', 'event-banners', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists event_banners_public_read on storage.objects;
create policy event_banners_public_read on storage.objects
for select using (bucket_id = 'event-banners');

drop policy if exists event_banners_managed_insert on storage.objects;
create policy event_banners_managed_insert on storage.objects
for insert to authenticated with check (
  bucket_id = 'event-banners'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.role in ('faculty', 'admin'))
);

drop policy if exists event_banners_managed_update on storage.objects;
create policy event_banners_managed_update on storage.objects
for update to authenticated using (
  bucket_id = 'event-banners' and owner_id = auth.uid()::text
) with check (
  bucket_id = 'event-banners' and owner_id = auth.uid()::text
);

drop policy if exists event_banners_managed_delete on storage.objects;
create policy event_banners_managed_delete on storage.objects
for delete to authenticated using (
  bucket_id = 'event-banners' and owner_id = auth.uid()::text
);

create or replace function public.handle_event_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at before update on public.events
for each row execute procedure public.handle_event_updated_at();

drop trigger if exists event_registrations_updated_at on public.event_registrations;
create trigger event_registrations_updated_at before update on public.event_registrations
for each row execute procedure public.handle_event_updated_at();

create or replace function public.update_event_registration_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' and new.status <> 'cancelled' then
    update public.events set registration_count = registration_count + 1 where id = new.event_id;
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    if old.status = 'cancelled' and new.status <> 'cancelled' then
      update public.events set registration_count = registration_count + 1 where id = new.event_id;
    elsif old.status <> 'cancelled' and new.status = 'cancelled' then
      update public.events set registration_count = greatest(registration_count - 1, 0) where id = new.event_id;
    end if;
  elsif tg_op = 'DELETE' and old.status <> 'cancelled' then
    update public.events set registration_count = greatest(registration_count - 1, 0) where id = old.event_id;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists event_registrations_count on public.event_registrations;
create trigger event_registrations_count after insert or update of status or delete on public.event_registrations
for each row execute procedure public.update_event_registration_count();

create or replace function public.prevent_profile_role_change()
returns trigger as $$
begin
  if auth.uid() is not null and new.role is distinct from old.role then
    raise exception 'Profile roles can only be changed by a trusted administrator';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change before update on public.profiles
for each row execute procedure public.prevent_profile_role_change();

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  is_demo boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.semesters (
  number smallint primary key check (number between 1 and 8),
  label text not null unique
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  subject_code text not null,
  subject_name text not null,
  branch_id uuid not null references public.branches(id) on delete restrict,
  semester smallint not null references public.semesters(number) on delete restrict,
  description text,
  is_demo boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_code, branch_id, semester)
);

create table if not exists public.resource_types (
  code text primary key,
  label text not null unique,
  is_active boolean not null default true,
  sort_order smallint not null default 0
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  resource_type text not null references public.resource_types(code) on update cascade on delete restrict,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  semester smallint not null references public.semesters(number) on delete restrict,
  section text,
  file_name text not null,
  file_path text not null unique,
  file_url text,
  file_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 26214400),
  thumbnail_url text,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  uploader_role public.user_role not null,
  status text not null default 'pending_review' check (status in ('draft', 'pending_review', 'published', 'rejected', 'archived')),
  visibility text not null default 'students' check (visibility in ('students', 'faculty', 'all')),
  download_count bigint not null default 0 check (download_count >= 0),
  view_count bigint not null default 0 check (view_count >= 0),
  save_count bigint not null default 0 check (save_count >= 0),
  moderation_reason text,
  version text not null default '1.0',
  replaces_resource_id uuid references public.resources(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'rejected' or nullif(trim(moderation_reason), '') is not null)
);

create table if not exists public.resource_bookmarks (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (resource_id, user_id)
);

create table if not exists public.resource_views (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (resource_id, user_id)
);

create table if not exists public.resource_downloads (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  downloaded_at timestamptz not null default now()
);

create table if not exists public.resource_reports (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  reported_by uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('incorrect_content', 'broken_file', 'duplicate', 'inappropriate', 'other')),
  description text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (resource_id, reported_by, reason)
);

create index if not exists resources_discovery_idx on public.resources (status, created_at desc);
create index if not exists resources_subject_idx on public.resources (subject_id, status);
create index if not exists resources_filter_idx on public.resources (branch_id, semester, resource_type, status);
create index if not exists resources_popular_idx on public.resources (view_count desc, download_count desc) where status = 'published';
create index if not exists resource_bookmarks_user_idx on public.resource_bookmarks (user_id, created_at desc);
create index if not exists resource_views_user_idx on public.resource_views (user_id, viewed_at desc);
create index if not exists resource_downloads_recent_idx on public.resource_downloads (downloaded_at desc, resource_id);
create index if not exists resource_reports_status_idx on public.resource_reports (status, created_at desc);

insert into public.semesters (number, label)
select n, 'Semester ' || n from generate_series(1, 8) as n
on conflict (number) do nothing;

insert into public.branches (code, name, is_demo) values
  ('CS-DEMO', 'Computer Science', true),
  ('DS-DEMO', 'Data Science', true),
  ('IS-DEMO', 'Information Science', true),
  ('AIML-DEMO', 'Artificial Intelligence & Machine Learning', true),
  ('EC-DEMO', 'Electronics', true),
  ('ME-DEMO', 'Mechanical', true),
  ('CE-DEMO', 'Civil', true)
on conflict (code) do nothing;

insert into public.resource_types (code, label, sort_order) values
  ('notes', 'Notes', 1),
  ('question_paper', 'Previous Question Papers', 2),
  ('lab_manual', 'Lab Manuals', 3),
  ('assignment', 'Assignments', 4),
  ('presentation', 'Presentations', 5),
  ('study_material', 'Study Materials', 6),
  ('reference_document', 'Reference Documents', 7),
  ('ebook', 'E-books', 8),
  ('syllabus', 'Syllabus', 9),
  ('important_questions', 'Important Questions', 10),
  ('other', 'Other', 11)
on conflict (code) do nothing;

alter table public.branches enable row level security;
alter table public.semesters enable row level security;
alter table public.subjects enable row level security;
alter table public.resource_types enable row level security;
alter table public.resources enable row level security;
alter table public.resource_bookmarks enable row level security;
alter table public.resource_views enable row level security;
alter table public.resource_downloads enable row level security;
alter table public.resource_reports enable row level security;

create or replace function public.can_access_resource(target_resource_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.resources r
    left join public.profiles p on p.auth_user_id = auth.uid()
    where r.id = target_resource_id and (
      r.uploaded_by = auth.uid()
      or public.is_current_user_admin()
      or (r.status = 'published' and (
        r.visibility = 'all'
        or (r.visibility = 'students' and p.role = 'student')
        or (r.visibility = 'faculty' and p.role = 'faculty')
      ))
    )
  );
$$;

create or replace function public.can_access_resource_path(target_path text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.resources r where r.file_path = target_path and public.can_access_resource(r.id));
$$;

create or replace function public.can_manage_resource_path(target_path text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.resources r
    where r.file_path = target_path and (r.uploaded_by = auth.uid() or public.is_current_user_admin())
  );
$$;

revoke all on function public.can_access_resource(uuid) from public;
grant execute on function public.can_access_resource(uuid) to authenticated;
revoke all on function public.can_access_resource_path(text) from public;
grant execute on function public.can_access_resource_path(text) to authenticated;
revoke all on function public.can_manage_resource_path(text) from public;
grant execute on function public.can_manage_resource_path(text) to authenticated;

drop policy if exists profiles_view_resource_uploaders on public.profiles;
create policy profiles_view_resource_uploaders on public.profiles for select using (
  exists (select 1 from public.resources r where r.uploaded_by = profiles.auth_user_id and public.can_access_resource(r.id))
);

create or replace function public.set_resource_subject_dimensions()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  selected_subject public.subjects%rowtype;
begin
  select * into selected_subject from public.subjects where id = new.subject_id;
  if not found then raise exception 'Choose a valid subject'; end if;
  new.branch_id := selected_subject.branch_id;
  new.semester := selected_subject.semester;
  return new;
end;
$$;
drop trigger if exists resources_set_subject_dimensions on public.resources;
create trigger resources_set_subject_dimensions before insert or update of subject_id on public.resources
for each row execute procedure public.set_resource_subject_dimensions();

create or replace function public.validate_resource_file_path()
returns trigger language plpgsql set search_path = public
as $$
begin
  if new.file_path !~ '^resources/[a-z0-9-]+/semester-[1-8]/[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9_-]+\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt|png|jpg|jpeg|webp)$' then
    raise exception 'Invalid academic resource storage path';
  end if;
  return new;
end;
$$;
drop trigger if exists resources_validate_file_path on public.resources;
create trigger resources_validate_file_path before insert or update of file_path on public.resources
for each row execute procedure public.validate_resource_file_path();

drop policy if exists branches_read_active on public.branches;
create policy branches_read_active on public.branches for select using (is_active or public.is_current_user_admin());
drop policy if exists branches_admin_manage on public.branches;
create policy branches_admin_manage on public.branches for all to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());

drop policy if exists semesters_read_all on public.semesters;
create policy semesters_read_all on public.semesters for select using (true);
drop policy if exists semesters_admin_manage on public.semesters;
create policy semesters_admin_manage on public.semesters for all to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());

drop policy if exists subjects_read_active on public.subjects;
create policy subjects_read_active on public.subjects for select using (is_active or public.is_current_user_admin());
drop policy if exists subjects_admin_manage on public.subjects;
create policy subjects_admin_manage on public.subjects for all to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());

drop policy if exists resource_types_read_active on public.resource_types;
create policy resource_types_read_active on public.resource_types for select using (is_active or public.is_current_user_admin());
drop policy if exists resource_types_admin_manage on public.resource_types;
create policy resource_types_admin_manage on public.resource_types for all to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());

drop policy if exists resources_read_authorized on public.resources;
create policy resources_read_authorized on public.resources for select using (public.can_access_resource(id));
drop policy if exists resources_faculty_insert on public.resources;
create policy resources_faculty_insert on public.resources for insert to authenticated with check (
  uploaded_by = auth.uid()
  and uploader_role = 'faculty'
  and status in ('draft', 'pending_review')
  and exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.role = 'faculty')
);
drop policy if exists resources_admin_insert on public.resources;
create policy resources_admin_insert on public.resources for insert to authenticated with check (
  uploaded_by = auth.uid() and uploader_role = 'admin' and public.is_current_user_admin()
);
drop policy if exists resources_owner_update on public.resources;
create policy resources_owner_update on public.resources for update to authenticated using (
  uploaded_by = auth.uid() and exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.role = 'faculty')
) with check (
  uploaded_by = auth.uid() and uploader_role = 'faculty' and status in ('draft', 'pending_review', 'rejected')
);
drop policy if exists resources_admin_update on public.resources;
create policy resources_admin_update on public.resources for update to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());
drop policy if exists resources_admin_delete on public.resources;
create policy resources_admin_delete on public.resources for delete to authenticated using (public.is_current_user_admin());
drop policy if exists resources_owner_delete on public.resources;
create policy resources_owner_delete on public.resources for delete to authenticated using (uploaded_by = auth.uid());

drop policy if exists resource_bookmarks_owner_read on public.resource_bookmarks;
create policy resource_bookmarks_owner_read on public.resource_bookmarks for select to authenticated using (user_id = auth.uid());
drop policy if exists resource_bookmarks_owner_insert on public.resource_bookmarks;
create policy resource_bookmarks_owner_insert on public.resource_bookmarks for insert to authenticated with check (
  user_id = auth.uid() and public.can_access_resource(resource_id)
);
drop policy if exists resource_bookmarks_owner_delete on public.resource_bookmarks;
create policy resource_bookmarks_owner_delete on public.resource_bookmarks for delete to authenticated using (user_id = auth.uid());

drop policy if exists resource_views_owner_read on public.resource_views;
create policy resource_views_owner_read on public.resource_views for select to authenticated using (user_id = auth.uid());
drop policy if exists resource_downloads_admin_read on public.resource_downloads;
create policy resource_downloads_admin_read on public.resource_downloads for select to authenticated using (public.is_current_user_admin());

drop policy if exists resource_reports_owner_read on public.resource_reports;
create policy resource_reports_owner_read on public.resource_reports for select to authenticated using (
  reported_by = auth.uid() or public.is_current_user_admin()
);
drop policy if exists resource_reports_owner_insert on public.resource_reports;
create policy resource_reports_owner_insert on public.resource_reports for insert to authenticated with check (
  reported_by = auth.uid() and public.can_access_resource(resource_id)
);
drop policy if exists resource_reports_admin_update on public.resource_reports;
create policy resource_reports_admin_update on public.resource_reports for update to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());
drop policy if exists resource_reports_admin_delete on public.resource_reports;
create policy resource_reports_admin_delete on public.resource_reports for delete to authenticated using (public.is_current_user_admin());

create or replace function public.guard_resource_counters()
returns trigger language plpgsql set search_path = public
as $$
begin
  if (new.view_count is distinct from old.view_count or new.download_count is distinct from old.download_count or new.save_count is distinct from old.save_count)
    and current_setting('campusconnect.resource_counter_update', true) is distinct from 'on' then
    raise exception 'Resource counters are managed by database functions';
  end if;
  return new;
end;
$$;
drop trigger if exists resources_guard_counters on public.resources;
create trigger resources_guard_counters before update on public.resources for each row execute procedure public.guard_resource_counters();

create or replace function public.update_resource_save_count()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  perform set_config('campusconnect.resource_counter_update', 'on', true);
  if tg_op = 'INSERT' then
    update public.resources set save_count = save_count + 1 where id = new.resource_id;
    return new;
  end if;
  update public.resources set save_count = greatest(save_count - 1, 0) where id = old.resource_id;
  return old;
end;
$$;
drop trigger if exists resource_bookmarks_save_count on public.resource_bookmarks;
create trigger resource_bookmarks_save_count after insert or delete on public.resource_bookmarks for each row execute procedure public.update_resource_save_count();

create or replace function public.record_resource_view(target_resource_id uuid)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  previous_view timestamptz;
begin
  if auth.uid() is null or not public.can_access_resource(target_resource_id) then raise exception 'Resource is unavailable'; end if;
  if not exists (select 1 from public.resources where id = target_resource_id and status = 'published') then raise exception 'Resource is unavailable'; end if;
  perform pg_advisory_xact_lock(hashtext(target_resource_id::text), hashtext(auth.uid()::text));
  select viewed_at into previous_view from public.resource_views where resource_id = target_resource_id and user_id = auth.uid() for update;
  if previous_view is not null and previous_view > now() - interval '30 minutes' then return false; end if;
  insert into public.resource_views (resource_id, user_id, viewed_at)
  values (target_resource_id, auth.uid(), now())
  on conflict (resource_id, user_id) do update set viewed_at = excluded.viewed_at;
  perform set_config('campusconnect.resource_counter_update', 'on', true);
  update public.resources set view_count = view_count + 1 where id = target_resource_id;
  return true;
end;
$$;
revoke all on function public.record_resource_view(uuid) from public;
grant execute on function public.record_resource_view(uuid) to authenticated;

create or replace function public.record_resource_download(target_resource_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or not public.can_access_resource(target_resource_id) then raise exception 'Resource is unavailable'; end if;
  if not exists (select 1 from public.resources where id = target_resource_id and status = 'published') then raise exception 'Resource is unavailable'; end if;
  perform set_config('campusconnect.resource_counter_update', 'on', true);
  update public.resources set download_count = download_count + 1 where id = target_resource_id;
  insert into public.resource_downloads (resource_id, user_id) values (target_resource_id, auth.uid());
end;
$$;
revoke all on function public.record_resource_download(uuid) from public;
grant execute on function public.record_resource_download(uuid) to authenticated;

create or replace function public.get_resource_analytics()
returns table (
  total_resources bigint,
  published_resources bigint,
  pending_resources bigint,
  total_downloads bigint,
  total_views bigint,
  most_downloaded_title text
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_current_user_admin() then raise exception 'Administrator access required'; end if;
  return query select
    count(*)::bigint,
    count(*) filter (where status = 'published')::bigint,
    count(*) filter (where status = 'pending_review')::bigint,
    coalesce(sum(download_count), 0)::bigint,
    coalesce(sum(view_count), 0)::bigint,
    (select title from public.resources order by download_count desc, created_at desc limit 1)
  from public.resources;
end;
$$;
revoke all on function public.get_resource_analytics() from public;
grant execute on function public.get_resource_analytics() to authenticated;

create or replace function public.get_popular_resource_ids(result_limit integer default 6)
returns table (resource_id uuid, activity_count bigint)
language sql stable security definer set search_path = public
as $$
  select r.id,
    (count(distinct v.id) + count(distinct d.id))::bigint as activity_count
  from public.resources r
  left join public.resource_views v on v.resource_id = r.id and v.viewed_at >= now() - interval '7 days'
  left join public.resource_downloads d on d.resource_id = r.id and d.downloaded_at >= now() - interval '7 days'
  where r.status = 'published' and public.can_access_resource(r.id)
  group by r.id
  order by activity_count desc, r.created_at desc
  limit least(greatest(result_limit, 1), 24);
$$;
revoke all on function public.get_popular_resource_ids(integer) from public;
grant execute on function public.get_popular_resource_ids(integer) to anon, authenticated;

create or replace function public.get_subject_resource_counts()
returns table (subject_id uuid, resource_count bigint)
language sql stable security definer set search_path = public
as $$
  select r.subject_id, count(*)::bigint
  from public.resources r
  where r.status = 'published' and public.can_access_resource(r.id)
  group by r.subject_id;
$$;
revoke all on function public.get_subject_resource_counts() from public;
grant execute on function public.get_subject_resource_counts() to anon, authenticated;

create or replace function public.handle_resource_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists resources_updated_at on public.resources;
create trigger resources_updated_at before update on public.resources for each row execute procedure public.handle_resource_updated_at();
drop trigger if exists subjects_updated_at on public.subjects;
create trigger subjects_updated_at before update on public.subjects for each row execute procedure public.handle_resource_updated_at();
drop trigger if exists branches_updated_at on public.branches;
create trigger branches_updated_at before update on public.branches for each row execute procedure public.handle_resource_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('academic-resources', 'academic-resources', false, 26214400, array[
  'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain',
  'image/png', 'image/jpeg', 'image/webp'
])
on conflict (id) do update set public = false, file_size_limit = 26214400, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists academic_resources_read_authorized on storage.objects;
create policy academic_resources_read_authorized on storage.objects for select to authenticated using (
  bucket_id = 'academic-resources' and public.can_access_resource_path(name)
);
drop policy if exists academic_resources_faculty_insert on storage.objects;
create policy academic_resources_faculty_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'academic-resources'
  and exists (select 1 from public.resources r join public.profiles p on p.auth_user_id = auth.uid()
    where r.file_path = name and r.uploaded_by = auth.uid() and p.role = 'faculty' and r.status in ('draft', 'pending_review'))
);
drop policy if exists academic_resources_admin_insert on storage.objects;
create policy academic_resources_admin_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'academic-resources' and public.is_current_user_admin()
  and exists (select 1 from public.resources r where r.file_path = name and r.uploaded_by = auth.uid())
);
drop policy if exists academic_resources_owner_update on storage.objects;
create policy academic_resources_owner_update on storage.objects for update to authenticated using (
  bucket_id = 'academic-resources' and public.can_manage_resource_path(name)
) with check (bucket_id = 'academic-resources' and public.can_manage_resource_path(name));
drop policy if exists academic_resources_owner_delete on storage.objects;
create policy academic_resources_owner_delete on storage.objects for delete to authenticated using (
  bucket_id = 'academic-resources' and public.can_manage_resource_path(name)
);

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
  description text not null, category text not null, logo_url text, cover_image_url text,
  faculty_coordinator_id uuid references auth.users(id) on delete set null,
  student_lead_id uuid references auth.users(id) on delete set null,
  contact_email text, meeting_schedule text, location text,
  created_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending_approval' check (status in ('draft','pending_approval','active','suspended','archived')),
  is_demo boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.club_members (
  id uuid primary key default gen_random_uuid(), club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member','coordinator','president','vice_president','secretary','faculty_coordinator')),
  status text not null default 'pending' check (status in ('pending','active','rejected','removed')),
  joined_at timestamptz not null default now(), unique (club_id,user_id)
);
create table if not exists public.club_activities (
  id uuid primary key default gen_random_uuid(), club_id uuid not null references public.clubs(id) on delete cascade,
  title text not null, description text not null, activity_type text not null,
  start_time timestamptz not null, end_time timestamptz, location text, image_url text,
  created_by uuid not null references auth.users(id) on delete restrict, status text not null default 'published', created_at timestamptz not null default now()
);
create table if not exists public.club_posts (
  id uuid primary key default gen_random_uuid(), club_id uuid not null references public.clubs(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade, title text not null, content text not null,
  image_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.club_post_comments (
  id uuid primary key default gen_random_uuid(), post_id uuid not null references public.club_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade, content text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.project_teams (
  id uuid primary key default gen_random_uuid(), name text not null, description text not null, project_title text not null,
  project_domain text not null, owner_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'forming' check (status in ('forming','active','completed','archived')),
  visibility text not null default 'private' check (visibility in ('private','campus','invite_only')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.project_team_members (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.project_teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, role text not null default 'member' check (role in ('owner','leader','member')),
  joined_at timestamptz not null default now(), status text not null default 'active' check (status in ('invited','active','removed')), unique (team_id,user_id)
);
create table if not exists public.project_team_tasks (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.project_teams(id) on delete cascade,
  title text not null, description text not null, assigned_to uuid references auth.users(id) on delete set null,
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status text not null default 'todo' check (status in ('todo','in_progress','review','completed')),
  due_date date, created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(), type text not null check (type in ('direct','club','project_team','group')),
  name text, description text, avatar_url text, club_id uuid references public.clubs(id) on delete cascade,
  project_team_id uuid references public.project_teams(id) on delete cascade, created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.conversation_members (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, role text not null default 'member' check (role in ('member','moderator','admin')),
  joined_at timestamptz not null default now(), last_read_at timestamptz, muted boolean not null default false,
  status text not null default 'active' check (status in ('active','left','removed')), unique (conversation_id,user_id)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade, content text not null default '', message_type text not null default 'text' check (message_type in ('text','image','file','system')),
  reply_to_id uuid references public.messages(id) on delete set null, attachment_url text, attachment_name text, attachment_type text, attachment_size bigint,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(), message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, reaction text not null, created_at timestamptz not null default now(), unique(message_id,user_id,reaction)
);
create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(), message_id uuid not null references public.messages(id) on delete cascade,
  reported_by uuid not null references auth.users(id) on delete cascade, reason text not null, description text,
  status text not null default 'pending' check (status in ('pending','reviewing','resolved','dismissed')),
  reviewed_by uuid references auth.users(id) on delete set null, reviewed_at timestamptz, created_at timestamptz not null default now()
);

create index if not exists club_members_lookup on public.club_members (club_id,status,user_id);
create index if not exists club_activity_lookup on public.club_activities (club_id,start_time desc);
create index if not exists team_members_lookup on public.project_team_members (team_id,status,user_id);
create index if not exists task_lookup on public.project_team_tasks (team_id,status,due_date);
create index if not exists conversation_members_lookup on public.conversation_members (conversation_id,status,user_id);
create index if not exists message_lookup on public.messages (conversation_id,created_at desc,sender_id);
create index if not exists report_lookup on public.message_reports (status,created_at desc);

alter table public.clubs enable row level security; alter table public.club_members enable row level security;
alter table public.club_activities enable row level security; alter table public.club_posts enable row level security; alter table public.club_post_comments enable row level security;
alter table public.project_teams enable row level security; alter table public.project_team_members enable row level security; alter table public.project_team_tasks enable row level security;
alter table public.conversations enable row level security; alter table public.conversation_members enable row level security; alter table public.messages enable row level security; alter table public.message_reactions enable row level security; alter table public.message_reports enable row level security;

create or replace function public.is_club_member(target_club_id uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.club_members where club_id=target_club_id and user_id=auth.uid() and status='active'); $$;
create or replace function public.is_team_member(target_team_id uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.project_team_members where team_id=target_team_id and user_id=auth.uid() and status='active'); $$;
create or replace function public.is_conversation_member(target_conversation_id uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.conversation_members where conversation_id=target_conversation_id and user_id=auth.uid() and status='active'); $$;
revoke all on function public.is_club_member(uuid) from public; grant execute on function public.is_club_member(uuid) to authenticated;
revoke all on function public.is_team_member(uuid) from public; grant execute on function public.is_team_member(uuid) to authenticated;
revoke all on function public.is_conversation_member(uuid) from public; grant execute on function public.is_conversation_member(uuid) to authenticated;

drop policy if exists clubs_discovery on public.clubs; create policy clubs_discovery on public.clubs for select using (status='active' or public.is_current_user_admin() or faculty_coordinator_id=auth.uid() or student_lead_id=auth.uid() or public.is_club_member(id));
drop policy if exists clubs_admin_insert on public.clubs; create policy clubs_admin_insert on public.clubs for insert to authenticated with check (created_by=auth.uid() or public.is_current_user_admin());
drop policy if exists clubs_manager_update on public.clubs; create policy clubs_manager_update on public.clubs for update to authenticated using (public.is_current_user_admin() or faculty_coordinator_id=auth.uid() or student_lead_id=auth.uid()) with check (public.is_current_user_admin() or faculty_coordinator_id=auth.uid() or student_lead_id=auth.uid());
drop policy if exists club_members_access on public.club_members; create policy club_members_access on public.club_members for select using (user_id=auth.uid() or public.is_club_member(club_id) or public.is_current_user_admin());
drop policy if exists club_members_self_join on public.club_members; create policy club_members_self_join on public.club_members for insert to authenticated with check (user_id=auth.uid() and role='member' and status='pending');
drop policy if exists club_members_manager_update on public.club_members; create policy club_members_manager_update on public.club_members for update to authenticated using (public.is_current_user_admin() or exists(select 1 from public.club_members m where m.club_id=club_members.club_id and m.user_id=auth.uid() and m.status='active' and m.role in ('coordinator','president','faculty_coordinator'))) with check (public.is_current_user_admin() or user_id=club_members.user_id);
drop policy if exists club_members_self_leave on public.club_members; create policy club_members_self_leave on public.club_members for delete to authenticated using (user_id=auth.uid() or public.is_current_user_admin());
drop policy if exists club_content_member_read on public.club_activities; create policy club_content_member_read on public.club_activities for select using (public.is_club_member(club_id) or public.is_current_user_admin() or status='published');
drop policy if exists club_content_manager_write on public.club_activities; create policy club_content_manager_write on public.club_activities for all to authenticated using (public.is_current_user_admin() or public.is_club_member(club_id)) with check (created_by=auth.uid() and (public.is_current_user_admin() or public.is_club_member(club_id)));
drop policy if exists club_posts_member_access on public.club_posts; create policy club_posts_member_access on public.club_posts for all to authenticated using (public.is_club_member(club_id) or public.is_current_user_admin()) with check (author_id=auth.uid() and (public.is_club_member(club_id) or public.is_current_user_admin()));
drop policy if exists club_comments_member_access on public.club_post_comments; create policy club_comments_member_access on public.club_post_comments for all to authenticated using (exists(select 1 from public.club_posts p where p.id=post_id and (public.is_club_member(p.club_id) or public.is_current_user_admin()))) with check (author_id=auth.uid());

drop policy if exists teams_discovery on public.project_teams; create policy teams_discovery on public.project_teams for select using (visibility='campus' or owner_id=auth.uid() or public.is_team_member(id) or public.is_current_user_admin());
drop policy if exists teams_owner_insert on public.project_teams; create policy teams_owner_insert on public.project_teams for insert to authenticated with check (owner_id=auth.uid());
drop policy if exists teams_owner_update on public.project_teams; create policy teams_owner_update on public.project_teams for update to authenticated using (owner_id=auth.uid() or public.is_current_user_admin()) with check (owner_id=auth.uid() or public.is_current_user_admin());
drop policy if exists team_members_access on public.project_team_members; create policy team_members_access on public.project_team_members for select using (user_id=auth.uid() or public.is_team_member(team_id) or public.is_current_user_admin());
drop policy if exists team_members_owner_manage on public.project_team_members; create policy team_members_owner_manage on public.project_team_members for all to authenticated using (exists(select 1 from public.project_teams t where t.id=team_id and (t.owner_id=auth.uid() or public.is_current_user_admin()))) with check (exists(select 1 from public.project_teams t where t.id=team_id and (t.owner_id=auth.uid() or public.is_current_user_admin())) and role <> 'owner');
drop policy if exists team_tasks_member_access on public.project_team_tasks; create policy team_tasks_member_access on public.project_team_tasks for all to authenticated using (public.is_team_member(team_id) or public.is_current_user_admin()) with check (created_by=auth.uid() and (public.is_team_member(team_id) or public.is_current_user_admin()));

drop policy if exists conversations_member_access on public.conversations; create policy conversations_member_access on public.conversations for select using (public.is_conversation_member(id) or created_by=auth.uid() or public.is_current_user_admin());
drop policy if exists conversations_member_insert on public.conversations; create policy conversations_member_insert on public.conversations for insert to authenticated with check (
  created_by=auth.uid() and (
    public.is_current_user_admin()
    or (club_id is not null and public.is_club_member(club_id))
    or (project_team_id is not null and public.is_team_member(project_team_id))
    or type='direct'
  )
);
drop policy if exists conversation_members_self_access on public.conversation_members; create policy conversation_members_self_access on public.conversation_members for select using (user_id=auth.uid() or public.is_conversation_member(conversation_id) or public.is_current_user_admin());
drop policy if exists conversation_members_owner_manage on public.conversation_members; create policy conversation_members_owner_manage on public.conversation_members for all to authenticated using (exists(select 1 from public.conversations c where c.id=conversation_id and (c.created_by=auth.uid() or public.is_current_user_admin()))) with check (exists(select 1 from public.conversations c where c.id=conversation_id and (c.created_by=auth.uid() or public.is_current_user_admin())) and role <> 'admin');
drop policy if exists messages_member_access on public.messages; create policy messages_member_access on public.messages for select using (public.is_conversation_member(conversation_id) or public.is_current_user_admin());
drop policy if exists messages_member_send on public.messages; create policy messages_member_send on public.messages for insert to authenticated with check (sender_id=auth.uid() and public.is_conversation_member(conversation_id));
drop policy if exists messages_owner_moderate on public.messages; create policy messages_owner_moderate on public.messages for update using (sender_id=auth.uid() or public.is_current_user_admin()) with check (sender_id=auth.uid() or public.is_current_user_admin());
drop policy if exists reactions_member_access on public.message_reactions; create policy reactions_member_access on public.message_reactions for all to authenticated using (exists(select 1 from public.messages m where m.id=message_id and public.is_conversation_member(m.conversation_id))) with check (user_id=auth.uid());
drop policy if exists reports_owner_admin_access on public.message_reports; create policy reports_owner_admin_access on public.message_reports for all to authenticated using (reported_by=auth.uid() or public.is_current_user_admin()) with check (reported_by=auth.uid() or public.is_current_user_admin());

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('chat-attachments','chat-attachments',false,10485760,array['image/png','image/jpeg','image/webp','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','text/plain','application/zip']) on conflict (id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists chat_attachment_member_read on storage.objects; create policy chat_attachment_member_read on storage.objects for select to authenticated using (bucket_id='chat-attachments' and public.is_conversation_member((storage.foldername(name))[1]::uuid));
drop policy if exists chat_attachment_member_insert on storage.objects; create policy chat_attachment_member_insert on storage.objects for insert to authenticated with check (bucket_id='chat-attachments' and public.is_conversation_member((storage.foldername(name))[1]::uuid) and (storage.extension(name) in ('png','jpg','jpeg','webp','pdf','doc','docx','ppt','pptx','txt','zip')));
drop policy if exists chat_attachment_owner_delete on storage.objects; create policy chat_attachment_owner_delete on storage.objects for delete to authenticated using (bucket_id='chat-attachments' and owner_id=auth.uid()::text);

drop policy if exists realtime_conversation_member_select on realtime.messages;
create policy realtime_conversation_member_select on realtime.messages for select to authenticated using (public.is_conversation_member((split_part(realtime.topic(),'conversation:',2))::uuid));
drop policy if exists realtime_conversation_member_insert on realtime.messages;
create policy realtime_conversation_member_insert on realtime.messages for insert to authenticated with check (public.is_conversation_member((split_part(realtime.topic(),'conversation:',2))::uuid));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
    ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  logo_url text,
  website_url text check (website_url is null or website_url ~ '^https://'),
  description text,
  industry text,
  location text,
  is_demo boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.internships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  role_title text not null,
  description text not null,
  short_description text not null,
  location text not null,
  work_mode text not null check (work_mode in ('remote', 'hybrid', 'on_site')),
  internship_type text not null check (internship_type in ('full_time', 'part_time', 'summer', 'winter', 'academic', 'research')),
  duration text not null,
  duration_months numeric(5,2) not null check (duration_months > 0),
  stipend numeric(12,2) check (stipend is null or stipend >= 0),
  stipend_currency text not null default 'INR',
  is_paid boolean not null default false,
  skills text[] not null default '{}',
  eligibility text,
  branch_id uuid references public.branches(id) on delete set null,
  minimum_semester smallint references public.semesters(number) on delete set null,
  maximum_semester smallint references public.semesters(number) on delete set null,
  application_url text check (application_url is null or application_url ~ '^https://'),
  official_source_url text check (official_source_url is null or official_source_url ~ '^https://'),
  application_deadline timestamptz,
  start_date date,
  end_date date,
  status text not null default 'pending_review' check (status in ('draft', 'pending_review', 'published', 'rejected', 'closed', 'archived')),
  source_type text not null default 'faculty_added' check (source_type in ('admin_added', 'faculty_added', 'external_opportunity')),
  moderation_reason text,
  is_demo boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (minimum_semester is null or maximum_semester is null or minimum_semester <= maximum_semester),
  check (start_date is null or end_date is null or start_date <= end_date),
  check (moderation_reason is null or length(moderation_reason) <= 500)
);

create table if not exists public.internship_applications (
  id uuid primary key default gen_random_uuid(),
  internship_id uuid not null references public.internships(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  applied_at timestamptz,
  status text not null default 'saved' check (status in ('saved', 'applied', 'shortlisted', 'interview', 'offer', 'selected', 'rejected', 'withdrawn')),
  notes text,
  interview_date timestamptz,
  interview_type text check (interview_type is null or interview_type in ('online', 'phone', 'in_person', 'technical', 'hr', 'other')),
  interview_notes text,
  offer_date date,
  offer_start_date date,
  offer_duration text,
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (internship_id, student_id)
);

create table if not exists public.internship_bookmarks (
  id uuid primary key default gen_random_uuid(),
  internship_id uuid not null references public.internships(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (internship_id, student_id)
);

create table if not exists public.career_profiles (
  student_id uuid primary key references auth.users(id) on delete cascade,
  career_goal text,
  github_url text check (github_url is null or github_url ~ '^https://'),
  linkedin_url text check (linkedin_url is null or linkedin_url ~ '^https://'),
  portfolio_url text check (portfolio_url is null or portfolio_url ~ '^https://'),
  resume_path text unique,
  resume_file_name text,
  updated_at timestamptz not null default now()
);

create table if not exists public.student_skills (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  skill_name text not null check (length(trim(skill_name)) between 1 and 60),
  skill_level text not null default 'beginner' check (skill_level in ('beginner', 'intermediate', 'advanced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, skill_name)
);

create table if not exists public.career_preferences (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references auth.users(id) on delete cascade,
  target_role text,
  preferred_industries text[] not null default '{}',
  preferred_locations text[] not null default '{}',
  preferred_work_modes text[] not null default '{}',
  preferred_internship_types text[] not null default '{}',
  preferred_branches uuid[] not null default '{}',
  expected_duration text,
  interests text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (preferred_work_modes <@ array['remote', 'hybrid', 'on_site']::text[]),
  check (preferred_internship_types <@ array['full_time', 'part_time', 'summer', 'winter', 'academic', 'research']::text[])
);

create index if not exists internships_discovery_idx on public.internships (status, application_deadline, created_at desc);
create index if not exists internships_company_idx on public.internships (company_id, status);
create index if not exists internships_filters_idx on public.internships (work_mode, internship_type, branch_id, minimum_semester, maximum_semester, is_paid);
create index if not exists internship_applications_student_idx on public.internship_applications (student_id, updated_at desc);
create index if not exists internship_bookmarks_student_idx on public.internship_bookmarks (student_id, created_at desc);
create unique index if not exists internships_demo_record_unique_idx on public.internships (company_id, role_title) where is_demo;

alter table public.companies enable row level security;
alter table public.internships enable row level security;
alter table public.internship_applications enable row level security;
alter table public.internship_bookmarks enable row level security;
alter table public.career_profiles enable row level security;
alter table public.student_skills enable row level security;
alter table public.career_preferences enable row level security;

create or replace function public.can_view_internship(target_internship_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.internships i join public.companies c on c.id = i.company_id
    where i.id = target_internship_id and (
      i.created_by = auth.uid()
      or public.is_current_user_admin()
      or exists (select 1 from public.internship_applications a where a.internship_id = i.id and a.student_id = auth.uid())
      or (i.status = 'published' and c.is_active)
    )
  );
$$;
revoke all on function public.can_view_internship(uuid) from public;
grant execute on function public.can_view_internship(uuid) to authenticated;

drop policy if exists companies_public_view on public.companies;
create policy companies_public_view on public.companies for select using (
  is_active and exists (select 1 from public.internships i where i.company_id = companies.id and i.status = 'published')
  or public.is_current_user_admin()
  or (is_active and exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.role = 'faculty'))
  or exists (select 1 from public.internship_applications a join public.internships i on i.id = a.internship_id where a.student_id = auth.uid() and i.company_id = companies.id)
  or exists (select 1 from public.internships i where i.company_id = companies.id and i.created_by = auth.uid())
);
drop policy if exists companies_admin_manage on public.companies;
create policy companies_admin_manage on public.companies for all to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());

drop policy if exists internships_authorized_read on public.internships;
create policy internships_authorized_read on public.internships for select using (public.can_view_internship(id));
drop policy if exists internships_faculty_insert on public.internships;
create policy internships_faculty_insert on public.internships for insert to authenticated with check (
  created_by = auth.uid() and status in ('draft', 'pending_review') and not is_demo
  and exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.role = 'faculty')
);
drop policy if exists internships_admin_insert on public.internships;
create policy internships_admin_insert on public.internships for insert to authenticated with check (
  created_by = auth.uid() and public.is_current_user_admin()
);
drop policy if exists internships_faculty_update_own on public.internships;
create policy internships_faculty_update_own on public.internships for update to authenticated using (
  created_by = auth.uid() and exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.role = 'faculty')
) with check (created_by = auth.uid() and status in ('draft', 'pending_review'));
drop policy if exists internships_admin_update on public.internships;
create policy internships_admin_update on public.internships for update to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());
drop policy if exists internships_owner_delete on public.internships;
create policy internships_owner_delete on public.internships for delete to authenticated using (
  public.is_current_user_admin() or (created_by = auth.uid() and status in ('draft', 'rejected'))
);

drop policy if exists internship_applications_owner_manage on public.internship_applications;
create policy internship_applications_owner_manage on public.internship_applications for all to authenticated using (student_id = auth.uid()) with check (
  student_id = auth.uid() and exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.role = 'student')
);
drop policy if exists internship_bookmarks_owner_manage on public.internship_bookmarks;
create policy internship_bookmarks_owner_manage on public.internship_bookmarks for all to authenticated using (student_id = auth.uid()) with check (
  student_id = auth.uid() and exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.role = 'student')
  and public.can_view_internship(internship_id)
);

create or replace function public.toggle_internship_save(target_internship_id uuid)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  was_saved boolean;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.role = 'student') then
    raise exception 'Student sign-in required';
  end if;
  if not exists (select 1 from public.internships i where i.id = target_internship_id and i.status = 'published') then
    raise exception 'Opportunity is not available';
  end if;
  perform pg_advisory_xact_lock(hashtext(target_internship_id::text), hashtext(auth.uid()::text));
  select exists (select 1 from public.internship_bookmarks b where b.internship_id = target_internship_id and b.student_id = auth.uid()) into was_saved;
  if was_saved then
    delete from public.internship_bookmarks where internship_id = target_internship_id and student_id = auth.uid();
    delete from public.internship_applications where internship_id = target_internship_id and student_id = auth.uid() and status = 'saved';
    return false;
  end if;
  insert into public.internship_bookmarks (internship_id, student_id) values (target_internship_id, auth.uid());
  insert into public.internship_applications (internship_id, student_id, status)
  values (target_internship_id, auth.uid(), 'saved') on conflict (internship_id, student_id) do nothing;
  return true;
end;
$$;
revoke all on function public.toggle_internship_save(uuid) from public;
grant execute on function public.toggle_internship_save(uuid) to authenticated;

drop policy if exists career_profiles_owner_manage on public.career_profiles;
create policy career_profiles_owner_manage on public.career_profiles for all to authenticated using (student_id = auth.uid()) with check (
  student_id = auth.uid() and exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.role = 'student')
);
drop policy if exists student_skills_owner_manage on public.student_skills;
create policy student_skills_owner_manage on public.student_skills for all to authenticated using (student_id = auth.uid()) with check (
  student_id = auth.uid() and exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.role = 'student')
);
drop policy if exists career_preferences_owner_manage on public.career_preferences;
create policy career_preferences_owner_manage on public.career_preferences for all to authenticated using (student_id = auth.uid()) with check (
  student_id = auth.uid() and exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.role = 'student')
);

create or replace function public.get_career_analytics()
returns table (total_opportunities bigint, published_opportunities bigint, pending_review bigint, closed_opportunities bigint, total_applications bigint, interviews bigint, selected_students bigint)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_current_user_admin() then raise exception 'Administrator access required'; end if;
  return query select
    (select count(*) from public.internships),
    (select count(*) from public.internships where status = 'published'),
    (select count(*) from public.internships where status = 'pending_review'),
    (select count(*) from public.internships where status = 'closed'),
    (select count(*) from public.internship_applications),
    (select count(*) from public.internship_applications where status = 'interview'),
    (select count(*) from public.internship_applications where status = 'selected');
end;
$$;
revoke all on function public.get_career_analytics() from public;
grant execute on function public.get_career_analytics() to authenticated;

create or replace function public.get_career_chart_data()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_current_user_admin() then raise exception 'Administrator access required'; end if;
  select jsonb_build_object(
    'applications_by_month', coalesce((
      select jsonb_agg(jsonb_build_object('month', month_key, 'count', application_count) order by month_key)
      from (
        select to_char(date_trunc('month', created_at), 'YYYY-MM') as month_key, count(*)::bigint as application_count
        from public.internship_applications where created_at >= now() - interval '6 months'
        group by date_trunc('month', created_at)
      ) monthly
    ), '[]'::jsonb),
    'internships_by_work_mode', coalesce((
      select jsonb_agg(jsonb_build_object('label', work_mode, 'count', mode_count) order by work_mode)
      from (select work_mode, count(*)::bigint as mode_count from public.internships group by work_mode) modes
    ), '[]'::jsonb),
    'internships_by_type', coalesce((
      select jsonb_agg(jsonb_build_object('label', internship_type, 'count', type_count) order by internship_type)
      from (select internship_type, count(*)::bigint as type_count from public.internships group by internship_type) types
    ), '[]'::jsonb),
    'application_pipeline', coalesce((
      select jsonb_agg(jsonb_build_object('label', status, 'count', status_count) order by status)
      from (select status, count(*)::bigint as status_count from public.internship_applications group by status) pipeline
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.get_career_chart_data() from public;
grant execute on function public.get_career_chart_data() to authenticated;

create or replace function public.handle_career_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists companies_updated_at on public.companies;
create trigger companies_updated_at before update on public.companies for each row execute procedure public.handle_career_updated_at();
drop trigger if exists internships_updated_at on public.internships;
create trigger internships_updated_at before update on public.internships for each row execute procedure public.handle_career_updated_at();
drop trigger if exists internship_applications_updated_at on public.internship_applications;
create trigger internship_applications_updated_at before update on public.internship_applications for each row execute procedure public.handle_career_updated_at();
drop trigger if exists career_profiles_updated_at on public.career_profiles;
create trigger career_profiles_updated_at before update on public.career_profiles for each row execute procedure public.handle_career_updated_at();
drop trigger if exists student_skills_updated_at on public.student_skills;
create trigger student_skills_updated_at before update on public.student_skills for each row execute procedure public.handle_career_updated_at();
drop trigger if exists career_preferences_updated_at on public.career_preferences;
create trigger career_preferences_updated_at before update on public.career_preferences for each row execute procedure public.handle_career_updated_at();

create or replace function public.require_verified_internship_details()
returns trigger language plpgsql set search_path = public
as $$
begin
  if new.status = 'published' and not new.is_demo and (
    new.application_url is null or new.official_source_url is null or new.application_deadline is null or new.eligibility is null
  ) then
    raise exception 'Verified opportunities require an official source, application URL, deadline, and eligibility details';
  end if;
  return new;
end;
$$;
drop trigger if exists internships_require_verified_details on public.internships;
create trigger internships_require_verified_details before insert or update on public.internships
for each row execute procedure public.require_verified_internship_details();

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'event_registration', 'event_reminder', 'event_cancelled', 'event_updated', 'ticket_issued',
  'internship_deadline', 'application_updated', 'interview_reminder', 'internship_published'
));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('student-resumes', 'student-resumes', false, 10485760, array[
  'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists student_resumes_owner_select on storage.objects;
create policy student_resumes_owner_select on storage.objects for select to authenticated using (
  bucket_id = 'student-resumes' and (storage.foldername(name))[1] = auth.uid()::text
);
drop policy if exists student_resumes_owner_insert on storage.objects;
create policy student_resumes_owner_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'student-resumes' and (storage.foldername(name))[1] = auth.uid()::text
  and exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.role = 'student')
);
drop policy if exists student_resumes_owner_update on storage.objects;
create policy student_resumes_owner_update on storage.objects for update to authenticated using (
  bucket_id = 'student-resumes' and (storage.foldername(name))[1] = auth.uid()::text
) with check (bucket_id = 'student-resumes' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists student_resumes_owner_delete on storage.objects;
create policy student_resumes_owner_delete on storage.objects for delete to authenticated using (
  bucket_id = 'student-resumes' and (storage.foldername(name))[1] = auth.uid()::text
);
