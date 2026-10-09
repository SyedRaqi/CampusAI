-- These are non-real demo records for interface testing only.
-- Companies have no real URLs; internships have no application links or official sources.
do $$
declare
  demo_admin_id uuid;
  demo_company_id uuid;
begin
  select auth_user_id into demo_admin_id from public.profiles where role = 'admin' order by created_at limit 1;
  if demo_admin_id is null then
    raise notice 'No admin profile found; skip demo opportunity seed.';
    return;
  end if;

  insert into public.companies (name, description, industry, location, is_demo)
  values ('DEMO - Sample Software Company', 'Placeholder company record for UI testing only.', 'Demo data', 'Demo location', true)
  on conflict (name) do update set is_demo = true
  returning id into demo_company_id;

  insert into public.internships (
    company_id, role_title, description, short_description, location, work_mode, internship_type,
    duration, duration_months, stipend, stipend_currency, is_paid, skills, eligibility,
    application_deadline, status, source_type, is_demo, created_by
  ) values
    (demo_company_id, 'DEMO OPPORTUNITY — Software Engineering Intern', 'Placeholder description for testing the internship hub. This is not a real opening.', 'Demo record only. No real company, opening, or application link.', 'Demo location', 'remote', 'summer', '2 months', 2, null, 'INR', false, array['Python','SQL'], 'Demo eligibility text. Verify all details before using.', '2030-06-01 23:59:00+00', 'published', 'admin_added', true, demo_admin_id),
    (demo_company_id, 'DEMO OPPORTUNITY — Data Analyst Intern', 'Placeholder description for testing search, filters and application tracking.', 'Demo record only. No real company, opening, or application link.', 'Demo location', 'hybrid', 'academic', '3 months', 3, null, 'INR', false, array['SQL','Data Analysis'], 'Demo eligibility text. Verify all details before using.', '2030-07-01 23:59:00+00', 'published', 'admin_added', true, demo_admin_id),
    (demo_company_id, 'DEMO OPPORTUNITY — Machine Learning Intern', 'Placeholder description for testing skills matching and deadline labels.', 'Demo record only. No real company, opening, or application link.', 'Demo location', 'on_site', 'research', '4 months', 4, null, 'INR', false, array['Python','Machine Learning'], 'Demo eligibility text. Verify all details before using.', '2030-08-01 23:59:00+00', 'published', 'admin_added', true, demo_admin_id),
    (demo_company_id, 'DEMO OPPORTUNITY — Web Development Intern', 'Placeholder record for trying role and skill filters.', 'Demo record only. No real company, opening, or application link.', 'Demo location', 'remote', 'part_time', '3 months', 3, null, 'INR', false, array['React','JavaScript'], 'Demo eligibility text. Verify all details before using.', '2030-09-01 23:59:00+00', 'published', 'admin_added', true, demo_admin_id),
    (demo_company_id, 'DEMO OPPORTUNITY — Cybersecurity Intern', 'Placeholder record for testing a security-oriented career profile.', 'Demo record only. No real company, opening, or application link.', 'Demo location', 'hybrid', 'academic', '2 months', 2, null, 'INR', false, array['Networking','Security'], 'Demo eligibility text. Verify all details before using.', '2030-10-01 23:59:00+00', 'published', 'admin_added', true, demo_admin_id),
    (demo_company_id, 'DEMO OPPORTUNITY — UI/UX Design Intern', 'Placeholder record for testing creative role cards and filters.', 'Demo record only. No real company, opening, or application link.', 'Demo location', 'remote', 'summer', '2 months', 2, null, 'INR', false, array['Figma','Prototyping'], 'Demo eligibility text. Verify all details before using.', '2030-11-01 23:59:00+00', 'published', 'admin_added', true, demo_admin_id)
  on conflict (company_id, role_title) where is_demo do nothing;
end;
$$;
