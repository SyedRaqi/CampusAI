-- Explicitly marked demo-only academic catalog values; none are official AIT offerings.
-- Edit or remove these rows after an administrator configures the institution's catalog.
insert into public.branches (code, name, is_demo) values
  ('CS-DEMO', 'Computer Science', true),
  ('DS-DEMO', 'Data Science', true),
  ('IS-DEMO', 'Information Science', true),
  ('AIML-DEMO', 'Artificial Intelligence & Machine Learning', true),
  ('EC-DEMO', 'Electronics', true),
  ('ME-DEMO', 'Mechanical', true),
  ('CE-DEMO', 'Civil', true)
on conflict (code) do nothing;

insert into public.semesters (number, label)
select n, 'Semester ' || n from generate_series(1, 8) as n
on conflict (number) do nothing;

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

-- Demo subject names are examples only, not AIT's official current syllabus.
insert into public.subjects (subject_code, subject_name, branch_id, semester, description, is_demo)
select demo.subject_code, demo.subject_name, b.id, demo.semester, 'DEMO SUBJECT - verify with the current institutional syllabus.', true
from (values
  ('DBMS-DEMO', 'Database Management Systems', 'CS-DEMO', 4),
  ('OS-DEMO', 'Operating Systems', 'CS-DEMO', 4),
  ('CN-DEMO', 'Computer Networks', 'CS-DEMO', 5),
  ('DSA-DEMO', 'Data Structures', 'CS-DEMO', 3),
  ('ML-DEMO', 'Machine Learning', 'AIML-DEMO', 6),
  ('EDA-DEMO', 'Exploratory Data Analysis', 'DS-DEMO', 5),
  ('SE-DEMO', 'Software Engineering', 'CS-DEMO', 5),
  ('WT-DEMO', 'Web Technology', 'CS-DEMO', 6)
) as demo(subject_code, subject_name, branch_code, semester)
join public.branches b on b.code = demo.branch_code
on conflict (subject_code, branch_id, semester) do nothing;
