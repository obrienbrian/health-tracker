# HealthTracker

A personal health dashboard for organizing and visualizing lab results and health data.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Express 5 + TypeScript
- **Database**: SQLite via Prisma ORM
- **Auth**: JWT (bcrypt + jsonwebtoken)
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Icons**: Lucide React
- **Routing**: React Router DOM v7

## Features

- JWT authentication with registration and login
- Dashboard with key health metrics and flagged biomarkers
- Lab results viewer with panel breakdowns and reference ranges
- Trend charts for tracking biomarker changes over time
- Health notes for personal tracking
- Pre-seeded with real LabCorp bloodwork data structure

## Getting Started

### Prerequisites

- Node.js 18+

### Setup

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Create database and seed with demo data
npx prisma migrate dev
npx prisma db seed
```

### Running

Start both servers (in separate terminals):

```bash
# Backend (from backend/ directory)
npm run dev

# Frontend (from project root)
npm run dev
```

Open http://localhost:5173 and sign in with the demo account:
- Email: `demo@example.com`
- Password: `password`

### Database Commands

```bash
cd backend

# Run migrations
npx prisma migrate dev

# Re-seed data
npx prisma db seed

# Reset database (drop + recreate + seed)
npx prisma migrate reset

# Browse data visually
npx prisma studio
```

## Architecture

```
React SPA (Vite :5173)  -->  Express API (:3001)  -->  SQLite (Prisma)
```

- Frontend proxies `/api` requests to the backend via Vite's dev proxy
- Backend authenticates requests via JWT tokens
- All data is stored in SQLite, managed by Prisma migrations
- Seed script provides demo data for development

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Sign in |
| GET | `/api/labs` | Yes | List lab results |
| GET | `/api/labs/:id` | Yes | Get lab result detail |
| GET | `/api/labs/biomarkers/:name/history` | Yes | Biomarker trend data |
| GET | `/api/notes` | Yes | List health notes |
| POST | `/api/notes` | Yes | Create a note |
| DELETE | `/api/notes/:id` | Yes | Delete a note |

## Author

Brian O'Brien (bso23)
