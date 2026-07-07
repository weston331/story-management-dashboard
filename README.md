# Siraj Al-Athar — Story Management Dashboard

## Quick Start
1. Copy `.env.example` to `.env` and fill in your Supabase credentials
2. `npm install`
3. `npm run dev`

## Database Setup
Run these SQL files once in Supabase SQL Editor:
- `supabase_rls_policies.sql` — Secure RLS policies
- `migration_add_status.sql` — Adds publication status column

## Tables
- `ahlulbayt_stories` + `ahlulbayt_story_blocks`
- `stories` + `chapter_blocks` + `chapters` (prophet stories)
- `user_roles` (admin / writer)

## Review Workflow
Stories move through: draft -> review -> published

## Roles
- admin: full access
- writer: own stories only

## Project Structure
src/App.tsx | Sidebar.tsx | MainEditorPanel.tsx | AddStoryModal.tsx
src/services/supabase.ts | src/services/logger.ts
src/types/index.ts | src/types/locale.ts
