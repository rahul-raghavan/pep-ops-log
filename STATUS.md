# PEP Ops Logger - Project Status

## Overview
Internal tool for PEP School to record and manage observations about staff (nannies, drivers, managers).

## Tech Stack
- **Frontend**: Next.js 16 (App Router), React, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth)
- **APIs**:
  - OpenAI Whisper (voice transcription)
  - Anthropic Claude (AI summaries + transcription polishing)
- **Auth**: Google OAuth via Supabase

## Completed Features

### Core Functionality
- [x] User authentication with Google OAuth
- [x] Role-based access (super_admin, manager)
- [x] Multi-center support with center switching
- [x] Staff management (add, edit, activate/deactivate)
- [x] Observation logging with voice recording
- [x] Observation types (punctuality, safety, hygiene, etc.)

### Dashboard
- [x] Stats cards (Active Staff, This Week, All Observations)
- [x] Recent observations list with links to staff profiles
- [x] Center-based filtering

### AI Features
- [x] AI-generated summaries of staff observations (`/api/summary`)
  - Uses Claude claude-sonnet-4-20250514
  - Caching: reuses summary if no new observations
  - Regeneration option
  - Date filter for custom time periods
  - Stored in `observation_summaries` table
- [x] Voice transcription polishing (`/api/transcribe`)
  - Whisper transcribes audio
  - Claude adds paragraphs and cleans up text

### Admin Features
- [x] Super admin can delete observations
- [x] Manage centers
- [x] Manage managers and their center access
- [x] Link managers to staff profiles (for self-observations)

### UI/UX
- [x] Mobile-responsive design throughout
- [x] Compact staff cards (clickable, sleek design)
- [x] Optimized mobile view for log observation page
- [x] Fixed text wrapping issues on dashboard stats

## Database Tables
- `users` - App users (managers, super_admins)
- `centers` - School centers/locations
- `user_centers` - User-center access mapping
- `subjects` - Staff members being observed
- `observations` - Logged observations
- `observation_type_config` - Configurable observation types
- `observation_summaries` - Cached AI summaries

## Key Files

### Pages
- `/src/app/(dashboard)/dashboard/page.tsx` - Main dashboard
- `/src/app/(dashboard)/subjects/page.tsx` - Staff list
- `/src/app/(dashboard)/subjects/[id]/page.tsx` - Staff detail + observations
- `/src/app/(dashboard)/observations/new/page.tsx` - Log new observation
- `/src/app/(dashboard)/admin/managers/page.tsx` - Manage managers

### API Routes
- `/src/app/api/transcribe/route.ts` - Voice transcription + polishing
- `/src/app/api/summary/route.ts` - AI summary generation

### Components
- `/src/components/observations/VoiceRecorder.tsx` - Voice recording UI
- `/src/components/observations/AISummary.tsx` - AI summary display
- `/src/components/layout/DashboardLayout.tsx` - Main layout with center context
- `/src/components/layout/Sidebar.tsx` - Desktop navigation
- `/src/components/layout/MobileNav.tsx` - Mobile bottom navigation

## Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

## Recent Changes (Latest Session)
1. Fixed "This Week" text wrapping on mobile dashboard
2. Removed whitespace above "Staff" on log observation page (mobile)
3. Made staff cards more compact and sleek (entire card is clickable)
4. Added AI polishing to voice transcriptions (adds paragraphs)

## Running the Project
```bash
npm install
npm run dev
```

## Database Migrations
- `supabase/migrations/` - Initial schema
- `supabase/add_summaries.sql` - Observation summaries table

## Known Issues / Future Improvements
- Consider adding analytics/charts page
- Could add bulk operations for staff management
- May want to add observation export functionality
