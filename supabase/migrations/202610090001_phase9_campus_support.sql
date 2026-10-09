begin;

create table if not exists public.lost_found_items (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  report_type text not null check (report_type in ('lost', 'found')),
  title text not null check (length(trim(title)) between 3 and 120),
  description text not null check (length(trim(description)) between 10 and 3000),
  category text not null check (category in ('electronics', 'id_cards', 'books_stationery', 'bags', 'clothing', 'keys', 'accessories', 'other')),
  location_description text check (location_description is null or length(location_description) <= 300),
  occurred_at date,
  image_paths jsonb not null default '[]'::jsonb check (jsonb_typeof(image_paths) = 'array' and jsonb_array_length(image_paths) <= 5),
  status text not null default 'open' check (status in ('open', 'potential_match', 'under_review', 'recovered', 'closed', 'rejected')),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lost_found_private_contacts (
  item_id uuid primary key references public.lost_found_items(id) on delete cascade,
  contact_method text not null check (length(trim(contact_method)) between 2 and 300),
  updated_at timestamptz not null default now()
);

create table if not exists public.lost_found_matches (
  id uuid primary key default gen_random_uuid(),
  lost_item_id uuid not null references public.lost_found_items(id) on delete cascade,
  found_item_id uuid not null references public.lost_found_items(id) on delete cascade,
  suggested_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'suggested' check (status in ('suggested', 'accepted', 'rejected', 'resolved')),
  reviewed_by uuid references auth.users(id) on delete set null,
  lost_owner_confirmed boolean not null default false,
  found_owner_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (lost_item_id <> found_item_id),
  unique (lost_item_id, found_item_id)
);

create table if not exists public.campus_services (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category text not null check (category in ('it_support', 'library_assistance', 'facilities', 'student_support', 'academic_assistance', 'accessibility', 'general')),
  description text not null check (length(trim(description)) between 10 and 3000),
  location_description text,
  opening_hours text,
  contact_information text,
  service_type text not null default 'information' check (service_type in ('information', 'request')),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique default ('CC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 20))),
  ticket_type text not null default 'complaint' check (ticket_type in ('complaint', 'service_request')),
  service_id uuid references public.campus_services(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null,
  category text not null check (length(trim(category)) between 2 and 80),
  subject text not null check (length(trim(subject)) between 4 and 180),
  description text not null check (length(trim(description)) between 10 and 8000),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'submitted' check (status in ('submitted', 'under_review', 'assigned', 'in_progress', 'awaiting_information', 'resolved', 'closed', 'rejected')),
  assigned_to uuid references auth.users(id) on delete set null,
  is_anonymous boolean not null default false,
  location_description text check (location_description is null or length(location_description) <= 300),
  contact_method text check (contact_method is null or length(contact_method) <= 300),
  resolution_summary text check (resolution_summary is null or length(resolution_summary) <= 3000),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((ticket_type = 'complaint' and service_id is null) or (ticket_type = 'service_request' and service_id is not null))
);

create table if not exists public.support_ticket_reporters (
  ticket_id uuid primary key references public.support_tickets(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.support_ticket_history (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  old_status text,
  new_status text,
  old_assignee uuid references auth.users(id) on delete set null,
  new_assignee uuid references auth.users(id) on delete set null,
  comment text check (comment is null or length(comment) <= 2000),
  created_at timestamptz not null default now(),
  check (old_status is distinct from new_status or old_assignee is distinct from new_assignee or comment is not null)
);

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete restrict,
  message text not null check (length(trim(message)) between 1 and 4000),
  visibility text not null default 'public' check (visibility in ('public', 'internal')),
  attachment_paths jsonb not null default '[]'::jsonb check (jsonb_typeof(attachment_paths) = 'array' and jsonb_array_length(attachment_paths) <= 5),
  created_at timestamptz not null default now()
);

create table if not exists public.support_ticket_internal_notes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict,
  note text not null check (length(trim(note)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references auth.users(id) on delete restrict,
  category text not null check (category in ('general', 'academic', 'facilities', 'events', 'website_app', 'services')),
  title text not null check (length(trim(title)) between 4 and 160),
  message text not null check (length(trim(message)) between 10 and 4000),
  rating smallint check (rating is null or rating between 1 and 5),
  is_anonymous boolean not null default false,
  status text not null default 'submitted' check (status in ('submitted', 'under_review', 'planned', 'implemented', 'declined', 'closed')),
  admin_response text check (admin_response is null or length(admin_response) <= 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (length(action) between 1 and 100),
  target_type text not null check (length(target_type) between 1 and 100),
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists lost_found_items_browse_idx on public.lost_found_items (status, category, occurred_at desc, created_at desc);
create index if not exists lost_found_items_owner_idx on public.lost_found_items (reporter_id, created_at desc);
create index if not exists lost_found_matches_lost_idx on public.lost_found_matches (lost_item_id, status);
create index if not exists lost_found_matches_found_idx on public.lost_found_matches (found_item_id, status);
create index if not exists support_tickets_owner_idx on public.support_tickets (created_by, created_at desc);
create index if not exists support_tickets_queue_idx on public.support_tickets (ticket_type, status, priority, created_at desc);
create index if not exists support_tickets_assignee_idx on public.support_tickets (assigned_to, status, updated_at desc);
create index if not exists support_tickets_reference_idx on public.support_tickets (reference_code);
create index if not exists support_ticket_history_ticket_idx on public.support_ticket_history (ticket_id, created_at);
create index if not exists support_ticket_messages_ticket_idx on public.support_ticket_messages (ticket_id, created_at);
create index if not exists support_ticket_notes_ticket_idx on public.support_ticket_internal_notes (ticket_id, created_at);
create index if not exists support_ticket_reporters_reporter_idx on public.support_ticket_reporters (reporter_id, created_at desc);
create index if not exists feedback_submissions_review_idx on public.feedback_submissions (status, category, created_at desc);
create index if not exists feedback_submissions_owner_idx on public.feedback_submissions (submitted_by, created_at desc);
create index if not exists audit_logs_target_idx on public.audit_logs (target_type, target_id, created_at desc);

create or replace function public.is_authorized_support_staff()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.is_current_user_admin() or exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid() and p.role = 'faculty'
  );
$$;

create or replace function public.notify_support_ticket_created()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, title, message, type)
  select reporter_id, 'Request received', 'Your request ' || new.reference_code || ' was received.', 'support_update'
  from public.support_ticket_reporters where ticket_id = new.id;
  return new;
end;
$$;

drop trigger if exists zz_notify_support_ticket_created_trigger on public.support_tickets;
create trigger zz_notify_support_ticket_created_trigger after insert on public.support_tickets
for each row execute function public.notify_support_ticket_created();

create or replace function public.audit_campus_service_changes()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.audit_logs (actor_id, action, target_type, target_id, metadata)
  values (auth.uid(), case when tg_op = 'INSERT' then 'create_campus_service' else 'update_campus_service' end,
    'campus_service', new.id, jsonb_build_object('is_active', new.is_active));
  return new;
end;
$$;
drop trigger if exists audit_campus_service_changes_trigger on public.campus_services;
create trigger audit_campus_service_changes_trigger after insert or update on public.campus_services
for each row execute function public.audit_campus_service_changes();

create or replace function public.is_support_ticket_owner(target_ticket_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.support_ticket_reporters r
    where r.ticket_id = target_ticket_id and r.reporter_id = auth.uid()
  );
$$;

create or replace function public.get_support_ticket_contact(target_ticket_id uuid)
returns text
language sql stable security definer
set search_path = ''
as $$
  select t.contact_method
  from public.support_tickets t
  where t.id = target_ticket_id
    and auth.uid() is not null
    and (public.is_support_ticket_owner(t.id) or public.is_current_user_admin());
$$;

create or replace function public.get_support_ticket_messages(target_ticket_id uuid)
returns table (
  id uuid,
  ticket_id uuid,
  sender_id uuid,
  message text,
  visibility text,
  attachment_paths jsonb,
  created_at timestamptz
)
language sql stable security definer
set search_path = ''
as $$
  select m.id, m.ticket_id,
    case when t.is_anonymous and not (public.is_support_ticket_owner(t.id) or public.is_current_user_admin()) then null else m.sender_id end,
    m.message, m.visibility, m.attachment_paths, m.created_at
  from public.support_ticket_messages m
  join public.support_tickets t on t.id = m.ticket_id
  where m.ticket_id = target_ticket_id and m.visibility = 'public'
    and auth.uid() is not null
    and (public.is_support_ticket_owner(t.id) or t.assigned_to = auth.uid() or public.is_current_user_admin())
  order by m.created_at;
$$;

create or replace function public.can_read_support_attachment(target_path text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.support_ticket_messages m
    join public.support_tickets t on t.id = m.ticket_id
    where m.attachment_paths @> jsonb_build_array(target_path)
      and (
        (m.visibility = 'public' and (public.is_support_ticket_owner(t.id) or t.assigned_to = auth.uid() or public.is_current_user_admin()))
        or (m.visibility = 'internal' and (public.is_current_user_admin() or (t.assigned_to = auth.uid() and public.is_authorized_support_staff())))
      )
  );
$$;

create or replace function public.owns_campus_support_object(target_path text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from storage.objects object_row
    where object_row.bucket_id = 'campus-support-private'
      and object_row.name = target_path
      and object_row.owner_id = auth.uid()::text
  );
$$;

create or replace function public.get_my_lost_found_items()
returns table (
  id uuid,
  report_type text,
  title text,
  description text,
  category text,
  location_description text,
  occurred_at date,
  image_paths jsonb,
  status text,
  resolved_at timestamptz,
  created_at timestamptz
)
language sql stable security definer
set search_path = ''
as $$
  select i.id, i.report_type, i.title, i.description, i.category, i.location_description,
    i.occurred_at, i.image_paths, i.status, i.resolved_at, i.created_at
  from public.lost_found_items i
  where i.reporter_id = auth.uid()
  order by i.created_at desc;
$$;

create or replace function public.create_lost_found_report(
  report_type text,
  report_title text,
  report_description text,
  report_category text,
  report_location_description text,
  report_occurred_at date,
  report_image_paths jsonb,
  report_contact_method text
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  new_item_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if report_image_paths is null or jsonb_typeof(report_image_paths) <> 'array' or jsonb_array_length(report_image_paths) > 5
    or exists (
      select 1 from jsonb_array_elements_text(report_image_paths) as item_path(path)
      where split_part(item_path.path, '/', 1) <> current_user_id::text
    ) then
    raise exception 'Invalid report image paths';
  end if;
  insert into public.lost_found_items (
    reporter_id, report_type, title, description, category, location_description, occurred_at, image_paths
  ) values (
    current_user_id, report_type, report_title, report_description, report_category,
    report_location_description, report_occurred_at, report_image_paths
  ) returning id into new_item_id;
  insert into public.lost_found_private_contacts (item_id, contact_method)
  values (new_item_id, report_contact_method);
  return new_item_id;
end;
$$;

create or replace function public.set_support_ticket_reporter()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  new.created_by := case when new.is_anonymous then null else auth.uid() end;
  return new;
end;
$$;

create or replace function public.record_support_ticket_reporter()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.support_ticket_reporters (ticket_id, reporter_id) values (new.id, auth.uid());
  return new;
end;
$$;

drop trigger if exists set_support_ticket_reporter_trigger on public.support_tickets;
create trigger set_support_ticket_reporter_trigger before insert on public.support_tickets
for each row execute function public.set_support_ticket_reporter();
drop trigger if exists record_support_ticket_reporter_trigger on public.support_tickets;
create trigger record_support_ticket_reporter_trigger after insert on public.support_tickets
for each row execute function public.record_support_ticket_reporter();

create or replace function public.guard_lost_found_status()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.status = 'potential_match' and (tg_op = 'INSERT' or old.status is distinct from new.status)
    and not exists (
      select 1 from public.lost_found_matches m
      where new.id in (m.lost_item_id, m.found_item_id) and m.status in ('suggested', 'accepted')
    ) then
    raise exception 'A potential match requires a suggested match record';
  end if;
  if new.status = 'recovered' and (
    new.resolved_at is null or not exists (
      select 1 from public.lost_found_matches m
      where new.id in (m.lost_item_id, m.found_item_id)
        and m.status = 'resolved' and m.lost_owner_confirmed and m.found_owner_confirmed
    )
  ) then
    raise exception 'Recovery requires a match confirmed by both report owners';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_lost_found_status_trigger on public.lost_found_items;
create trigger guard_lost_found_status_trigger before insert or update of status, resolved_at on public.lost_found_items
for each row execute function public.guard_lost_found_status();

create or replace function public.suggest_lost_found_match(target_lost_id uuid, target_found_id uuid)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  new_match_id uuid;
begin
  if current_user_id is null or target_lost_id = target_found_id then
    raise exception 'Invalid match request';
  end if;
  if not exists (
    select 1 from public.lost_found_items lost
    join public.lost_found_items found on found.id = target_found_id
    where lost.id = target_lost_id and lost.report_type = 'lost' and found.report_type = 'found'
      and lost.status in ('open', 'potential_match') and found.status in ('open', 'potential_match')
      and (lost.reporter_id = current_user_id or found.reporter_id = current_user_id)
  ) then
    raise exception 'You can only suggest a match involving your own open report';
  end if;
  insert into public.lost_found_matches (lost_item_id, found_item_id, suggested_by)
  values (target_lost_id, target_found_id, current_user_id)
  on conflict (lost_item_id, found_item_id) do nothing
  returning id into new_match_id;
  if new_match_id is null then
    select id into new_match_id from public.lost_found_matches
    where lost_item_id = target_lost_id and found_item_id = target_found_id;
  end if;
  update public.lost_found_items set status = 'potential_match', updated_at = now()
  where id in (target_lost_id, target_found_id) and status = 'open';
  return new_match_id;
end;
$$;

create or replace function public.review_lost_found_match(target_match_id uuid, decision text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  match_row public.lost_found_matches%rowtype;
  current_user_id uuid := auth.uid();
  lost_owner uuid;
  found_owner uuid;
  next_lost_confirmed boolean;
  next_found_confirmed boolean;
begin
  if current_user_id is null or decision not in ('accepted', 'rejected', 'resolved') then
    raise exception 'Invalid match decision';
  end if;
  select * into match_row from public.lost_found_matches where id = target_match_id for update;
  if not found or not (public.is_current_user_admin() or exists (
    select 1 from public.lost_found_items i
    where i.id in (match_row.lost_item_id, match_row.found_item_id) and i.reporter_id = current_user_id
  )) then
    raise exception 'Not authorized to review this match';
  end if;
  if match_row.status not in ('suggested', 'accepted') then raise exception 'This match has already been reviewed'; end if;
  if decision = 'accepted' and match_row.status = 'accepted' then raise exception 'Both report owners have already confirmed this match'; end if;
  select reporter_id into lost_owner from public.lost_found_items where id = match_row.lost_item_id;
  select reporter_id into found_owner from public.lost_found_items where id = match_row.found_item_id;
  next_lost_confirmed := match_row.lost_owner_confirmed or lost_owner = current_user_id or public.is_current_user_admin();
  next_found_confirmed := match_row.found_owner_confirmed or found_owner = current_user_id or public.is_current_user_admin();
  if decision = 'accepted' then
    if not public.is_current_user_admin() and lost_owner <> current_user_id and found_owner <> current_user_id then
      raise exception 'Only a report owner can confirm this possible match';
    end if;
    update public.lost_found_matches set
      lost_owner_confirmed = next_lost_confirmed,
      found_owner_confirmed = next_found_confirmed,
      status = case when next_lost_confirmed and next_found_confirmed then 'accepted' else 'suggested' end,
      reviewed_by = current_user_id,
      updated_at = now()
    where id = target_match_id;
  else
    if decision = 'resolved' and match_row.status <> 'accepted' then
      raise exception 'Both report owners must confirm a match before recovery can be recorded';
    end if;
    update public.lost_found_matches set status = decision, reviewed_by = current_user_id, updated_at = now()
    where id = target_match_id;
  end if;
  if decision = 'resolved' then
    update public.lost_found_items set status = 'recovered', resolved_at = now(), updated_at = now()
    where id in (match_row.lost_item_id, match_row.found_item_id);
  elsif decision = 'rejected' then
    update public.lost_found_items set status = 'open', updated_at = now()
    where id in (match_row.lost_item_id, match_row.found_item_id) and status = 'potential_match';
  end if;
end;
$$;

create or replace function public.manage_support_ticket(
  target_ticket_id uuid,
  next_status text default null,
  next_assignee uuid default null,
  resolution text default null,
  update_assignment boolean default false,
  history_comment text default null
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  ticket public.support_tickets%rowtype;
  next_assignee_value uuid;
  next_status_value text;
  is_admin boolean := public.is_current_user_admin();
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into ticket from public.support_tickets where id = target_ticket_id for update;
  if not found then raise exception 'Ticket not found'; end if;
  if not is_admin and (not public.is_authorized_support_staff() or ticket.assigned_to is distinct from auth.uid()) then
    raise exception 'Only an administrator or the assigned staff member can manage this case';
  end if;
  next_assignee_value := case when update_assignment then next_assignee else ticket.assigned_to end;
  next_status_value := coalesce(next_status, ticket.status);
  if next_assignee_value is not null and next_status_value = 'submitted' then next_status_value := 'assigned'; end if;
  if update_assignment and next_assignee_value is null and next_status_value = 'assigned' then next_status_value := 'under_review'; end if;
  if next_status_value not in ('submitted', 'under_review', 'assigned', 'in_progress', 'awaiting_information', 'resolved', 'closed', 'rejected') then
    raise exception 'Invalid ticket status';
  end if;
  if next_assignee_value is not null and not exists (
    select 1 from public.profiles p where p.auth_user_id = next_assignee_value and p.role in ('faculty', 'admin')
  ) then raise exception 'Tickets can only be assigned to authorized staff'; end if;
  if not is_admin and update_assignment and next_assignee_value is distinct from ticket.assigned_to then
    raise exception 'Only an administrator can reassign cases';
  end if;
  if ticket.status in ('closed', 'rejected') and next_status_value not in (ticket.status) then
    raise exception 'Closed or rejected tickets cannot be reopened';
  end if;
  if next_status_value <> ticket.status and not (
    (ticket.status = 'submitted' and next_status_value in ('under_review', 'assigned', 'rejected'))
    or (ticket.status = 'under_review' and next_status_value in ('assigned', 'in_progress', 'awaiting_information', 'resolved', 'rejected'))
    or (ticket.status = 'assigned' and next_status_value in ('under_review', 'in_progress', 'awaiting_information', 'resolved', 'rejected'))
    or (ticket.status = 'in_progress' and next_status_value in ('assigned', 'awaiting_information', 'resolved', 'rejected'))
    or (ticket.status = 'awaiting_information' and next_status_value in ('assigned', 'in_progress', 'resolved', 'rejected'))
    or (ticket.status = 'resolved' and next_status_value = 'closed')
    or (is_admin and ticket.status = 'resolved' and next_status_value in ('under_review', 'assigned', 'in_progress'))
  ) then
    raise exception 'This case cannot transition directly to the selected status';
  end if;
  if next_status_value = 'assigned' and next_assignee_value is null then
    raise exception 'Assign the case to an authorized staff member before marking it assigned';
  end if;
  if next_status_value = 'awaiting_information' and next_status_value <> ticket.status
    and length(trim(coalesce(history_comment, ''))) < 3 then
    raise exception 'Explain what information is needed before requesting a response';
  end if;
  if next_status_value = 'resolved' and coalesce(length(trim(resolution)), length(trim(ticket.resolution_summary)), 0) < 3 then
    raise exception 'Provide a resolution summary before resolving the case';
  end if;
  update public.support_tickets set
    status = next_status_value,
    assigned_to = next_assignee_value,
    resolution_summary = coalesce(nullif(trim(resolution), ''), resolution_summary),
    resolved_at = case when next_status_value = 'resolved' then coalesce(resolved_at, now())
      when ticket.status = 'resolved' and next_status_value <> 'closed' then null else resolved_at end,
    updated_at = now()
  where id = target_ticket_id;
  if ticket.status is distinct from next_status_value or ticket.assigned_to is distinct from next_assignee_value
    or ticket.resolution_summary is distinct from coalesce(nullif(trim(resolution), ''), ticket.resolution_summary) then
    insert into public.support_ticket_history (ticket_id, actor_id, old_status, new_status, old_assignee, new_assignee, comment)
    values (target_ticket_id, auth.uid(), ticket.status, next_status_value, ticket.assigned_to, next_assignee_value,
      coalesce(nullif(trim(history_comment), ''),
        case when ticket.resolution_summary is distinct from coalesce(nullif(trim(resolution), ''), ticket.resolution_summary)
          then 'Resolution summary updated' else null end));
    insert into public.audit_logs (actor_id, action, target_type, target_id, metadata)
    values (auth.uid(), 'manage_support_ticket', 'support_ticket', target_ticket_id,
      jsonb_build_object('status', next_status_value, 'assigned_to', next_assignee_value));
    if not public.is_support_ticket_owner(target_ticket_id) then
      insert into public.notifications (user_id, title, message, type)
      select r.reporter_id, 'Support request updated', 'There is an update to your support request ' || ticket.reference_code || '.', 'support_update'
      from public.support_ticket_reporters r where r.ticket_id = target_ticket_id;
    end if;
    if ticket.assigned_to is distinct from next_assignee_value and next_assignee_value is not null then
      insert into public.notifications (user_id, title, message, type)
      values (next_assignee_value, 'Case assigned', 'A support case was assigned to you: ' || ticket.reference_code || '.', 'support_update');
    end if;
    if ticket.assigned_to is not null and ticket.assigned_to is distinct from next_assignee_value then
      insert into public.notifications (user_id, title, message, type)
      values (ticket.assigned_to, 'Case reassigned', 'A support case was reassigned: ' || ticket.reference_code || '.', 'support_update');
    end if;
  end if;
end;
$$;

create or replace function public.review_feedback(target_feedback_id uuid, next_status text, response_text text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  feedback public.feedback_submissions%rowtype;
begin
  if not public.is_current_user_admin() then raise exception 'Administrator access required'; end if;
  if next_status not in ('submitted', 'under_review', 'planned', 'implemented', 'declined', 'closed') then
    raise exception 'Invalid feedback status';
  end if;
  select * into feedback from public.feedback_submissions where id = target_feedback_id for update;
  if not found then raise exception 'Feedback not found'; end if;
  if feedback.status = next_status and feedback.admin_response is not distinct from nullif(trim(response_text), '') then
    return;
  end if;
  update public.feedback_submissions set status = next_status, admin_response = nullif(trim(response_text), ''), updated_at = now()
  where id = target_feedback_id;
  insert into public.audit_logs (actor_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'review_feedback', 'feedback_submission', target_feedback_id, jsonb_build_object('status', next_status));
  if response_text is not null and feedback.submitted_by <> auth.uid()
    and feedback.admin_response is distinct from nullif(trim(response_text), '') then
    insert into public.notifications (user_id, title, message, type)
    values (feedback.submitted_by, 'Feedback response received', 'An authorized reviewer responded to your feedback.', 'support_update');
  end if;
end;
$$;

create table if not exists public.campus_service_requests (
  id uuid primary key references public.support_tickets(id) on delete cascade,
  service_id uuid not null references public.campus_services(id) on delete restrict
);
alter table public.campus_service_requests enable row level security;
create index if not exists campus_service_requests_service_idx on public.campus_service_requests (service_id, id);
drop policy if exists campus_service_requests_participant_read on public.campus_service_requests;
create policy campus_service_requests_participant_read on public.campus_service_requests for select to authenticated using (
  public.is_current_user_admin() or exists (
    select 1 from public.support_tickets t
    where t.id = campus_service_requests.id and (public.is_support_ticket_owner(t.id) or t.assigned_to = auth.uid())
  )
);
create or replace function public.sync_campus_service_request()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.ticket_type = 'service_request' then
    insert into public.campus_service_requests (id, service_id) values (new.id, new.service_id)
    on conflict (id) do update set service_id = excluded.service_id;
  else
    delete from public.campus_service_requests where id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists sync_campus_service_request_trigger on public.support_tickets;
create trigger sync_campus_service_request_trigger after insert or update of ticket_type, service_id on public.support_tickets
for each row execute function public.sync_campus_service_request();

create or replace function public.audit_lost_found_match_changes()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  item_owner uuid;
begin
  insert into public.audit_logs (actor_id, action, target_type, target_id, metadata)
  values (coalesce(new.reviewed_by, new.suggested_by), 'lost_found_match_' || new.status, 'lost_found_match', new.id,
    jsonb_build_object('lost_item_id', new.lost_item_id, 'found_item_id', new.found_item_id));
  for item_owner in
    select distinct reporter_id from public.lost_found_items where id in (new.lost_item_id, new.found_item_id)
  loop
    if new.status <> 'resolved'
      and item_owner <> case when tg_op = 'INSERT' then new.suggested_by else new.reviewed_by end then
      insert into public.notifications (user_id, title, message, type)
      values (item_owner,
        case new.status when 'accepted' then 'Possible match confirmed' when 'rejected' then 'Possible match declined' else 'Possible item match' end,
        case new.status when 'accepted' then 'Both report owners confirmed a possible item match.'
          when 'rejected' then 'A possible item match was declined.'
          else 'A possible Lost & Found match needs your review.' end,
        'lost_found_update');
    end if;
  end loop;
  return new;
end;
$$;
drop trigger if exists audit_lost_found_match_changes_trigger on public.lost_found_matches;
create trigger audit_lost_found_match_changes_trigger after insert or update on public.lost_found_matches
for each row execute function public.audit_lost_found_match_changes();

create or replace function public.audit_lost_found_item_status()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status then
    insert into public.audit_logs (actor_id, action, target_type, target_id, metadata)
    values (auth.uid(), 'lost_found_status_' || new.status, 'lost_found_item', new.id,
      jsonb_build_object('old_status', old.status, 'new_status', new.status));
    if new.status not in ('open', 'potential_match') and old.reporter_id <> auth.uid() then
      insert into public.notifications (user_id, title, message, type)
      values (old.reporter_id, 'Lost & Found report updated', 'There is an update to your Lost & Found report.', 'lost_found_update');
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists audit_lost_found_item_status_trigger on public.lost_found_items;
create trigger audit_lost_found_item_status_trigger after update on public.lost_found_items
for each row execute function public.audit_lost_found_item_status();

alter table public.lost_found_items enable row level security;
alter table public.lost_found_private_contacts enable row level security;
alter table public.lost_found_matches enable row level security;
alter table public.campus_services enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_ticket_history enable row level security;
alter table public.support_ticket_messages enable row level security;
alter table public.support_ticket_internal_notes enable row level security;
alter table public.support_ticket_reporters enable row level security;
alter table public.feedback_submissions enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists lf_items_public_read on public.lost_found_items;
create policy lf_items_public_read on public.lost_found_items for select to authenticated using (status in ('open', 'potential_match') or reporter_id = auth.uid() or public.is_current_user_admin());
drop policy if exists lf_items_owner_insert on public.lost_found_items;
create policy lf_items_owner_insert on public.lost_found_items for insert to authenticated with check (
  reporter_id = auth.uid() and status = 'open'
  and not exists (select 1 from jsonb_array_elements_text(image_paths) as item_path(path) where split_part(item_path.path, '/', 1) <> auth.uid()::text)
);
drop policy if exists lf_items_owner_update on public.lost_found_items;
create policy lf_items_owner_update on public.lost_found_items for update to authenticated using (reporter_id = auth.uid() and status in ('open', 'potential_match')) with check (
  reporter_id = auth.uid() and status in ('open', 'potential_match', 'closed')
  and not exists (select 1 from jsonb_array_elements_text(image_paths) as item_path(path) where split_part(item_path.path, '/', 1) <> auth.uid()::text)
);
drop policy if exists lf_items_admin_manage on public.lost_found_items;
create policy lf_items_admin_manage on public.lost_found_items for all to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());

drop policy if exists lf_contact_owner_staff on public.lost_found_private_contacts;
create policy lf_contact_owner_staff on public.lost_found_private_contacts for all to authenticated using (
  exists (select 1 from public.lost_found_items i where i.id = item_id and i.reporter_id = auth.uid())
  or public.is_current_user_admin()
) with check (
  exists (select 1 from public.lost_found_items i where i.id = item_id and i.reporter_id = auth.uid())
  or public.is_current_user_admin()
);

drop policy if exists lf_matches_participants_read on public.lost_found_matches;
create policy lf_matches_participants_read on public.lost_found_matches for select to authenticated using (
  public.is_current_user_admin() or exists (
    select 1 from public.lost_found_items i where i.id in (lost_item_id, found_item_id) and i.reporter_id = auth.uid()
  )
);
drop policy if exists lf_matches_no_direct_writes on public.lost_found_matches;
create policy lf_matches_no_direct_writes on public.lost_found_matches for insert to authenticated with check (false);
drop policy if exists lf_matches_admin_update on public.lost_found_matches;
create policy lf_matches_admin_update on public.lost_found_matches for update to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());

drop policy if exists campus_services_authenticated_read on public.campus_services;
create policy campus_services_authenticated_read on public.campus_services for select to authenticated using (is_active or public.is_current_user_admin());
drop policy if exists campus_services_admin_manage on public.campus_services;
create policy campus_services_admin_manage on public.campus_services for all to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());

drop policy if exists support_tickets_participant_read on public.support_tickets;
create policy support_tickets_participant_read on public.support_tickets for select to authenticated using (
  public.is_support_ticket_owner(id) or assigned_to = auth.uid() or public.is_current_user_admin()
);
drop policy if exists support_ticket_owner_insert on public.support_tickets;
create policy support_ticket_owner_insert on public.support_tickets for insert to authenticated with check (
  assigned_to is null and status = 'submitted'
  and (ticket_type = 'complaint' or exists (
    select 1 from public.campus_services s where s.id = service_id and s.is_active and s.service_type = 'request'
  ))
);
drop policy if exists support_tickets_privileged_update on public.support_tickets;
create policy support_tickets_privileged_update on public.support_tickets for update to authenticated using (
  public.is_current_user_admin() or (public.is_authorized_support_staff() and assigned_to = auth.uid())
) with check (
  public.is_current_user_admin() or (public.is_authorized_support_staff() and assigned_to = auth.uid())
);

drop policy if exists support_history_participant_read on public.support_ticket_history;
create policy support_history_participant_read on public.support_ticket_history for select to authenticated using (
  public.is_current_user_admin() or exists (
    select 1 from public.support_tickets t where t.id = ticket_id and (public.is_support_ticket_owner(t.id) or t.assigned_to = auth.uid())
  )
);
drop policy if exists support_history_no_client_insert on public.support_ticket_history;
create policy support_history_no_client_insert on public.support_ticket_history for insert to authenticated with check (false);

drop policy if exists support_messages_participant_read on public.support_ticket_messages;
create policy support_messages_participant_read on public.support_ticket_messages for select to authenticated using (
  (visibility = 'public' and exists (select 1 from public.support_tickets t where t.id = ticket_id and (public.is_support_ticket_owner(t.id) or t.assigned_to = auth.uid() or public.is_current_user_admin())))
  or (visibility = 'internal' and (public.is_current_user_admin() or exists (select 1 from public.support_tickets t where t.id = ticket_id and t.assigned_to = auth.uid() and public.is_authorized_support_staff())))
);
drop policy if exists support_messages_participant_insert on public.support_ticket_messages;
create policy support_messages_participant_insert on public.support_ticket_messages for insert to authenticated with check (
  sender_id = auth.uid() and (
    (visibility = 'public' and exists (select 1 from public.support_tickets t where t.id = ticket_id and (public.is_support_ticket_owner(t.id) or t.assigned_to = auth.uid() or public.is_current_user_admin())))
    or (visibility = 'internal' and (public.is_current_user_admin() or exists (select 1 from public.support_tickets t where t.id = ticket_id and t.assigned_to = auth.uid() and public.is_authorized_support_staff())))
  ) and not exists (
    select 1 from jsonb_array_elements_text(attachment_paths) as file_path(path)
    where not public.owns_campus_support_object(file_path.path)
  )
);

drop policy if exists support_notes_staff_read on public.support_ticket_internal_notes;
create policy support_notes_staff_read on public.support_ticket_internal_notes for select to authenticated using (
  public.is_current_user_admin() or exists (select 1 from public.support_tickets t where t.id = ticket_id and t.assigned_to = auth.uid() and public.is_authorized_support_staff())
);
drop policy if exists support_notes_staff_insert on public.support_ticket_internal_notes;
create policy support_notes_staff_insert on public.support_ticket_internal_notes for insert to authenticated with check (
  author_id = auth.uid() and (public.is_current_user_admin() or exists (select 1 from public.support_tickets t where t.id = ticket_id and t.assigned_to = auth.uid() and public.is_authorized_support_staff()))
);

drop policy if exists feedback_owner_admin_read on public.feedback_submissions;
create policy feedback_owner_admin_read on public.feedback_submissions for select to authenticated using (submitted_by = auth.uid() or public.is_current_user_admin());
drop policy if exists feedback_owner_insert on public.feedback_submissions;
create policy feedback_owner_insert on public.feedback_submissions for insert to authenticated with check (submitted_by = auth.uid() and status = 'submitted' and admin_response is null);
drop policy if exists feedback_admin_update on public.feedback_submissions;
create policy feedback_admin_update on public.feedback_submissions for update to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());

drop policy if exists audit_logs_admin_read on public.audit_logs;
create policy audit_logs_admin_read on public.audit_logs for select to authenticated using (public.is_current_user_admin());
drop policy if exists audit_logs_no_client_write on public.audit_logs;
create policy audit_logs_no_client_write on public.audit_logs for all to authenticated using (false) with check (false);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('campus-support-private', 'campus-support-private', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists campus_support_private_upload on storage.objects;
create policy campus_support_private_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'campus-support-private' and owner_id = auth.uid()::text
);
drop policy if exists campus_support_private_owner_read on storage.objects;
create policy campus_support_private_owner_read on storage.objects for select to authenticated using (
  bucket_id = 'campus-support-private' and (
    owner_id = auth.uid()::text
    or public.is_current_user_admin()
    or public.can_read_support_attachment(name)
  )
);
drop policy if exists campus_support_private_owner_delete on storage.objects;
create policy campus_support_private_owner_delete on storage.objects for delete to authenticated using (
  bucket_id = 'campus-support-private' and owner_id = auth.uid()::text
);

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'event_registration', 'event_reminder', 'event_cancelled', 'event_updated', 'ticket_issued',
  'internship_deadline', 'application_updated', 'interview_reminder', 'internship_published',
  'attendance_warning', 'academic_update', 'class_reminder', 'resource_published',
  'message', 'mention', 'club_join_approval', 'club_invitation', 'project_team_invitation',
  'club_activity', 'team_task', 'message_reaction', 'message_reply', 'support_update',
  'lost_found_update', 'feedback_response'
));

grant select, insert, update on public.lost_found_items to authenticated;
grant select, insert, update on public.lost_found_private_contacts to authenticated;
grant select on public.lost_found_matches to authenticated;
grant select, insert, update, delete on public.campus_services to authenticated;
revoke select on public.support_tickets from public, anon, authenticated;
grant select (id, reference_code, ticket_type, service_id, category, subject, description, priority, status, assigned_to, is_anonymous, location_description, resolution_summary, resolved_at, created_at, updated_at)
  on public.support_tickets to authenticated;
grant insert (ticket_type, service_id, created_by, category, subject, description, priority, is_anonymous, location_description, contact_method)
  on public.support_tickets to authenticated;
grant select on public.support_ticket_history to authenticated;
revoke select on public.support_ticket_messages from public, anon, authenticated;
grant insert (ticket_id, sender_id, message, visibility, attachment_paths) on public.support_ticket_messages to authenticated;
grant select, insert on public.support_ticket_internal_notes to authenticated;
grant select, insert, update on public.feedback_submissions to authenticated;
grant select on public.audit_logs to authenticated;
grant select on public.campus_service_requests to authenticated;
revoke insert, update, delete on public.audit_logs, public.support_ticket_history from anon, authenticated;
revoke update on public.support_tickets from anon, authenticated;
revoke update on public.feedback_submissions from anon, authenticated;
revoke select on public.lost_found_items from public, anon, authenticated;
grant select (id, report_type, title, description, category, location_description, occurred_at, status, resolved_at, created_at)
  on public.lost_found_items to authenticated;
revoke update on public.lost_found_items from anon, authenticated;
grant update (title, description, category, location_description, occurred_at, status, updated_at)
  on public.lost_found_items to authenticated;
revoke select on public.lost_found_matches from public, anon, authenticated;
grant select (id, lost_item_id, found_item_id, status, lost_owner_confirmed, found_owner_confirmed, created_at)
  on public.lost_found_matches to authenticated;
grant execute on function public.get_my_lost_found_items() to authenticated;
revoke all on function public.create_lost_found_report(text, text, text, text, text, date, jsonb, text) from public, anon;
grant execute on function public.create_lost_found_report(text, text, text, text, text, date, jsonb, text) to authenticated;
revoke all on function public.get_support_ticket_contact(uuid) from public, anon;
grant execute on function public.get_support_ticket_contact(uuid) to authenticated;
revoke all on function public.get_support_ticket_messages(uuid) from public, anon;
grant execute on function public.get_support_ticket_messages(uuid) to authenticated;
revoke all on function public.can_read_support_attachment(text) from public, anon;
grant execute on function public.can_read_support_attachment(text) to authenticated;
revoke all on function public.owns_campus_support_object(text) from public, anon;
grant execute on function public.owns_campus_support_object(text) to authenticated;
grant execute on function public.suggest_lost_found_match(uuid, uuid) to authenticated;
grant execute on function public.review_lost_found_match(uuid, text) to authenticated;
grant execute on function public.manage_support_ticket(uuid, text, uuid, text, boolean, text) to authenticated;
grant execute on function public.review_feedback(uuid, text, text) to authenticated;
grant execute on function public.is_authorized_support_staff() to authenticated;

commit;
