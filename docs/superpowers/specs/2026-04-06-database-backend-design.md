# Database + Backend Redesign Spec

**Date:** 2026-04-06
**Status:** Approved
**Author:** Brian O'Brien

## Objective

Replace the localStorage-based data layer with a real backend API backed by SQLite + Prisma. Add JWT authentication. Make the app a proper full-stack application suitable for capstone presentation.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | SQLite | Zero setup for reviewers; Prisma schema swaps to Postgres trivially |
| ORM | Prisma | Typed queries, built-in migrations, seed scripts |
| Auth | JWT (bcrypt + jsonwebtoken) | Stateless, standard for SPAs, gives us a users table |
| Migration strategy | Clean swap | Remove localStorage entirely; one clear data flow |
| Backend language | TypeScript | Match frontend; typed Prisma client |

## Architecture

```
React SPA (Vite :5173)  -->  Express API (:3001)  -->  SQLite (via Prisma)
```

- Frontend drops all localStorage logic. Every read/write goes through fetch calls to the API.
- Backend gets restructured from a single `server.js` into a TypeScript project with routes, middleware, and Prisma.
- Database is a single `dev.db` SQLite file managed by Prisma migrations. Gitignored, but a seed script ensures any teammate can `npx prisma db seed` and have demo data.

## Database Schema

```
User
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  name          String
  createdAt     DateTime @default(now())
  labResults    LabResult[]
  notes         HealthNote[]

LabResult
  id            String   @id @default(cuid())
  userId        String   (FK -> User)
  dateCollected DateTime
  dateReported  DateTime
  fasting       Boolean
  panels        Panel[]

Panel
  id            String   @id @default(cuid())
  labResultId   String   (FK -> LabResult)
  name          String
  biomarkers    Biomarker[]

Biomarker
  id            String   @id @default(cuid())
  panelId       String   (FK -> Panel)
  name          String
  value         Float
  unit          String
  referenceMin  Float?
  referenceMax  Float?
  flag          Enum (HIGH, LOW, NORMAL)

HealthNote
  id            String   @id @default(cuid())
  userId        String   (FK -> User)
  date          DateTime
  title         String
  content       String
  createdAt     DateTime @default(now())
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Create account, return JWT |
| POST | `/api/auth/login` | No | Validate credentials, return JWT |
| GET | `/api/labs` | Yes | All lab results for logged-in user (with panels + biomarkers) |
| POST | `/api/labs` | Yes | Add a new lab result |
| GET | `/api/labs/:id` | Yes | Single lab result with panels + biomarkers |
| GET | `/api/biomarkers/:name/history` | Yes | Biomarker values across all lab results over time |
| GET | `/api/notes` | Yes | All notes for logged-in user |
| POST | `/api/notes` | Yes | Create a note |
| DELETE | `/api/notes/:id` | Yes | Delete a note (ownership verified) |

Auth middleware extracts `userId` from JWT on protected routes. Unauthorized requests receive 401.

## Backend Structure

```
backend/
  src/
    server.ts              Entry point, Express setup, CORS, route mounting
    routes/
      auth.ts              POST /register, POST /login
      labs.ts              GET/POST /labs, GET /labs/:id, GET /biomarkers/:name/history
      notes.ts             GET/POST/DELETE /notes
    middleware/
      auth.ts              JWT verification, attaches userId to request
  prisma/
    schema.prisma          Schema definition
    seed.ts                Seed script (migrated from frontend seedData.ts)
  package.json
  tsconfig.json
```

## Frontend Changes

| File | Change |
|------|--------|
| `hooks/useAuth.ts` | Rewire to call `/api/auth/login` and `/api/auth/register`; store JWT in memory + localStorage for refresh persistence |
| `hooks/useLabData.ts` | Rewire to fetch from `/api/labs` and `/api/biomarkers/:name/history`; remove localStorage logic |
| `pages/Notes.tsx` | Rewire to fetch from `/api/notes`; remove localStorage read/write |
| `data/seedData.ts` | Delete (data lives in DB now) |
| New: `lib/api.ts` | Thin fetch wrapper that attaches JWT Authorization header and handles errors |

## Auth Flow

1. User registers or logs in via `/api/auth/*`
2. Backend validates credentials, returns `{ token, user: { name, email } }`
3. Frontend stores token in memory (and localStorage for persistence)
4. All subsequent API calls include `Authorization: Bearer <token>` header
5. Auth middleware decodes token, attaches `userId` to the request
6. Protected routes use `userId` to scope all queries

## Seed Data

The existing `seedData.ts` (4 lab results with panels and biomarkers) gets migrated to `prisma/seed.ts`. The seed script:

1. Creates a demo user (`demo@example.com` / `password`)
2. Inserts all 4 lab results with their panels and biomarkers
3. Runs via `npx prisma db seed`

## What's NOT in Scope

- Deployment / hosting
- Lab result upload/import UI (future feature)
- Password reset flow
- Test suite (separate follow-up)
