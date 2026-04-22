# Flick! Admin Dashboard - Project Context

## Overview
Admin dashboard for the Flick! lighter tracking app. Built with Next.js 16.1.6, React 19, Tailwind CSS v4, Supabase (70+ tables), and Recharts.

## Tech Stack
- **Framework:** Next.js 16.1.6 (App Router)
- **UI:** React 19, Tailwind CSS 4, Radix UI, Lucide icons
- **Backend:** Supabase (PostgreSQL)
- **Charts:** Recharts 3.8
- **Auth:** Supabase Auth with role-based access (admin/subadmin)

## Design System
- Dark mode only
- Primary accent: Yellow (#FDD835)
- Danger: Red (#FB2C36)
- Success: Green (#00C950)
- Info: Cyan (#00D9FF)
- Warning: Orange (#FF6B35)
- Pink: (#FF6B9D) - used for female gender chart
- Cards: rounded-2xl, bg-card (#12121A)
- Font: Inter

## Key Tables
- `users` - User accounts (user_id, uuid, full_name, username, email, gender, user_status, user_level, total_points, etc.)
- `lighters` - Lighter objects (lighter_id, qr_code, nickname, model_name, lighter_status 0-4)
- `lighter_ownership` - Ownership history
- `lighter_codes` - QR code inventory
- `lost_reports` - Lost lighter reports
- `found_reports` - Found lighter reports
- `ownership_claims` - Ownership disputes
- `posts` - User content
- `messages` - Direct messages
- `friendships` - Social connections
- `points_transactions` - Point history
- `reports` - Content reports
- `flagged_content` - AI-flagged content
- `banned_users` - Ban records

## Lighter Status Codes
- 0: Unregistered
- 1: Registered
- 2: Lost
- 3: Discarded
- 4: Found

## Dev Server
Running at `localhost:3000`
