# Phase 9 Campus Support Setup

Phase 9 adds campus support to the existing CampusConnect application. It does not seed official services, contacts, opening hours, campus rules, or sample cases. Configure only information verified by the institution.

## Apply the migration

The migration is `supabase/migrations/202610090001_phase9_campus_support.sql`. Apply the earlier Phase 7 and Phase 8 migrations first, then apply Phase 9 to the correct Supabase project:

1. Confirm the Supabase project reference and take the project's normal backup.
2. Apply pending migrations in order with `npx supabase db push`, or run this migration in the Supabase SQL Editor after confirming the earlier migrations are present.
3. Verify that `lost_found_items`, `lost_found_matches`, `lost_found_private_contacts`, `campus_services`, `support_tickets`, `support_ticket_reporters`, `support_ticket_history`, `support_ticket_messages`, `support_ticket_internal_notes`, `campus_service_requests`, `feedback_submissions`, and `audit_logs` exist and have RLS enabled.
4. Verify the private `campus-support-private` Storage bucket and its policies were created.
5. Confirm that the migration's notification-type constraint includes `support_update` and `lost_found_update`.

If `audit_logs` already exists in the project, inspect its columns and constraints before applying this migration. The migration uses `CREATE TABLE IF NOT EXISTS`, so it will not reshape an existing audit table; it must support the `actor_id`, `action`, `target_type`, `target_id`, `metadata`, and `created_at` fields used here.

Service requests use the shared `support_tickets` workflow. `campus_service_requests` is a restricted relation keyed to the corresponding service ticket; it is not an independent ticket engine.

## Configure real campus data

Sign in as an administrator and use `/admin/campus-services` to add verified service entries. Contact information, location, and opening hours are optional and should remain blank until confirmed. Add no fake/demo services.

The admin support queue is `/admin/support` (also `/admin/complaints`). Add authorized campus staff to existing faculty/admin profiles before assigning a case. Staff can see only assigned cases; administrators can manage the full queue.

## Routes

- `/support` — support center and own recent cases
- `/support/faq` — published Phase 7 campus FAQs
- `/support/complaints/new`, `/support/complaints`, `/support/complaints/:complaintId`, `/support/my-complaints`
- `/lost-found`, `/lost-found/report-lost`, `/lost-found/report-found`, `/lost-found/:itemId`, `/lost-found/my-reports`
- `/feedback`, `/feedback/new`, `/feedback/my-feedback`
- `/campus-services`, `/campus-services/:serviceId`, `/campus-services/:serviceId/request`, `/my-service-requests`
- `/faculty/support`
- `/admin/support`, `/admin/complaints`, `/admin/complaints/:complaintId`, `/admin/lost-found`, `/admin/feedback`, `/admin/campus-services`

## AI and configuration

No new frontend environment variables or provider keys are needed. The optional request-drafting and authorized case-summary actions call the existing authenticated `ai-chat` Edge Function through the existing AI service. They require the existing Phase 7 Supabase AI setup. AI text is advisory and never submits or decides a case automatically.

## Live verification checklist

After applying the migration, test with separate student, assigned faculty, and administrator accounts:

- Submit a lost or found report, upload a private photo, edit or withdraw the report, and verify unrelated accounts cannot read its contact information or private photo.
- Suggest a lost/found pair; verify both report owners must confirm before recovery can be recorded.
- Submit identified and anonymous complaints and service requests. Verify the requester can track each by its authenticated account and assigned faculty cannot see anonymous identity from the ticket record.
- Verify assigned faculty cannot retrieve an anonymous reporter's sender UUID or private contact method, and that ticket-attachment object paths do not encode the uploader's UUID.
- Verify public ticket messages are visible to participants, while internal notes/messages remain staff-only.
- Assign and reassign tickets, request more information, resolve with a summary, and verify history, audit rows, and generic notifications.
- Submit and review feedback. Verify only administrators can change its status or response.
- Add and edit a service using verified content; submit and track a service request.
- Attempt cross-user ID access for reports, tickets, messages, notes, feedback, and Storage objects; confirm RLS denies it.
- Check layouts at 320, 375, 768, 1024, and 1440 CSS pixels.

The migration has not been applied to a live Supabase project as part of this implementation. Live RLS, Storage, notifications, and AI flows must be verified there before calling the phase production-verified.
