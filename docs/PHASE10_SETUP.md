# Phase 10: Search, Notifications, Announcements and Analytics

Phase 10 adds authenticated campus-wide search, notification preferences and realtime updates, admin-managed announcements, aggregate admin analytics, and read-only audit-log reporting. The migration extends the existing notification system; it does not replace earlier phases.

## Before applying

1. Confirm the Supabase project reference and take the project's normal backup.
2. Ensure the Phase 7 AI/FAQ, Phase 8 academic, and Phase 9 campus-support migrations have been applied.
3. Review `supabase/migrations/202610100001_phase10_search_notifications_announcements_analytics.sql` against the target project's schema. It expects the existing `profiles`, `notifications`, `resources`, `subjects`, `resource_types`, `branches`, `events`, `internships`, `companies`, `clubs`, `project_teams`, `campus_faqs`, `campus_services`, `lost_found_items`, `audit_logs`, attendance, and AI usage tables.
4. Apply the migration using the project's established migration workflow (for example `npx supabase db push`) only after confirming the linked project. Do not apply it to an unintended production project.

The migration creates the private `campus-announcements-private` Storage bucket, policies, notification preference schema, announcement tables and RPCs, indexes, analytics/search RPCs, and attempts to configure Realtime and `pg_cron` where available. Search filters (resource subject/semester/department/type, event category/time, internship mode/type/skill, club category, and announcement category/date) are applied in the database query. Search results can be sorted by relevance or date. The monthly analytics trend is aggregated by the database and limited to the chosen module. The application does not require a new frontend environment variable or provider secret for this phase.

## Scheduled publishing fallback

If `pg_cron` is unavailable or the migration role cannot configure it, scheduled announcements will not publish automatically until an authorized operator configures a scheduler. Configure a trusted server-side scheduler (such as Supabase Cron) to execute:

```sql
select public.publish_due_announcements();
```

Run it once per minute or at another approved interval. The function is not executable by `anon` or `authenticated`; do not expose it through a client call. It publishes due, unexpired announcements and archives expired announcements. Check the `cron.job` entry named `campusconnect-publish-announcements` before adding another schedule.

## Administrator workflow

- `/admin/announcements` — review drafts, scheduled posts, and published posts.
- `/admin/announcements/create` — create and publish or schedule a verified campus notice.
- `/admin/analytics` — view aggregate module metrics for a bounded date range.
- `/admin/audit-logs` — filter and review audit records.

Create notices only from institutionally verified information. Target groups are role/department/semester/section combinations; separate audience rows are alternatives. An empty audience list is saved as an all-users audience. Uploaded attachments remain in a private bucket and are served only to eligible announcement readers and administrators.

## Manual verification

Use separate student, faculty, and administrator accounts after migration:

- Confirm `/search` results reflect the signed-in account's existing row-level access; try every category and pagination.
- Verify category-specific search filters, relevance/newest/oldest sorting, matched-text highlighting, and filter values reflected in the URL.
- Save/clear recent searches and verify another account cannot read them.
- Verify notification filters, dismiss/read actions, preferences, unread counts, and realtime updates; confirm disabled email options remain unavailable until an email delivery service is configured.
- Create a draft and a targeted announcement as an administrator. Verify unauthorized users cannot see the draft or attachment, authorized users can view/pin/read it, and required acknowledgements are recorded once per user.
- Schedule an announcement and verify automatic publication; if `pg_cron` is not configured, apply the fallback above before testing.
- Verify analytics and audit logs are admin-only and contain aggregate data / authorized audit fields, not private messages or AI conversation content.
- Compare a few monthly trend values with authorized source records and verify date, department, semester, and module filters.
- Test responsive layouts at 320, 375, 768, 1024, and 1440 CSS pixels.

The migration and UI have not been applied or tested against a live Supabase project as part of this implementation. Complete the checks above in the intended project before considering Phase 10 live-verified.
