# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This App Is

PEP Ops Logger — a school staff observation tracking tool. Managers log observations about staff (nannies, drivers) at different school centers. Super admins manage the system. Observations can be voice-recorded, transcribed, and summarized by AI.

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — run ESLint

No test framework is set up yet.

## Tech Stack

- **Next.js 16** (App Router, React 19, TypeScript)
- **Supabase** — auth (Google OAuth), database (Postgres), Row Level Security
- **shadcn/ui** (new-york style) with Tailwind CSS v4
- **AI APIs** — OpenAI Whisper for voice transcription, Anthropic Claude for polishing transcriptions and generating observation summaries

## Architecture

### Route Groups

- `(auth)/` — login page, unauthenticated layout
- `(dashboard)/` — all authenticated pages wrapped in `DashboardLayout` (sidebar + header)

### Auth Flow

1. Google OAuth only, restricted to specific email domains (see `ALLOWED_DOMAINS` in `src/lib/auth.ts`)
2. Middleware (`src/middleware.ts` → `src/lib/supabase/middleware.ts`) redirects unauthenticated users to `/login` and logged-in users away from `/login`
3. After OAuth callback, the app checks the `users` table — the user must exist there AND be `is_active` to access anything
4. Two Supabase client factories: `src/lib/supabase/server.ts` (Server Components/API routes) and `src/lib/supabase/client.ts` (Client Components)

### Roles & Permissions

- **super_admin** — full access to all centers, can manage users/centers/settings
- **manager** — scoped to assigned centers via `user_centers` table; can log observations, view subjects
- Self-visibility restriction: managers linked to a subject (`linked_subject_id`) cannot view observations about themselves

All access control is enforced at two levels: app-side checks in `src/lib/auth.ts` AND Supabase RLS policies in `supabase/schema.sql`.

### Data Model

Core tables: `centers`, `users`, `user_centers` (many-to-many), `subjects` (staff being observed), `observations`, `observation_summaries`, `observation_type_config`. TypeScript types mirror these in `src/types/database.ts`.

### API Routes

- `POST /api/transcribe` — accepts audio file, transcribes via OpenAI Whisper, polishes text via Claude
- `POST /api/summary` — generates AI summary of a subject's observations using Claude, caches results in `observation_summaries` table
- `GET /api/auth/callback` — handles Supabase OAuth redirect

### Environment Variables

Defined in `.env.local` (see `.env.local.example`):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase connection
- `OPENAI_API_KEY` — Whisper transcription
- `ANTHROPIC_API_KEY` — Claude summaries and transcription polishing

### Database Setup

SQL schema lives in `supabase/schema.sql` (includes RLS policies and seed data). Additional migration in `supabase/add_summaries.sql`.
