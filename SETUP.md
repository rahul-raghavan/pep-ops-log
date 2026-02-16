# PEP Ops Logger - Setup Guide

## Overview

PEP Ops Logger is an internal tool for PEP School to record and review operational observations about staff (nannies, drivers).

## Prerequisites

- Node.js 20+ (recommended)
- Supabase account
- OpenAI API key (for voice transcription)
- Vercel account (for deployment)
- Google Cloud Console project (for OAuth)

## 1. Supabase Setup

### Create Project

1. Go to [Supabase](https://supabase.com) and create a new project
2. Note down your project URL and anon key from Settings > API

### Run Database Schema

1. Go to SQL Editor in your Supabase dashboard
2. Copy and run the entire contents of `supabase/schema.sql`
3. This will create all tables, indexes, RLS policies, and seed initial data

### Configure Google OAuth

1. Go to Authentication > Providers > Google
2. Enable Google provider
3. You'll need the Client ID and Secret from Google Cloud Console (see step 3)

## 2. Google Cloud Console Setup

### Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Go to APIs & Services > Credentials
4. Click "Create Credentials" > "OAuth client ID"
5. Select "Web application"
6. Add authorized redirect URIs:
   - `https://your-project.supabase.co/auth/v1/callback` (for Supabase)
   - `http://localhost:3000/api/auth/callback` (for local dev)
   - `https://pepschoolv2.com/api/auth/callback` (for production)
7. Copy the Client ID and Client Secret
8. Add these to Supabase Authentication > Providers > Google

## 3. Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OpenAI (for Whisper transcription)
OPENAI_API_KEY=sk-your-openai-api-key
```

## 4. Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## 5. Vercel Deployment

### Connect Repository

1. Push code to GitHub
2. Go to [Vercel](https://vercel.com) and import the repository
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`

### Custom Domain

1. Go to your project settings in Vercel
2. Add custom domain: `pepschoolv2.com`
3. Follow DNS configuration instructions

### Update Supabase Redirect URL

After deployment, add the production callback URL to:
1. Supabase > Authentication > URL Configuration > Redirect URLs:
   - `https://pepschoolv2.com/api/auth/callback`

## Initial Data (Already Seeded)

The database schema includes seed data for:

### Centers
- HSR
- Whitefield
- Varthur
- Kokapet

### Super Admins
- rahul@pepschoolv2.com
- chetan@pepschoolv2.com

### Managers
- harish@pepschoolv2.com (assigned to all centers)

### Subjects
- Padma (Nanny, HSR)
- Mallikarjun (Driver, HSR)

### Observation Types
- Punctuality
- Safety
- Hygiene
- Communication
- Procedure
- Parent Feedback
- Other

## Allowed Email Domains

Only users with emails from these domains can log in:
- pepschoolv2.com
- accelschool.in
- ribbons.education

To add more domains, edit `src/lib/auth.ts`.

## Features

### For Managers
- Log observations (voice or text)
- View subjects in assigned centers
- View observation history
- See analytics for assigned centers

### For Super Admins
- All manager capabilities
- Manage centers
- Manage users (create/edit managers and admins)
- Assign centers to managers
- Link managers to subjects (for self-visibility restriction)
- Configure observation types

## Security Notes

- Row Level Security (RLS) is enabled on all tables
- Self-visibility restriction: If a manager is also a subject, they cannot view observations about themselves
- Center-based access control: Managers only see data from their assigned centers
- Domain restriction: Only allowed email domains can authenticate
