# Health Tracker

A web-based health and bloodwork tracking application built as a capstone project for CEN4090L.

## Team

**Team Name:** Health Gurus

| Member | ID |
|--------|----|
| Nicole De Antonio | nd19f |
| Jeffrey Higi | jh23bu |
| Tara Katz | tk21b |
| Brian O'Brien | Bso23 |
| Daniel Rogers | dyr21 |

## Problem Statement

Individuals who receive routine bloodwork and health lab results often struggle to store, interpret, and track these results over time in a clear and organized way. Lab data is typically scattered across patient portals, PDFs, or emails, making it difficult to notice trends, compare past results, or keep personal health notes in one place.

Health Tracker provides a simple, centralized tool that allows users to log, visualize, and track their health metrics over time without requiring advanced medical knowledge.

## Project Overview

This capstone project focuses on building a minimum viable product (MVP) for a web-based health and bloodwork tracking application. The application will provide users with a clean, functional dashboard where they can manually log lab results, track trends across time, and store basic health notes related to their bloodwork.

The goal is not to replace professional medical software, but to give users an accessible personal health tracking tool that improves awareness and organization of their own data.

The MVP will support authenticated users who can securely create accounts, enter bloodwork values such as cholesterol, glucose, or iron levels, and view visualizations that show how those values change over time. The dashboard will emphasize clarity and usability, using charts and structured data to help users identify patterns or potential concerns.

## Goals

1. Design and implement a functional web dashboard that allows users to log bloodwork and basic health metrics.
2. Provide clear data visualizations that display trends in lab results over time.
3. Implement secure user authentication and data storage.
4. Deliver a working MVP that demonstrates full stack functionality and clean system design.

### Stretch Goals

1. Upload and store lab report PDFs for reference.
2. Ensure full mobile responsiveness for use across devices.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Tailwind CSS |
| Charts | Recharts or Chart.js |
| Backend | Node.js (RESTful API) |
| Database | PostgreSQL or MongoDB |
| Auth | JWT-based authentication |
| Deployment | Vercel, Netlify, Render, or Railway |
| Version Control | GitHub |

## Getting Started

```bash
# Clone the repository
git clone git@github.com:obrienbrian/health-tracker.git
cd health-tracker

# Install dependencies
npm install

# Start the development server
npm run dev
```

## License

This project is for academic purposes as part of CEN4090L.
