# Persistent Notes & Decisions

## Decisions Made
- Toast provider wraps dashboard layout (not root layout) to avoid affecting login page
- Modal component uses backdrop click + Escape key to close
- StatCard href wraps entire card in Next.js Link
- DataTable actions render in a dedicated last column
- Timestamps use Turkey timezone (Europe/Istanbul) by default
- Pink (#FF6B9D) used for female gender in charts
- "Moderation" renamed to "Safety" (sidebar, header, page title)
- QR Codes page removed; replaced with external "QR Board" link to https://qr.goodmonkeys.com/
- Google Analytics removed entirely
- Gender enum uses underscores: `prefer_not_to_say` (not spaces)

## Deferred Items
- Block user feature: waiting for app-side support
- GA removed — was placeholder, never configured with real ID

## Supabase Tables

### Core identity & inventory
- **users** — user profiles (name, username, email, avatar, bio, DOB, gender, country, points, status, push token, privacy + notification + location prefs). PK: `user_id` (integer). Also has `uuid` (Supabase auth UUID).
- **lighters** — individual lighters/devices (nickname, qr_code, lighter_status, is_tracked, total_owners_count, photo_url, status_updated_at, times_lost_count). PK: `lighter_id`.
- **lighter_ownership** — full ownership history per lighter (user_id, lighter_id, acquisition_type, acquisition_date/location/lat/lng, is_current_owner, is_night_scan, ownership_start).
- **lighter_codes** — QR/short-code registry mapping codes → lighter_id (serial_code, short_code, status like registered/unregistered).

### Social graph & messaging
- **friendships** — friend connections (user_id, friend_id, status: pending/accepted).
- **conversations** — chat threads (1-on-1 and group).
- **conversation_members** — which users are in which conversation.
- **messages** — individual chat messages (sender_user_id, conversation_id, message_text, created_at).

### Lighter-journey events
- **found_reports** — "I found this lighter" submissions (finder_user_id, lighter_id, found_lat/lng/location_name, found_at).
- **lost_reports** — "My lighter is lost" submissions (reported_by_user_id, lighter_id, last_known_lat/lng/location_name, lost_date).
- **transfer_requests** — ownership transfer proposals (sender_user_id, recipient_user_id, lighter_id, status).
- **favorite_lighters** — starred lighters + "main lighter" designation (user_id, lighter_id, notes='main_lighter' marks the daily check-in target).

### Content
- **posts** — user posts (user_id, media_url, caption, deleted_at for soft-delete).
- **lighter_posts** — junction table linking lighters to posts (lighter_id, post_id).
- **comments** — post comments.
- **likes** — post likes.

### Moderation
- **reports** — user-on-user reports (reporter_user_id, reported_user_id/content_id, content_type, reason, status, priority). PK: `report_id`. Uses integer `reporter_user_id`.
- **blocks** — user block list (blocker_user_id, blocked_user_id).
- **flagged_content** — auto-flagged content (content_type, content_id, flag_reason, confidence_score, status).
- **banned_users** — banned user records (user_id, ban_type, reason, duration_days, expires_at, appeal_status).
- **moderation_actions** — moderation action log.
- **user_warnings** — user warning records.

### Gamification
- **point_transactions** / **points_transactions** — point ledger (user_id, points, transaction_type earn/spend, action_type, reference_id).
- **user_badges** — badges earned (user_id, badge_id, earned_at).
- **badges** — badge catalog (badge_id, badge_name, badge_description, badge_category, icon/rarity/points).
- **leaderboard_stats** — leaderboard data.

### In-app notifications
- **notifications** — notification feed shown inside the app (user_id, type, title, message, reference_id, is_read, action_url JSON).

### Support / feedback
- **report_problems** — in-app "Report a problem" form submissions. **IMPORTANT: `user_id` stores Supabase auth UUID (string), NOT integer user_id.** Fields: name, email, problem_type, description, status.
- **support_messages** — "Contact us" form submissions. **IMPORTANT: `user_id` stores Supabase auth UUID (string), NOT integer user_id.** Fields: name, email, subject, message, status.
- **support_tickets** — formal support ticket system. `user_id` is integer FK to `users.user_id`. Fields: ticket_number, category, priority, status, subject, description, assigned_to, satisfaction_rating.
- **ticket_messages** — messages within support tickets (ticket_id, user_id, is_agent, message, is_internal_note).
- **user_feedback** — user feedback submissions. `user_id` is integer FK to `users.user_id`. Fields: feedback_type, subject, message, app_version, device_model, os_version, screenshot_urls, status.

### Other
- **lighter_location_history** — location tracking history for lighters.
- **lighter_followers** — users following lighters.
- **ownership_claims** — ownership claim submissions.
- **social_auth** — social login records.
- **password_resets** — password reset tokens.
- **user_sessions** — user session tracking.
- **system_config** — system configuration.
- **system_logs** — system log entries.
- **admin_audit_log** — admin action audit log.
- **announcements** / **announcement_views** — system announcements.
- **faqs** / **faq_categories** — FAQ system.
- **contests** / **contest_entries** / **contest_winners** — contest system.
- **daily_analytics_snapshots** — daily analytics data.
- **geo_analytics** — geographic analytics.
- **feature_usage_tracking** — feature usage stats.
- **user_retention_cohorts** — retention cohort data.
- **export_jobs** — data export job records.
- **maintenance_mode** — maintenance mode toggle.

## Key Gotchas
- `report_problems.user_id` and `support_messages.user_id` use Supabase auth UUID (string), not integer `users.user_id`. Join via `users.uuid` field.
- `user_feedback.user_id` and `support_tickets.user_id` use integer FK to `users.user_id` (normal join).
- `lighters` table has `photo_url` for main photo. NO separate `lighter_photos` table exists.
- Post photos linked to lighters via junction: `lighter_posts` → `posts.media_url`.
- Database enum `gender_type` uses underscores: `prefer_not_to_say`.
