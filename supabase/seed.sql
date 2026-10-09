-- Sample event rows are created only after a trusted faculty/admin profile exists.
-- Create auth users first, then assign faculty/admin roles using a trusted admin process.
do $$
declare
  organizer public.profiles%rowtype;
begin
  select * into organizer
  from public.profiles
  where role in ('faculty', 'admin')
  order by created_at
  limit 1;

  if organizer.id is null then
    raise notice 'No faculty/admin profile found; skipping sample events.';
    return;
  end if;

  insert into public.events (
    title, slug, description, short_description, category, organizer_name,
    organizer_profile_id, venue, event_date, start_time, end_time,
    registration_deadline, capacity, banner_image_url, status, is_featured, created_by
  ) values
    (
      'AI & Machine Learning Workshop', 'ai-machine-learning-workshop',
      'Explore practical foundations of AI and machine learning with hands-on sessions and mentoring.',
      'Practical AI workshop with hands-on projects and mentoring.', 'Technical', organizer.full_name,
      organizer.id, 'Seminar Hall A', '2026-10-12', '10:00', '13:00',
      '2026-10-10 18:00:00+05:30', 120,
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
      'published', true, organizer.auth_user_id
    ),
    (
      'CodeSprint Hackathon', 'codesprint-hackathon',
      'A campus innovation sprint for teams to build ideas and pitch to mentors and judges.',
      'Build prototypes, collaborate, and pitch your idea in 24 hours.', 'Hackathon', organizer.full_name,
      organizer.id, 'Innovation Hub', '2026-10-18', '09:00', '18:00',
      '2026-10-15 17:00:00+05:30', 80,
      'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
      'published', true, organizer.auth_user_id
    ),
    (
      'Annual Cultural Fest', 'annual-cultural-fest',
      'A cultural celebration featuring music, dance, art, theatre, and student showcases.',
      'Cultural celebration featuring music, dance, art, and performances.', 'Cultural', organizer.full_name,
      organizer.id, 'Open Air Theatre', '2026-11-02', '17:00', '21:30',
      '2026-10-30 12:00:00+05:30', 200,
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80',
      'published', true, organizer.auth_user_id
    )
  on conflict (slug) do nothing;
end;
$$;
