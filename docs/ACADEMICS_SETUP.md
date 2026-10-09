# Phase 8 Academic Operations Setup

Phase 8 is additive. It extends the existing `subjects` catalog and creates periods, sections, enrollment, faculty assignments, timetable, and attendance records. It does not recreate or replace the existing catalog.

## Database migration

Migration file: `supabase/migrations/202610080002_phase8_academics.sql`.

### Supabase Dashboard

1. Open the correct Supabase project and confirm it is the CampusConnect environment.
2. Open **SQL Editor** and create a new query.
3. Paste the complete migration file contents and run it.
4. Confirm that `academic_periods`, `academic_sections`, `student_subjects`, `faculty_subjects`, `timetable_entries`, `attendance_sessions`, `attendance_records`, `academic_attendance_settings`, and `attendance_audit_logs` exist.
5. Review **Authentication → Policies** (or the Table Editor RLS view) to confirm the policies from the migration are enabled.

Apply this migration only after the existing CampusConnect schema and earlier migrations have been installed. The migration depends on the existing `profiles`, `branches`, `semesters`, and `subjects` tables and `is_current_user_admin()` helper.

### Supabase CLI

From the application directory:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Review the pending migration list and target project before confirming `db push`. The CLI path requires project permissions to apply database migrations. If project access is denied, use the Dashboard SQL Editor method or ask a project owner to grant the required migration permissions.

## Initial academic configuration

1. Sign in as an administrator and open `/admin/academics`.
2. Create the academic period(s), using the actual institution dates and semester.
3. Create a subject section and assign the faculty member for that subject/period/section.
4. Add timetable slots using the same assignment. The database rejects overlapping bookings for a faculty member, room, or department/semester/section.
5. Confirm student profiles have the correct department, semester, and section. Student self-enrollment is restricted to their matching department/semester and an active configured section.
6. Faculty can open `/faculty/attendance`, create a session for an assigned section, and submit a status for each enrolled student. Correcting a previously saved status requires a reason and creates an append-only audit entry.
7. Set the recommended, warning, and critical attendance thresholds in the admin **Attendance thresholds** section. The defaults are 75%, 75%, and 60%.
8. Students can check `/academics`, `/timetable`, and `/attendance`. The attendance page includes the monthly trend and a projection that assumes future classes are attended; it is an estimate, not an official record.

## Authorization behavior

- Students see their own enrollment, schedule, and attendance only.
- Faculty see assigned teaching data and the minimum roster fields needed to take attendance.
- Administrators manage periods, sections, assignments, and timetable entries.
- Attendance writes are made through the authenticated `save_attendance` database function. The function checks the caller’s assignment, enrollment, roster completeness, correction reasons, and audit entries.
- Timetable conflicts are checked in a database trigger under a transaction advisory lock.
- Attendance percentage defaults to a 75% recommended threshold, treats late attendance as full attendance, and excludes excused sessions. Admins can adjust thresholds, the late weight, and the excused-session denominator setting from the admin workspace. Low attendance warnings are based on the configured warning threshold.

## Routes

- `/academics` — student subject catalog and enrollment
- `/academics/subjects/:subjectId` — authorized subject details and published resources
- `/timetable` — authorized schedule
- `/attendance` — student attendance summary
- `/faculty/academics` and `/faculty/attendance` — faculty session and attendance entry
- `/faculty/timetable` — faculty schedule
- `/admin/academics` — period, section, faculty assignment, and timetable configuration
- `/admin/subjects` — existing subject catalog administration

Student schedules and attendance are visible only for subjects in the student's own section. The admin workspace shows aggregate attendance analytics without student names; named rosters are exposed only to the assigned faculty for the relevant attendance session.

No client-side credentials or new environment variables are required for Phase 8. The existing Supabase publishable/anonymous browser key and RLS policies are used.
