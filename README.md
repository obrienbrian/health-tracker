# HealthTracker

A personal health dashboard for organizing and visualizing lab results and health data.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Icons**: Lucide React
- **Routing**: React Router DOM v7
- **Data Storage**: Browser localStorage (HIPAA-safe - no data leaves your device)

## Features

- Dashboard with key health metrics and flagged biomarkers
- Lab results viewer with panel breakdowns and reference ranges
- Trend charts for tracking biomarker changes over time
- Health notes for personal tracking
- Pre-seeded with real LabCorp bloodwork data structure

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173 and sign in with any email/password.

## Architecture

Data is stored entirely in the browser's localStorage, meaning:

- No backend server required
- No HIPAA compliance concerns - data never leaves the user's device
- Works offline
- Easy to extend with a backend later

## Author

Brian O'Brien (bso23)
