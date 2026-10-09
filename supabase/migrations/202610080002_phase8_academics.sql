alter table public.subjects
  add column if not exists credits smallint not null default 3 check (credits between 0 and 30),
  add column if not exists subject_type text not null default 'theory'
    check (subject_type in ('theory', 'practical', 'elective', 'project', 'seminar', 'other')),
  add column if not exists department text;

create table if not exists public.academic_periods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 80),
  start_date date not null,
  end_date date not null,
  semester smallint references public.semesters(number) on delete restrict,
  status text not null default 'upcoming' check (status in ('upcoming', 'active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  check (start_date <= end_date)
);
create unique index if not exists academic_periods_single_active_per_semester_idx
  on public.academic_periods (coalesce(semester, 0)) where status = 'active';
create table if not exists public.academic_sections (
  id uuid primary key default gen_random_uuid(),
  department text not null check (length(trim(department)) between 1 and 120),
  semester smallint not null references public.semesters(number) on delete restrict,
  section_name text not null check (length(trim(section_name)) between 1 and 40),
  academic_period_id uuid not null references public.academic_periods(id) on delete restrict,
  academic_year text not null default '' check (length(academic_year) <= 24),
  capacity integer check (capacity is null or capacity between 1 and 500),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  unique (department, semester, section_name, academic_period_id)
);

create table if not exists public.student_subjects (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  academic_period_id uuid not null references public.academic_periods(id) on delete restrict,
  academic_year text not null check (length(trim(academic_year)) between 1 and 24),
  semester smallint not null references public.semesters(number) on delete restrict,
  section text not null check (length(trim(section)) between 1 and 40),
  enrollment_status text not null default 'active' check (enrollment_status in ('active', 'completed', 'dropped')),
  enrolled_at timestamptz not null default now()
);
create unique index if not exists student_subjects_active_unique_idx
  on public.student_subjects (student_id, subject_id, academic_period_id) where enrollment_status = 'active';
create index if not exists student_subjects_period_section_idx
  on public.student_subjects (academic_period_id, semester, section, student_id) where enrollment_status = 'active';

create or replace function public.check_student_subject_capacity()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  section_capacity integer;
  section_department text;
  enrolled_count integer;
begin
  if new.enrollment_status <> 'active' then return new; end if;
  select ac.capacity, ac.department into section_capacity, section_department from public.academic_sections ac
  where ac.academic_period_id = new.academic_period_id and ac.semester = new.semester
    and ac.section_name = new.section and ac.status = 'active'
    and exists (
      select 1 from public.subjects s join public.branches b on b.id = s.branch_id
      where s.id = new.subject_id and s.semester = new.semester and b.name = ac.department
    );
  if not found then raise exception 'No active academic section exists for this subject'; end if;
  if section_capacity is null then return new; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    new.academic_period_id::text || ':' || section_department || ':' || new.semester::text || ':' || new.section, 0));
  select pg_catalog.count(distinct ss.student_id)::integer into enrolled_count
  from public.student_subjects ss
  join public.subjects s on s.id = ss.subject_id
  join public.branches b on b.id = s.branch_id
  where ss.academic_period_id = new.academic_period_id and ss.semester = new.semester
    and ss.section = new.section and ss.enrollment_status = 'active'
    and b.name = section_department
    and ss.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);
  if enrolled_count >= section_capacity then raise exception 'Academic section is at capacity'; end if;
  return new;
end;
$$;
drop trigger if exists student_subject_capacity_guard on public.student_subjects;
create trigger student_subject_capacity_guard before insert or update on public.student_subjects
for each row execute function public.check_student_subject_capacity();
revoke all on function public.check_student_subject_capacity() from public, anon, authenticated;

create table if not exists public.faculty_subjects (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  academic_period_id uuid not null references public.academic_periods(id) on delete restrict,
  academic_year text not null check (length(trim(academic_year)) between 1 and 24),
  semester smallint not null references public.semesters(number) on delete restrict,
  section text not null check (length(trim(section)) between 1 and 40),
  assigned_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  unique (faculty_id, subject_id, academic_period_id, section)
);
create index if not exists faculty_subjects_period_section_idx
  on public.faculty_subjects (academic_period_id, semester, section, faculty_id) where status = 'active';

create or replace function public.check_faculty_subject_assignment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  subject_semester smallint;
  period_semester smallint;
  subject_department text;
begin
  if new.status <> 'active' then return new; end if;
  select s.semester, b.name into subject_semester, subject_department
  from public.subjects s join public.branches b on b.id = s.branch_id
  where s.id = new.subject_id and s.is_active;
  if not found or subject_semester <> new.semester then
    raise exception 'Faculty assignment must match an active subject and its semester';
  end if;
  select ap.semester into period_semester from public.academic_periods ap where ap.id = new.academic_period_id;
  if not found or (period_semester is not null and period_semester <> new.semester) then
    raise exception 'Faculty assignment must match the academic period semester';
  end if;
  if not exists (select 1 from public.profiles p where p.auth_user_id = new.faculty_id and p.role = 'faculty') then
    raise exception 'Teaching assignments must reference a faculty account';
  end if;
  if not exists (select 1 from public.academic_sections ac where ac.department = subject_department
      and ac.semester = new.semester and ac.section_name = new.section
      and ac.academic_period_id = new.academic_period_id and ac.status = 'active') then
    raise exception 'Create an active matching academic section before assigning faculty';
  end if;
  return new;
end;
$$;
drop trigger if exists faculty_subject_assignment_guard on public.faculty_subjects;
create trigger faculty_subject_assignment_guard before insert or update on public.faculty_subjects
for each row execute function public.check_faculty_subject_assignment();
revoke all on function public.check_faculty_subject_assignment() from public, anon, authenticated;

create table if not exists public.timetable_entries (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete restrict,
  faculty_id uuid not null references auth.users(id) on delete restrict,
  academic_period_id uuid not null references public.academic_periods(id) on delete restrict,
  academic_year text not null check (length(trim(academic_year)) between 1 and 24),
  department text not null,
  semester smallint not null references public.semesters(number) on delete restrict,
  section text not null,
  day_of_week text not null check (day_of_week in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  start_time time not null,
  end_time time not null,
  room text,
  building text,
  class_type text not null default 'lecture' check (class_type in ('lecture', 'lab', 'tutorial', 'seminar', 'project', 'other')),
  status text not null default 'active' check (status in ('active', 'cancelled', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index if not exists timetable_student_schedule_idx
  on public.timetable_entries (academic_period_id, department, semester, section, day_of_week, start_time)
  where status = 'active';
create index if not exists timetable_faculty_schedule_idx
  on public.timetable_entries (faculty_id, academic_period_id, day_of_week, start_time)
  where status = 'active';

create or replace function public.check_timetable_conflicts()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  conflicting public.timetable_entries%rowtype;
  conflicting_subject text;
  has_conflict boolean;
begin
  if new.status <> 'active' then return new; end if;
  perform pg_catalog.pg_advisory_xact_lock(914208, 1);
  select t.* into conflicting
  from public.timetable_entries t
  where t.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    and t.status = 'active'
    and t.academic_period_id = new.academic_period_id
    and t.day_of_week = new.day_of_week
    and new.start_time < t.end_time
    and new.end_time > t.start_time
    and (
      t.faculty_id = new.faculty_id
      or (new.room is not null and nullif(pg_catalog.btrim(t.room), '') is not null
          and pg_catalog.lower(pg_catalog.btrim(t.room)) = pg_catalog.lower(pg_catalog.btrim(new.room)))
      or (t.department = new.department and t.semester = new.semester and t.section = new.section)
    )
  limit 1;
  has_conflict := found;
  if has_conflict then
    select s.subject_name into conflicting_subject
    from public.subjects s where s.id = conflicting.subject_id;
  end if;
  if not exists (
    select 1 from public.faculty_subjects fs
    where fs.faculty_id = new.faculty_id and fs.subject_id = new.subject_id
      and fs.academic_period_id = new.academic_period_id and fs.section = new.section
      and fs.semester = new.semester and fs.status = 'active'
  ) then
    raise exception 'An active faculty assignment is required for this timetable entry';
  end if;
  if has_conflict then
    raise exception 'TIMETABLE_CONFLICT: % already occupies %–% in room %.',
      coalesce(conflicting_subject, 'An existing class'), conflicting.start_time, conflicting.end_time,
      coalesce(conflicting.room, 'not specified')
      using errcode = '23P01';
  end if;
  return new;
end;
$$;
drop trigger if exists timetable_conflict_guard on public.timetable_entries;
create trigger timetable_conflict_guard before insert or update on public.timetable_entries
for each row execute function public.check_timetable_conflicts();
revoke all on function public.check_timetable_conflicts() from public, anon, authenticated;

create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete restrict,
  faculty_id uuid not null references auth.users(id) on delete restrict,
  timetable_entry_id uuid references public.timetable_entries(id) on delete set null,
  academic_period_id uuid not null references public.academic_periods(id) on delete restrict,
  session_date date not null,
  start_time time,
  end_time time,
  section text not null,
  topic text,
  notes text,
  status text not null default 'open' check (status in ('open', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (timetable_entry_id, session_date)
);
create index if not exists attendance_sessions_subject_date_idx
  on public.attendance_sessions (subject_id, academic_period_id, session_date desc);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  attendance_session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('present', 'absent', 'late', 'excused')),
  marked_at timestamptz not null default now(),
  marked_by uuid not null references auth.users(id) on delete restrict,
  remarks text check (remarks is null or length(remarks) <= 500),
  unique (attendance_session_id, student_id)
);
create index if not exists attendance_records_student_idx on public.attendance_records (student_id, attendance_session_id);

create table if not exists public.academic_attendance_settings (
  singleton boolean primary key default true check (singleton),
  recommended_threshold numeric(5,2) not null default 75 check (recommended_threshold between 0 and 100),
  warning_threshold numeric(5,2) not null default 75 check (warning_threshold between 0 and 100),
  critical_threshold numeric(5,2) not null default 60 check (critical_threshold between 0 and 100),
  late_weight numeric(4,3) not null default 1 check (late_weight between 0 and 1),
  excused_counts_as_eligible boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.academic_attendance_settings
  drop constraint if exists academic_attendance_threshold_order;
alter table public.academic_attendance_settings
  add constraint academic_attendance_threshold_order check (critical_threshold <= warning_threshold);
insert into public.academic_attendance_settings (singleton) values (true) on conflict do nothing;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'event_registration', 'event_reminder', 'event_cancelled', 'event_updated', 'ticket_issued',
  'internship_deadline', 'application_updated', 'interview_reminder', 'internship_published',
  'attendance_warning', 'academic_update', 'class_reminder', 'resource_published',
  'message', 'mention', 'club_join_approval', 'club_invitation', 'project_team_invitation',
  'club_activity', 'team_task', 'message_reaction', 'message_reply'
));

create table if not exists public.attendance_audit_logs (
  id uuid primary key default gen_random_uuid(),
  attendance_record_id uuid not null references public.attendance_records(id) on delete cascade,
  changed_by uuid not null references auth.users(id) on delete restrict,
  old_status text,
  new_status text not null,
  reason text not null check (length(trim(reason)) between 1 and 500),
  created_at timestamptz not null default now()
);

create or replace function public.save_attendance(target_session_id uuid, submitted_records jsonb)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_session public.attendance_sessions%rowtype;
  item jsonb;
  target_student uuid;
  target_status text;
  target_remarks text;
  reason_text text;
  old_record public.attendance_records%rowtype;
  saved integer := 0;
  expected_count integer;
begin
  if current_user_id is null or pg_catalog.jsonb_typeof(submitted_records) <> 'array' then
    raise exception 'Invalid attendance request';
  end if;
  if pg_catalog.jsonb_array_length(submitted_records) > 250 then
    raise exception 'Attendance roster exceeds the allowed size';
  end if;
  select * into current_session from public.attendance_sessions where id = target_session_id for update;
  if not found then raise exception 'Attendance session is unavailable'; end if;
  if current_session.status = 'cancelled' then raise exception 'Cancelled sessions cannot be changed'; end if;
  if not public.is_current_user_admin() and not exists (
    select 1 from public.faculty_subjects fs
    where fs.faculty_id = current_user_id and fs.subject_id = current_session.subject_id
      and fs.academic_period_id = current_session.academic_period_id
      and fs.section = current_session.section and fs.status = 'active'
  ) then raise exception 'Not authorized for this attendance session'; end if;
  select pg_catalog.count(*)::integer into expected_count from public.student_subjects ss
  where ss.subject_id = current_session.subject_id and ss.academic_period_id = current_session.academic_period_id
    and ss.section = current_session.section and ss.enrollment_status = 'active';
  if expected_count = 0 or expected_count <> pg_catalog.jsonb_array_length(submitted_records)
    or expected_count <> (select pg_catalog.count(distinct ((value ->> 'student_id')::uuid))::integer
      from pg_catalog.jsonb_array_elements(submitted_records)) then
    raise exception 'Submit exactly one attendance status for every enrolled student';
  end if;
  for item in select value from pg_catalog.jsonb_array_elements(submitted_records)
  loop
    target_student := (item ->> 'student_id')::uuid;
    target_status := item ->> 'status';
    target_remarks := nullif(pg_catalog.left(pg_catalog.btrim(item ->> 'remarks'), 500), '');
    reason_text := nullif(pg_catalog.left(pg_catalog.btrim(item ->> 'reason'), 500), '');
    if target_status is null or target_status not in ('present', 'absent', 'late', 'excused') then
      raise exception 'Invalid attendance status';
    end if;
    if not exists (
      select 1 from public.student_subjects ss
      where ss.student_id = target_student and ss.subject_id = current_session.subject_id
        and ss.academic_period_id = current_session.academic_period_id and ss.section = current_session.section
        and ss.enrollment_status = 'active'
    ) then raise exception 'Student is not actively enrolled in this subject and section'; end if;
    select * into old_record from public.attendance_records
      where attendance_session_id = target_session_id and student_id = target_student;
    if found and old_record.status <> target_status and reason_text is null then
      raise exception 'A reason is required when correcting attendance';
    end if;
    insert into public.attendance_records (attendance_session_id, student_id, status, marked_by, remarks)
    values (target_session_id, target_student, target_status, current_user_id, target_remarks)
    on conflict (attendance_session_id, student_id) do update
      set status = excluded.status, marked_at = now(), marked_by = excluded.marked_by, remarks = excluded.remarks;
    if old_record.id is not null and old_record.status <> target_status then
      insert into public.attendance_audit_logs (attendance_record_id, changed_by, old_status, new_status, reason)
      select id, current_user_id, old_record.status, target_status, reason_text
      from public.attendance_records where attendance_session_id = target_session_id and student_id = target_student;
    end if;
    saved := saved + 1;
  end loop;
  if current_session.status = 'open' then
    update public.attendance_sessions set status = 'completed' where id = target_session_id;
  end if;
  insert into public.notifications (user_id, title, message, type)
  select ss.student_id,
    case when progress.percentage < settings.critical_threshold then 'Critical attendance warning' else 'Attendance warning' end,
    pg_catalog.format(
      'Your attendance in %s is %s%%, below the configured warning threshold of %s%% for this application.',
      s.subject_name, progress.percentage, settings.warning_threshold
    ),
    'attendance_warning'
  from (
    select distinct (value ->> 'student_id')::uuid as student_id
    from pg_catalog.jsonb_array_elements(submitted_records)
  ) submitted
  join public.student_subjects ss on ss.student_id = submitted.student_id
    and ss.subject_id = current_session.subject_id
    and ss.academic_period_id = current_session.academic_period_id
    and ss.section = current_session.section and ss.enrollment_status = 'active'
  join public.subjects s on s.id = ss.subject_id
  cross join public.academic_attendance_settings settings
  cross join lateral (
    select round(
      100 * pg_catalog.sum(case when ar.status = 'present' then 1
        when ar.status = 'late' then settings.late_weight else 0 end)
      / nullif(pg_catalog.count(*) filter (where ar.status in ('present', 'late', 'absent')
        or (settings.excused_counts_as_eligible and ar.status = 'excused')), 0),
      2
    ) as percentage
    from public.attendance_sessions ats
    join public.attendance_records ar on ar.attendance_session_id = ats.id
      and ar.student_id = submitted.student_id
    where ats.subject_id = current_session.subject_id
      and ats.academic_period_id = current_session.academic_period_id
      and ats.section = current_session.section
      and ats.status = 'completed'
  ) progress
  where settings.singleton = true
    and progress.percentage < settings.warning_threshold
    and not exists (
      select 1 from public.notifications n
      where n.user_id = submitted.student_id and n.type = 'attendance_warning'
        and n.message = pg_catalog.format(
          'Your attendance in %s is %s%%, below the configured warning threshold of %s%% for this application.',
          s.subject_name, progress.percentage, settings.warning_threshold
        )
        and n.created_at >= now() - interval '30 days'
    );
  return pg_catalog.jsonb_build_object('saved_count', saved);
end;
$$;

create or replace function public.get_my_attendance_summary()
returns table (
  subject_id uuid, subject_code text, subject_name text, attended numeric, eligible integer,
  present_count integer, late_count integer, absent_count integer, excused_count integer,
  percentage numeric, threshold numeric, warning_threshold numeric, critical_threshold numeric
)
language sql stable security invoker
set search_path = ''
as $$
  with settings as (
    select recommended_threshold, warning_threshold, critical_threshold, late_weight, excused_counts_as_eligible
    from public.academic_attendance_settings where singleton = true
  ),
  totals as (
    select ss.subject_id,
      pg_catalog.sum(case when coalesce(ar.status, 'absent') = 'present' then 1
        when coalesce(ar.status, 'absent') = 'late' then settings.late_weight else 0 end) as attended,
      pg_catalog.count(*) filter (where coalesce(ar.status, 'absent') in ('present', 'late', 'absent')
        or (settings.excused_counts_as_eligible and ar.status = 'excused')) as eligible,
      pg_catalog.count(*) filter (where ar.status = 'present') as present_count,
      pg_catalog.count(*) filter (where ar.status = 'late') as late_count,
      pg_catalog.count(*) filter (where coalesce(ar.status, 'absent') = 'absent') as absent_count,
      pg_catalog.count(*) filter (where ar.status = 'excused') as excused_count,
      settings.recommended_threshold, settings.warning_threshold, settings.critical_threshold
    from public.student_subjects ss
    join public.attendance_sessions ats on ats.subject_id = ss.subject_id
      and ats.academic_period_id = ss.academic_period_id and ats.section = ss.section and ats.status = 'completed'
    left join public.attendance_records ar on ar.attendance_session_id = ats.id and ar.student_id = auth.uid()
    cross join settings
    where ss.student_id = auth.uid() and ss.enrollment_status = 'active'
    group by ss.subject_id, settings.recommended_threshold, settings.warning_threshold, settings.critical_threshold,
      settings.late_weight, settings.excused_counts_as_eligible
  )
  select t.subject_id, s.subject_code, s.subject_name, t.attended::numeric, t.eligible::integer,
    t.present_count::integer, t.late_count::integer, t.absent_count::integer, t.excused_count::integer,
    case when t.eligible > 0 then round(t.attended * 100 / t.eligible, 2) else null end,
    t.recommended_threshold, t.warning_threshold, t.critical_threshold
  from totals t join public.subjects s on s.id = t.subject_id
  order by s.subject_name;
$$;

create or replace function public.get_my_attendance_trend()
returns table (month date, attended numeric, eligible integer, percentage numeric)
language sql stable security invoker
set search_path = ''
as $$
  with settings as (
    select late_weight, excused_counts_as_eligible
    from public.academic_attendance_settings where singleton = true
  )
  select pg_catalog.date_trunc('month', ats.session_date)::date,
    pg_catalog.sum(case when ar.status = 'present' then 1
      when ar.status = 'late' then settings.late_weight else 0 end)::numeric,
    pg_catalog.count(*) filter (where ar.status in ('present', 'late', 'absent')
      or (settings.excused_counts_as_eligible and ar.status = 'excused'))::integer,
    case when pg_catalog.count(*) filter (where ar.status in ('present', 'late', 'absent')
      or (settings.excused_counts_as_eligible and ar.status = 'excused')) > 0
      then round(
        100 * pg_catalog.sum(case when ar.status = 'present' then 1
          when ar.status = 'late' then settings.late_weight else 0 end)
        / nullif(pg_catalog.count(*) filter (where ar.status in ('present', 'late', 'absent')
          or (settings.excused_counts_as_eligible and ar.status = 'excused')), 0),
        2
      )
      else null end
  from public.attendance_sessions ats
  join public.attendance_records ar on ar.attendance_session_id = ats.id and ar.student_id = auth.uid()
  join public.student_subjects ss on ss.student_id = auth.uid()
    and ss.subject_id = ats.subject_id and ss.academic_period_id = ats.academic_period_id
    and ss.section = ats.section and ss.enrollment_status = 'active'
  cross join settings
  where ats.status = 'completed'
  group by pg_catalog.date_trunc('month', ats.session_date), settings.late_weight, settings.excused_counts_as_eligible
  order by pg_catalog.date_trunc('month', ats.session_date);
$$;

create or replace function public.get_attendance_roster(target_session_id uuid)
returns table (student_id uuid, full_name text, status text, remarks text)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  current_session public.attendance_sessions%rowtype;
begin
  select * into current_session from public.attendance_sessions where id = target_session_id;
  if not found then raise exception 'Attendance session is unavailable'; end if;
  if not public.is_current_user_admin() and not exists (
    select 1 from public.faculty_subjects fs
    where fs.faculty_id = auth.uid() and fs.subject_id = current_session.subject_id
      and fs.academic_period_id = current_session.academic_period_id
      and fs.section = current_session.section and fs.status = 'active'
  ) then raise exception 'Not authorized for this attendance session'; end if;
  return query
  select ss.student_id, p.full_name, ar.status, ar.remarks
  from public.student_subjects ss
  join public.profiles p on p.auth_user_id = ss.student_id
  left join public.attendance_records ar
    on ar.attendance_session_id = target_session_id and ar.student_id = ss.student_id
  where ss.subject_id = current_session.subject_id
    and ss.academic_period_id = current_session.academic_period_id
    and ss.section = current_session.section and ss.enrollment_status = 'active'
  order by p.full_name;
end;
$$;

create or replace function public.get_academic_attendance_analytics()
returns table (
  subject_id uuid, subject_code text, subject_name text, active_students bigint,
  completed_sessions bigint, present_count bigint, late_count bigint, absent_count bigint,
  excused_count bigint, recorded_attendance numeric
)
language sql stable security invoker
set search_path = ''
as $$
  with settings as (
    select late_weight, excused_counts_as_eligible
    from public.academic_attendance_settings where singleton = true
  ),
  enrollment_totals as (
    select ss.subject_id, pg_catalog.count(distinct ss.student_id) as active_students
    from public.student_subjects ss
    where ss.enrollment_status = 'active'
    group by ss.subject_id
  ),
  session_totals as (
    select ats.subject_id, pg_catalog.count(*) as completed_sessions
    from public.attendance_sessions ats
    where ats.status = 'completed'
    group by ats.subject_id
  ),
  record_totals as (
    select ats.subject_id,
      pg_catalog.count(ar.id) filter (where ar.status = 'present') as present_count,
      pg_catalog.count(ar.id) filter (where ar.status = 'late') as late_count,
      pg_catalog.count(ar.id) filter (where ar.status = 'absent') as absent_count,
      pg_catalog.count(ar.id) filter (where ar.status = 'excused') as excused_count,
      case when pg_catalog.count(ar.id) filter (where ar.status in ('present', 'late', 'absent')
        or (settings.excused_counts_as_eligible and ar.status = 'excused')) > 0 then
        round(100::numeric * pg_catalog.sum(case when ar.status = 'present' then 1
          when ar.status = 'late' then settings.late_weight else 0 end)
          / nullif(pg_catalog.count(ar.id) filter (where ar.status in ('present', 'late', 'absent')
            or (settings.excused_counts_as_eligible and ar.status = 'excused')), 0), 2)
        else null end as recorded_attendance
    from public.attendance_sessions ats
    left join public.attendance_records ar on ar.attendance_session_id = ats.id
    cross join settings
    where ats.status = 'completed'
    group by ats.subject_id, settings.late_weight, settings.excused_counts_as_eligible
  )
  select s.id, s.subject_code, s.subject_name,
    coalesce(e.active_students, 0), coalesce(st.completed_sessions, 0),
    coalesce(r.present_count, 0), coalesce(r.late_count, 0), coalesce(r.absent_count, 0),
    coalesce(r.excused_count, 0), r.recorded_attendance
  from public.subjects s
  left join enrollment_totals e on e.subject_id = s.id
  left join session_totals st on st.subject_id = s.id
  left join record_totals r on r.subject_id = s.id
  where public.is_current_user_admin()
  order by s.subject_name;
$$;

create or replace function public.get_my_timetable()
returns table (
  id uuid, subject_id uuid, subject_code text, subject_name text, faculty_id uuid,
  faculty_name text, section text, department text, semester smallint, day_of_week text,
  start_time time, end_time time, room text, building text, class_type text
)
language sql stable security invoker
set search_path = ''
as $$
  select t.id, t.subject_id, s.subject_code, s.subject_name, t.faculty_id,
    p.full_name, t.section, t.department, t.semester, t.day_of_week, t.start_time,
    t.end_time, t.room, t.building, t.class_type
  from public.timetable_entries t
  join public.subjects s on s.id = t.subject_id
  left join public.profiles p on p.auth_user_id = t.faculty_id
  join public.academic_periods ap on ap.id = t.academic_period_id and ap.status = 'active'
  where t.status = 'active'
    and (
      t.faculty_id = auth.uid()
      or exists (select 1 from public.student_subjects ss where ss.student_id = auth.uid()
        and ss.subject_id = t.subject_id and ss.academic_period_id = t.academic_period_id
        and ss.section = t.section and ss.enrollment_status = 'active')
      or public.is_current_user_admin()
    )
  order by case t.day_of_week when 'Monday' then 1 when 'Tuesday' then 2 when 'Wednesday' then 3
    when 'Thursday' then 4 when 'Friday' then 5 when 'Saturday' then 6 else 7 end, t.start_time;
$$;

alter table public.academic_periods enable row level security;
alter table public.academic_sections enable row level security;
alter table public.student_subjects enable row level security;
alter table public.faculty_subjects enable row level security;
alter table public.timetable_entries enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.academic_attendance_settings enable row level security;
alter table public.attendance_audit_logs enable row level security;

drop policy if exists profiles_admin_academic_read on public.profiles;
create policy profiles_admin_academic_read on public.profiles for select to authenticated
using (public.is_current_user_admin() and role = 'faculty');
drop policy if exists academic_periods_read on public.academic_periods;
create policy academic_periods_read on public.academic_periods for select to authenticated using (status <> 'archived' or public.is_current_user_admin());
drop policy if exists academic_periods_admin_manage on public.academic_periods;
create policy academic_periods_admin_manage on public.academic_periods for all to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());
drop policy if exists academic_sections_read on public.academic_sections;
create policy academic_sections_read on public.academic_sections for select to authenticated using (status = 'active' or public.is_current_user_admin());
drop policy if exists academic_sections_admin_manage on public.academic_sections;
create policy academic_sections_admin_manage on public.academic_sections for all to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());

drop policy if exists student_subjects_owner_read on public.student_subjects;
create policy student_subjects_owner_read on public.student_subjects for select to authenticated using (student_id = auth.uid() or public.is_current_user_admin()
  or exists (select 1 from public.faculty_subjects fs where fs.faculty_id = auth.uid() and fs.subject_id = student_subjects.subject_id
    and fs.academic_period_id = student_subjects.academic_period_id and fs.section = student_subjects.section and fs.status = 'active'));
drop policy if exists student_subjects_student_enroll on public.student_subjects;
create policy student_subjects_student_enroll on public.student_subjects for insert to authenticated with check (
  student_id = auth.uid() and enrollment_status = 'active'
  and exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.role = 'student'
    and p.semester = student_subjects.semester
    and pg_catalog.lower(pg_catalog.btrim(p.section)) = pg_catalog.lower(pg_catalog.btrim(student_subjects.section)))
  and exists (select 1 from public.academic_periods ap where ap.id = student_subjects.academic_period_id and ap.status = 'active')
  and exists (
    select 1 from public.subjects s join public.branches b on b.id = s.branch_id
    where s.id = student_subjects.subject_id and s.is_active and s.semester = student_subjects.semester
      and exists (select 1 from public.profiles p where p.auth_user_id = auth.uid()
        and pg_catalog.lower(pg_catalog.btrim(p.department)) in (pg_catalog.lower(pg_catalog.btrim(b.code)), pg_catalog.lower(pg_catalog.btrim(b.name))))
      and exists (select 1 from public.academic_sections ac where ac.academic_period_id = student_subjects.academic_period_id
        and ac.semester = s.semester and ac.section_name = student_subjects.section
        and ac.department = b.name and ac.status = 'active')
  )
);
drop policy if exists student_subjects_admin_manage on public.student_subjects;
create policy student_subjects_admin_manage on public.student_subjects for all to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());

drop policy if exists faculty_subjects_owner_read on public.faculty_subjects;
create policy faculty_subjects_owner_read on public.faculty_subjects for select to authenticated using (faculty_id = auth.uid() or public.is_current_user_admin());
drop policy if exists faculty_subjects_admin_manage on public.faculty_subjects;
create policy faculty_subjects_admin_manage on public.faculty_subjects for all to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());

drop policy if exists timetable_relevant_read on public.timetable_entries;
create policy timetable_relevant_read on public.timetable_entries for select to authenticated using (
  public.is_current_user_admin() or faculty_id = auth.uid()
  or exists (select 1 from public.student_subjects ss where ss.student_id = auth.uid()
    and ss.subject_id = timetable_entries.subject_id and ss.academic_period_id = timetable_entries.academic_period_id
    and ss.section = timetable_entries.section and ss.enrollment_status = 'active'));
drop policy if exists timetable_admin_manage on public.timetable_entries;
create policy timetable_admin_manage on public.timetable_entries for all to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());

drop policy if exists attendance_sessions_relevant_read on public.attendance_sessions;
create policy attendance_sessions_relevant_read on public.attendance_sessions for select to authenticated using (
  faculty_id = auth.uid() or public.is_current_user_admin()
  or exists (select 1 from public.student_subjects ss where ss.student_id = auth.uid()
    and ss.subject_id = attendance_sessions.subject_id and ss.academic_period_id = attendance_sessions.academic_period_id
    and ss.section = attendance_sessions.section and ss.enrollment_status = 'active'));
drop policy if exists attendance_sessions_authorized_insert on public.attendance_sessions;
create policy attendance_sessions_authorized_insert on public.attendance_sessions for insert to authenticated with check (
  (faculty_id = auth.uid() and exists (select 1 from public.faculty_subjects fs where fs.faculty_id = auth.uid()
    and fs.subject_id = attendance_sessions.subject_id and fs.academic_period_id = attendance_sessions.academic_period_id
    and fs.section = attendance_sessions.section and fs.status = 'active'))
  or public.is_current_user_admin());
drop policy if exists attendance_sessions_admin_update on public.attendance_sessions;
create policy attendance_sessions_admin_update on public.attendance_sessions for update to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());
drop policy if exists attendance_sessions_faculty_update on public.attendance_sessions;
create policy attendance_sessions_faculty_update on public.attendance_sessions for update to authenticated
using (faculty_id = auth.uid() and exists (select 1 from public.faculty_subjects fs where fs.faculty_id = auth.uid()
  and fs.subject_id = attendance_sessions.subject_id and fs.academic_period_id = attendance_sessions.academic_period_id
  and fs.section = attendance_sessions.section and fs.status = 'active'))
with check (faculty_id = auth.uid() and exists (select 1 from public.faculty_subjects fs where fs.faculty_id = auth.uid()
  and fs.subject_id = attendance_sessions.subject_id and fs.academic_period_id = attendance_sessions.academic_period_id
  and fs.section = attendance_sessions.section and fs.status = 'active'));

drop policy if exists attendance_records_owner_or_assigned_read on public.attendance_records;
create policy attendance_records_owner_or_assigned_read on public.attendance_records for select to authenticated using (
  student_id = auth.uid() or public.is_current_user_admin()
  or exists (select 1 from public.attendance_sessions ats join public.faculty_subjects fs
    on fs.subject_id = ats.subject_id and fs.academic_period_id = ats.academic_period_id and fs.section = ats.section
    where ats.id = attendance_session_id and fs.faculty_id = auth.uid() and fs.status = 'active'));
revoke insert, update, delete on public.attendance_records from anon, authenticated;
revoke insert, update, delete on public.attendance_audit_logs from anon, authenticated;

drop policy if exists academic_attendance_settings_read on public.academic_attendance_settings;
create policy academic_attendance_settings_read on public.academic_attendance_settings for select to authenticated using (true);
drop policy if exists academic_attendance_settings_admin_manage on public.academic_attendance_settings;
create policy academic_attendance_settings_admin_manage on public.academic_attendance_settings for all to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());
drop policy if exists attendance_audit_admin_read on public.attendance_audit_logs;
create policy attendance_audit_admin_read on public.attendance_audit_logs for select to authenticated using (public.is_current_user_admin()
  or exists (select 1 from public.attendance_records ar join public.attendance_sessions ats on ats.id = ar.attendance_session_id
    join public.faculty_subjects fs on fs.subject_id = ats.subject_id and fs.academic_period_id = ats.academic_period_id and fs.section = ats.section
    where ar.id = attendance_record_id and fs.faculty_id = auth.uid() and fs.status = 'active'));

revoke all on function public.save_attendance(uuid, jsonb) from public, anon;
grant execute on function public.save_attendance(uuid, jsonb) to authenticated;
revoke all on function public.get_my_attendance_summary() from public, anon;
grant execute on function public.get_my_attendance_summary() to authenticated;
revoke all on function public.get_my_attendance_trend() from public, anon;
grant execute on function public.get_my_attendance_trend() to authenticated;
revoke all on function public.get_attendance_roster(uuid) from public, anon;
grant execute on function public.get_attendance_roster(uuid) to authenticated;
revoke all on function public.get_academic_attendance_analytics() from public, anon;
grant execute on function public.get_academic_attendance_analytics() to authenticated;
revoke all on function public.get_my_timetable() from public, anon;
grant execute on function public.get_my_timetable() to authenticated;

grant select, insert, update, delete on public.academic_periods, public.academic_sections, public.student_subjects,
  public.faculty_subjects, public.timetable_entries, public.attendance_sessions, public.academic_attendance_settings to authenticated;
grant select on public.attendance_records, public.attendance_audit_logs to authenticated;
revoke all on public.academic_periods, public.academic_sections, public.student_subjects, public.faculty_subjects,
  public.timetable_entries, public.attendance_sessions, public.attendance_records, public.academic_attendance_settings,
  public.attendance_audit_logs from anon;
