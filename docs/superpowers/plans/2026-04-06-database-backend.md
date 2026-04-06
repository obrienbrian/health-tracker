# Database + Backend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace localStorage with a real SQLite database via Prisma, add JWT authentication, and wire the React frontend to fetch all data from Express API endpoints.

**Architecture:** Express (TypeScript) backend with Prisma ORM talking to SQLite. Frontend React app calls the API via a thin fetch wrapper that attaches JWT tokens. Vite dev proxy forwards `/api` requests to avoid CORS in development.

**Tech Stack:** Express, Prisma (SQLite), bcryptjs, jsonwebtoken, tsx (dev runner), TypeScript

**Spec:** `docs/superpowers/specs/2026-04-06-database-backend-design.md`

---

## File Map

### Backend — New Files
| File | Responsibility |
|------|---------------|
| `backend/package.json` | Rewritten with TS + Prisma + Express deps |
| `backend/tsconfig.json` | TypeScript config for backend |
| `backend/prisma/schema.prisma` | Database schema (User, LabResult, Panel, Biomarker, HealthNote) |
| `backend/prisma/seed.ts` | Seed script migrated from frontend `seedData.ts` |
| `backend/src/server.ts` | Express app setup, CORS, route mounting |
| `backend/src/middleware/auth.ts` | JWT verification middleware |
| `backend/src/routes/auth.ts` | POST /register, POST /login |
| `backend/src/routes/labs.ts` | GET /labs, GET /labs/:id, GET /biomarkers/:name/history |
| `backend/src/routes/notes.ts` | GET/POST/DELETE /notes |

### Backend — Delete
| File | Reason |
|------|--------|
| `backend/server.js` | Replaced by `src/server.ts` |
| `backend/data/labs.json` | Data moves to database seed |

### Frontend — New Files
| File | Responsibility |
|------|---------------|
| `src/lib/api.ts` | Fetch wrapper with JWT Authorization header |

### Frontend — Modified Files
| File | Change |
|------|--------|
| `src/hooks/useAuth.ts` | Rewrite: call API for login/register, store JWT |
| `src/hooks/useLabData.ts` | Rewrite: fetch from API instead of localStorage |
| `src/pages/Login.tsx` | Add register toggle, async submit, error display |
| `src/pages/Notes.tsx` | Rewrite: fetch from API instead of localStorage |
| `src/types/index.ts` | Add `AuthResponse` type |
| `vite.config.ts` | Add dev proxy for `/api` |

### Frontend — Delete
| File | Reason |
|------|--------|
| `src/data/seedData.ts` | Data lives in database now |

---

### Task 1: Backend TypeScript Scaffold

**Files:**
- Rewrite: `backend/package.json`
- Create: `backend/tsconfig.json`
- Delete: `backend/server.js`
- Delete: `backend/data/labs.json`

- [ ] **Step 1: Rewrite backend/package.json**

```json
{
  "name": "health-tracker-backend",
  "version": "1.0.0",
  "description": "Backend API for the Health Tracker project",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "db:migrate": "prisma migrate dev",
    "db:seed": "prisma db seed",
    "db:reset": "prisma migrate reset"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^6.8.0",
    "bcryptjs": "^3.0.2",
    "cors": "^2.8.5",
    "express": "^5.1.0",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "@types/bcryptjs": "^3.0.0",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/jsonwebtoken": "^9.0.9",
    "@types/node": "^24.10.1",
    "prisma": "^6.8.0",
    "tsx": "^4.19.0",
    "typescript": "^5.8.0"
  }
}
```

- [ ] **Step 2: Create backend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Delete old backend files**

```bash
rm backend/server.js
rm -rf backend/data
```

- [ ] **Step 4: Install dependencies**

```bash
cd backend && npm install
```

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/tsconfig.json
git rm backend/server.js backend/data/labs.json
git commit -m "chore: scaffold backend with TypeScript + Prisma + Express deps"
```

---

### Task 2: Prisma Schema + Initial Migration

**Files:**
- Create: `backend/prisma/schema.prisma`

- [ ] **Step 1: Create backend/prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

// SQLite does not support enums — flag is stored as a String ("HIGH", "LOW", "NORMAL")

model User {
  id           String       @id @default(cuid())
  email        String       @unique
  passwordHash String
  name         String
  createdAt    DateTime     @default(now())
  labResults   LabResult[]
  notes        HealthNote[]
}

model LabResult {
  id            String   @id @default(cuid())
  userId        String
  dateCollected DateTime
  dateReported  DateTime
  fasting       Boolean
  user          User     @relation(fields: [userId], references: [id])
  panels        Panel[]
}

model Panel {
  id          String      @id @default(cuid())
  labResultId String
  name        String
  labResult   LabResult   @relation(fields: [labResultId], references: [id])
  biomarkers  Biomarker[]
}

model Biomarker {
  id           String        @id @default(cuid())
  panelId      String
  name         String
  value        Float
  unit         String
  referenceMin Float?
  referenceMax Float?
  flag         String        // "HIGH", "LOW", or "NORMAL"
  panel        Panel         @relation(fields: [panelId], references: [id])
}

model HealthNote {
  id        String   @id @default(cuid())
  userId    String
  date      DateTime
  title     String
  content   String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}
```

- [ ] **Step 2: Run initial migration**

```bash
cd backend && npx prisma migrate dev --name init
```

Expected: Creates `backend/prisma/migrations/` directory with SQL migration and `backend/prisma/dev.db`.

- [ ] **Step 3: Add dev.db to .gitignore**

Append to the project root `.gitignore`:

```
# Database
backend/prisma/dev.db
backend/prisma/dev.db-journal
```

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations .gitignore
git commit -m "feat: add Prisma schema with User, LabResult, Panel, Biomarker, HealthNote models"
```

---

### Task 3: Seed Script

**Files:**
- Create: `backend/prisma/seed.ts`

This migrates the data from `src/data/seedData.ts` into a Prisma seed script. All 4 lab results with their panels and biomarkers are included. A demo user (`demo@example.com` / `password`) is created.

- [ ] **Step 1: Create backend/prisma/seed.ts**

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function flag(value: number, min?: number, max?: number): string {
  if (max !== undefined && value > max) return "HIGH";
  if (min !== undefined && value < min) return "LOW";
  return "NORMAL";
}

interface SeedBiomarker {
  name: string;
  value: number;
  unit: string;
  referenceMin?: number;
  referenceMax?: number;
}

interface SeedPanel {
  name: string;
  biomarkers: SeedBiomarker[];
}

interface SeedLabResult {
  dateCollected: string;
  dateReported: string;
  fasting: boolean;
  panels: SeedPanel[];
}

const labResults: SeedLabResult[] = [
  {
    dateCollected: "2026-01-29",
    dateReported: "2026-02-05",
    fasting: false,
    panels: [
      {
        name: "Thyroid",
        biomarkers: [
          { name: "TSH", value: 1.33, unit: "uIU/mL", referenceMin: 0.45, referenceMax: 4.5 },
          { name: "Free T4", value: 1.24, unit: "ng/dL", referenceMin: 0.82, referenceMax: 1.77 },
          { name: "Free T3", value: 3.7, unit: "pg/mL", referenceMin: 2.0, referenceMax: 4.4 },
        ],
      },
      {
        name: "CBC",
        biomarkers: [
          { name: "WBC", value: 5.0, unit: "x10E3/uL", referenceMin: 3.4, referenceMax: 10.8 },
          { name: "RBC", value: 5.68, unit: "x10E6/uL", referenceMin: 4.14, referenceMax: 5.8 },
          { name: "Hemoglobin", value: 16.0, unit: "g/dL", referenceMin: 13.0, referenceMax: 17.7 },
          { name: "Hematocrit", value: 50.1, unit: "%", referenceMin: 37.5, referenceMax: 51.0 },
          { name: "Platelets", value: 317, unit: "x10E3/uL", referenceMin: 150, referenceMax: 450 },
          { name: "MCV", value: 88, unit: "fL", referenceMin: 79, referenceMax: 97 },
        ],
      },
      {
        name: "Metabolic Panel",
        biomarkers: [
          { name: "Glucose", value: 102, unit: "mg/dL", referenceMin: 70, referenceMax: 99 },
          { name: "BUN", value: 11, unit: "mg/dL", referenceMin: 6, referenceMax: 20 },
          { name: "Creatinine", value: 1.01, unit: "mg/dL", referenceMin: 0.76, referenceMax: 1.27 },
          { name: "eGFR", value: 106, unit: "mL/min/1.73", referenceMin: 59 },
          { name: "Sodium", value: 142, unit: "mmol/L", referenceMin: 134, referenceMax: 144 },
          { name: "Potassium", value: 4.9, unit: "mmol/L", referenceMin: 3.5, referenceMax: 5.2 },
          { name: "Calcium", value: 9.7, unit: "mg/dL", referenceMin: 8.7, referenceMax: 10.2 },
          { name: "Protein, Total", value: 7.4, unit: "g/dL", referenceMin: 6.0, referenceMax: 8.5 },
          { name: "Albumin", value: 5.1, unit: "g/dL", referenceMin: 4.3, referenceMax: 5.2 },
          { name: "Bilirubin, Total", value: 0.4, unit: "mg/dL", referenceMin: 0.0, referenceMax: 1.2 },
          { name: "Alk Phos", value: 60, unit: "IU/L", referenceMin: 47, referenceMax: 123 },
          { name: "AST", value: 27, unit: "IU/L", referenceMin: 0, referenceMax: 40 },
          { name: "ALT", value: 28, unit: "IU/L", referenceMin: 0, referenceMax: 44 },
        ],
      },
      {
        name: "Lipid Panel",
        biomarkers: [
          { name: "Total Cholesterol", value: 180, unit: "mg/dL", referenceMin: 100, referenceMax: 199 },
          { name: "Triglycerides", value: 121, unit: "mg/dL", referenceMin: 0, referenceMax: 149 },
          { name: "HDL", value: 40, unit: "mg/dL", referenceMin: 39 },
          { name: "LDL", value: 118, unit: "mg/dL", referenceMin: 0, referenceMax: 99 },
          { name: "VLDL", value: 22, unit: "mg/dL", referenceMin: 5, referenceMax: 40 },
          { name: "LDL/HDL Ratio", value: 3.0, unit: "ratio", referenceMin: 0, referenceMax: 3.6 },
          { name: "Apolipoprotein B", value: 94, unit: "mg/dL", referenceMin: 0, referenceMax: 90 },
        ],
      },
      {
        name: "Hormones",
        biomarkers: [
          { name: "Testosterone, Total", value: 1499.2, unit: "ng/dL", referenceMin: 264, referenceMax: 916 },
          { name: "SHBG", value: 54.8, unit: "nmol/L", referenceMin: 16.5, referenceMax: 55.9 },
          { name: "Testosterone, Free", value: 267.5, unit: "pg/mL", referenceMin: 47.7, referenceMax: 173.9 },
          { name: "Estradiol", value: 19.9, unit: "pg/mL", referenceMin: 8.0, referenceMax: 35.0 },
          { name: "DHEA", value: 266, unit: "ng/dL", referenceMin: 31, referenceMax: 701 },
          { name: "Pregnenolone", value: 14, unit: "ng/dL", referenceMin: 0, referenceMax: 151 },
        ],
      },
      {
        name: "Metabolic Markers",
        biomarkers: [
          { name: "HbA1c", value: 5.1, unit: "%", referenceMin: 4.8, referenceMax: 5.6 },
          { name: "Insulin", value: 26.4, unit: "uIU/mL", referenceMin: 2.6, referenceMax: 24.9 },
          { name: "CRP, Cardiac", value: 0.89, unit: "mg/L", referenceMin: 0, referenceMax: 3.0 },
          { name: "GGT", value: 27, unit: "IU/L", referenceMin: 0, referenceMax: 65 },
        ],
      },
      {
        name: "Other",
        biomarkers: [
          { name: "PSA", value: 0.9, unit: "ng/mL", referenceMin: 0, referenceMax: 4.0 },
          { name: "VEGF", value: 522, unit: "pg/mL", referenceMin: 62, referenceMax: 707 },
        ],
      },
    ],
  },
  {
    dateCollected: "2025-01-06",
    dateReported: "2025-01-10",
    fasting: true,
    panels: [
      {
        name: "Thyroid",
        biomarkers: [
          { name: "TSH", value: 3.03, unit: "uIU/mL", referenceMin: 0.45, referenceMax: 4.5 },
          { name: "Free T4", value: 1.44, unit: "ng/dL", referenceMin: 0.82, referenceMax: 1.77 },
          { name: "Free T3", value: 3.7, unit: "pg/mL", referenceMin: 2.0, referenceMax: 4.4 },
        ],
      },
      {
        name: "CBC",
        biomarkers: [
          { name: "WBC", value: 6.2, unit: "x10E3/uL", referenceMin: 3.4, referenceMax: 10.8 },
          { name: "RBC", value: 5.75, unit: "x10E6/uL", referenceMin: 4.14, referenceMax: 5.8 },
          { name: "Hemoglobin", value: 16.9, unit: "g/dL", referenceMin: 13.0, referenceMax: 17.7 },
          { name: "Hematocrit", value: 49.0, unit: "%", referenceMin: 37.5, referenceMax: 51.0 },
          { name: "Platelets", value: 218, unit: "x10E3/uL", referenceMin: 150, referenceMax: 450 },
          { name: "MCV", value: 85, unit: "fL", referenceMin: 79, referenceMax: 97 },
        ],
      },
      {
        name: "Metabolic Panel",
        biomarkers: [
          { name: "Glucose", value: 94, unit: "mg/dL", referenceMin: 70, referenceMax: 99 },
          { name: "BUN", value: 17, unit: "mg/dL", referenceMin: 6, referenceMax: 20 },
          { name: "Creatinine", value: 1.13, unit: "mg/dL", referenceMin: 0.76, referenceMax: 1.27 },
          { name: "eGFR", value: 93, unit: "mL/min/1.73", referenceMin: 59 },
          { name: "Sodium", value: 140, unit: "mmol/L", referenceMin: 134, referenceMax: 144 },
          { name: "Potassium", value: 4.8, unit: "mmol/L", referenceMin: 3.5, referenceMax: 5.2 },
          { name: "Calcium", value: 9.9, unit: "mg/dL", referenceMin: 8.7, referenceMax: 10.2 },
          { name: "AST", value: 21, unit: "IU/L", referenceMin: 0, referenceMax: 40 },
          { name: "ALT", value: 26, unit: "IU/L", referenceMin: 0, referenceMax: 44 },
        ],
      },
      {
        name: "Lipid Panel",
        biomarkers: [
          { name: "Total Cholesterol", value: 118, unit: "mg/dL", referenceMin: 100, referenceMax: 199 },
          { name: "Triglycerides", value: 79, unit: "mg/dL", referenceMin: 0, referenceMax: 149 },
          { name: "HDL", value: 42, unit: "mg/dL", referenceMin: 39 },
          { name: "LDL", value: 60, unit: "mg/dL", referenceMin: 0, referenceMax: 99 },
          { name: "VLDL", value: 16, unit: "mg/dL", referenceMin: 5, referenceMax: 40 },
          { name: "Apolipoprotein B", value: 58, unit: "mg/dL", referenceMin: 0, referenceMax: 90 },
        ],
      },
      {
        name: "Hormones",
        biomarkers: [
          { name: "Testosterone, Total", value: 814, unit: "ng/dL", referenceMin: 264, referenceMax: 916 },
          { name: "SHBG", value: 33.7, unit: "nmol/L", referenceMin: 16.5, referenceMax: 55.9 },
          { name: "Testosterone, Free", value: 164.1, unit: "pg/mL", referenceMin: 47.7, referenceMax: 173.9 },
          { name: "Estradiol", value: 17.0, unit: "pg/mL", referenceMin: 8.0, referenceMax: 35.0 },
        ],
      },
      {
        name: "Metabolic Markers",
        biomarkers: [
          { name: "HbA1c", value: 5.6, unit: "%", referenceMin: 4.8, referenceMax: 5.6 },
          { name: "Insulin", value: 10.6, unit: "uIU/mL", referenceMin: 2.6, referenceMax: 24.9 },
          { name: "CRP, Cardiac", value: 0.57, unit: "mg/L", referenceMin: 0, referenceMax: 3.0 },
          { name: "GGT", value: 19, unit: "IU/L", referenceMin: 0, referenceMax: 65 },
        ],
      },
      {
        name: "Other",
        biomarkers: [
          { name: "PSA", value: 0.6, unit: "ng/mL", referenceMin: 0, referenceMax: 4.0 },
        ],
      },
    ],
  },
  {
    dateCollected: "2024-09-20",
    dateReported: "2024-09-25",
    fasting: true,
    panels: [
      {
        name: "Metabolic Panel",
        biomarkers: [
          { name: "Creatinine", value: 0.9, unit: "mg/dL", referenceMin: 0.76, referenceMax: 1.27 },
          { name: "eGFR", value: 123, unit: "mL/min/1.73", referenceMin: 59 },
          { name: "ALT", value: 52, unit: "IU/L", referenceMin: 0, referenceMax: 44 },
        ],
      },
      {
        name: "Lipid Panel",
        biomarkers: [
          { name: "Total Cholesterol", value: 116, unit: "mg/dL", referenceMin: 100, referenceMax: 199 },
          { name: "Triglycerides", value: 134, unit: "mg/dL", referenceMin: 0, referenceMax: 149 },
          { name: "HDL", value: 22, unit: "mg/dL", referenceMin: 39 },
          { name: "LDL", value: 70, unit: "mg/dL", referenceMin: 0, referenceMax: 99 },
        ],
      },
      {
        name: "Metabolic Markers",
        biomarkers: [
          { name: "CRP, Cardiac", value: 0.81, unit: "mg/L", referenceMin: 0, referenceMax: 3.0 },
        ],
      },
    ],
  },
  {
    dateCollected: "2024-01-30",
    dateReported: "2024-02-05",
    fasting: true,
    panels: [
      {
        name: "Metabolic Panel",
        biomarkers: [
          { name: "Creatinine", value: 1.02, unit: "mg/dL", referenceMin: 0.76, referenceMax: 1.27 },
          { name: "eGFR", value: 105, unit: "mL/min/1.73", referenceMin: 59 },
          { name: "ALT", value: 67, unit: "IU/L", referenceMin: 0, referenceMax: 44 },
        ],
      },
    ],
  },
];

async function main() {
  // Clear existing data
  await prisma.biomarker.deleteMany();
  await prisma.panel.deleteMany();
  await prisma.labResult.deleteMany();
  await prisma.healthNote.deleteMany();
  await prisma.user.deleteMany();

  // Create demo user
  const passwordHash = await bcrypt.hash("password", 10);
  const user = await prisma.user.create({
    data: {
      email: "demo@example.com",
      passwordHash,
      name: "Brian O'Brien",
    },
  });

  // Create lab results with nested panels and biomarkers
  for (const lr of labResults) {
    await prisma.labResult.create({
      data: {
        userId: user.id,
        dateCollected: new Date(lr.dateCollected),
        dateReported: new Date(lr.dateReported),
        fasting: lr.fasting,
        panels: {
          create: lr.panels.map((panel) => ({
            name: panel.name,
            biomarkers: {
              create: panel.biomarkers.map((bm) => ({
                name: bm.name,
                value: bm.value,
                unit: bm.unit,
                referenceMin: bm.referenceMin ?? null,
                referenceMax: bm.referenceMax ?? null,
                flag: flag(bm.value, bm.referenceMin, bm.referenceMax),
              })),
            },
          })),
        },
      },
    });
  }

  console.log("Seeded database with demo user and 4 lab results");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run the seed**

```bash
cd backend && npx prisma db seed
```

Expected output: `Seeded database with demo user and 4 lab results`

- [ ] **Step 3: Verify seed data**

```bash
cd backend && npx prisma studio
```

Open the Prisma Studio browser tab and confirm: 1 User, 4 LabResults, panels and biomarkers populated.
Close Prisma Studio after verifying.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/seed.ts
git commit -m "feat: add Prisma seed script with demo user and 4 lab results"
```

---

### Task 4: Auth Middleware

**Files:**
- Create: `backend/src/middleware/auth.ts`

- [ ] **Step 1: Create backend/src/middleware/auth.ts**

```typescript
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

export interface AuthPayload {
  userId: string;
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function signToken(userId: string): string {
  return jwt.sign({ userId } satisfies AuthPayload, JWT_SECRET, {
    expiresIn: "7d",
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/middleware/auth.ts
git commit -m "feat: add JWT auth middleware and token signing utility"
```

---

### Task 5: Auth Routes

**Files:**
- Create: `backend/src/routes/auth.ts`

- [ ] **Step 1: Create backend/src/routes/auth.ts**

```typescript
import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { signToken } from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ error: "Email, password, and name are required" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });

  const token = signToken(user.id);
  res.status(201).json({ token, user: { name: user.name, email: user.email } });
});

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken(user.id);
  res.json({ token, user: { name: user.name, email: user.email } });
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/routes/auth.ts
git commit -m "feat: add auth routes (register + login) with bcrypt + JWT"
```

---

### Task 6: Labs Routes

**Files:**
- Create: `backend/src/routes/labs.ts`

- [ ] **Step 1: Create backend/src/routes/labs.ts**

```typescript
import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = Router();

router.use(authMiddleware);

// GET /api/labs — all lab results for the logged-in user
router.get("/", async (req: Request, res: Response) => {
  const results = await prisma.labResult.findMany({
    where: { userId: req.userId },
    include: {
      panels: {
        include: { biomarkers: true },
      },
    },
    orderBy: { dateCollected: "desc" },
  });

  // Transform to match the frontend LabResult shape
  const formatted = results.map((r) => ({
    id: r.id,
    dateCollected: r.dateCollected.toISOString().split("T")[0],
    dateReported: r.dateReported.toISOString().split("T")[0],
    fasting: r.fasting,
    panels: r.panels.map((p) => ({
      name: p.name,
      biomarkers: p.biomarkers.map((b) => ({
        name: b.name,
        value: b.value,
        unit: b.unit,
        referenceMin: b.referenceMin ?? undefined,
        referenceMax: b.referenceMax ?? undefined,
        flag: b.flag.toLowerCase() as "high" | "low" | "normal",
      })),
    })),
  }));

  res.json(formatted);
});

// GET /api/labs/:id — single lab result
router.get("/:id", async (req: Request, res: Response) => {
  const result = await prisma.labResult.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: {
      panels: {
        include: { biomarkers: true },
      },
    },
  });

  if (!result) {
    res.status(404).json({ error: "Lab result not found" });
    return;
  }

  res.json({
    id: result.id,
    dateCollected: result.dateCollected.toISOString().split("T")[0],
    dateReported: result.dateReported.toISOString().split("T")[0],
    fasting: result.fasting,
    panels: result.panels.map((p) => ({
      name: p.name,
      biomarkers: p.biomarkers.map((b) => ({
        name: b.name,
        value: b.value,
        unit: b.unit,
        referenceMin: b.referenceMin ?? undefined,
        referenceMax: b.referenceMax ?? undefined,
        flag: b.flag.toLowerCase() as "high" | "low" | "normal",
      })),
    })),
  });
});

// GET /api/biomarkers/:name/history — biomarker trend over time
router.get("/biomarkers/:name/history", async (req: Request, res: Response) => {
  const biomarkerName = decodeURIComponent(req.params.name);

  const results = await prisma.labResult.findMany({
    where: { userId: req.userId },
    include: {
      panels: {
        include: {
          biomarkers: {
            where: { name: biomarkerName },
          },
        },
      },
    },
    orderBy: { dateCollected: "asc" },
  });

  const history = results.flatMap((r) =>
    r.panels.flatMap((p) =>
      p.biomarkers.map((b) => ({
        date: r.dateCollected.toISOString().split("T")[0],
        value: b.value,
        unit: b.unit,
        referenceMin: b.referenceMin ?? undefined,
        referenceMax: b.referenceMax ?? undefined,
        flag: b.flag.toLowerCase() as "high" | "low" | "normal",
      })),
    ),
  );

  res.json(history);
});

export default router;
```

**Note:** The biomarkers history route is mounted at `/api/labs/biomarkers/:name/history` because this router is mounted at `/api/labs`. The frontend will call `/api/biomarkers/:name/history` which we'll handle by mounting this specific route separately in server.ts. See Task 8.

- [ ] **Step 2: Commit**

```bash
git add backend/src/routes/labs.ts
git commit -m "feat: add labs routes (list, detail, biomarker history)"
```

---

### Task 7: Notes Routes

**Files:**
- Create: `backend/src/routes/notes.ts`

- [ ] **Step 1: Create backend/src/routes/notes.ts**

```typescript
import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = Router();

router.use(authMiddleware);

// GET /api/notes
router.get("/", async (req: Request, res: Response) => {
  const notes = await prisma.healthNote.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
  });

  const formatted = notes.map((n) => ({
    id: n.id,
    date: n.date.toISOString().split("T")[0],
    title: n.title,
    content: n.content,
  }));

  res.json(formatted);
});

// POST /api/notes
router.post("/", async (req: Request, res: Response) => {
  const { date, title, content } = req.body;

  if (!date || !title || !content) {
    res.status(400).json({ error: "Date, title, and content are required" });
    return;
  }

  const note = await prisma.healthNote.create({
    data: {
      userId: req.userId!,
      date: new Date(date),
      title,
      content,
    },
  });

  res.status(201).json({
    id: note.id,
    date: note.date.toISOString().split("T")[0],
    title: note.title,
    content: note.content,
  });
});

// DELETE /api/notes/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const note = await prisma.healthNote.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });

  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  await prisma.healthNote.delete({ where: { id: note.id } });
  res.status(204).send();
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/routes/notes.ts
git commit -m "feat: add notes routes (list, create, delete)"
```

---

### Task 8: Backend Server Entry Point

**Files:**
- Create: `backend/src/server.ts`

- [ ] **Step 1: Create backend/src/server.ts**

```typescript
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import labsRoutes from "./routes/labs.js";
import notesRoutes from "./routes/notes.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/labs", labsRoutes);
app.use("/api/notes", notesRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

**Note on biomarker history route:** The spec lists `/api/biomarkers/:name/history` as a separate endpoint. Since the labs router already handles the biomarker query logic, we mount the history route inside the labs router. The frontend will call `/api/labs/biomarkers/:name/history`. This avoids a separate router for a single endpoint.

- [ ] **Step 2: Verify the backend starts**

```bash
cd backend && npm run dev
```

Expected: `Server running on http://localhost:3001`

In another terminal:
```bash
curl http://localhost:3001/health
```

Expected: `{"status":"ok"}`

Stop the dev server after verification.

- [ ] **Step 3: Commit**

```bash
git add backend/src/server.ts
git commit -m "feat: add Express server entry point with route mounting"
```

---

### Task 9: Verify Backend End-to-End

No new files. This task verifies all backend routes work together.

- [ ] **Step 1: Start the backend**

```bash
cd backend && npm run dev
```

- [ ] **Step 2: Register a user**

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","name":"Test User"}'
```

Expected: `{"token":"eyJ...","user":{"name":"Test User","email":"test@test.com"}}`

Save the token value for subsequent requests.

- [ ] **Step 3: Login**

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"password"}'
```

Expected: `{"token":"eyJ...","user":{"name":"Brian O'Brien","email":"demo@example.com"}}`

Save this token — the demo user has seed data.

- [ ] **Step 4: Fetch labs**

```bash
curl http://localhost:3001/api/labs \
  -H "Authorization: Bearer <TOKEN>"
```

Expected: JSON array with 4 lab results, each containing panels and biomarkers.

- [ ] **Step 5: Fetch biomarker history**

```bash
curl "http://localhost:3001/api/labs/biomarkers/Glucose/history" \
  -H "Authorization: Bearer <TOKEN>"
```

Expected: JSON array with Glucose values across lab results.

- [ ] **Step 6: Test notes CRUD**

```bash
# Create
curl -X POST http://localhost:3001/api/notes \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-04-06","title":"Test note","content":"This is a test"}'

# List
curl http://localhost:3001/api/notes \
  -H "Authorization: Bearer <TOKEN>"

# Delete (use the id from the create response)
curl -X DELETE http://localhost:3001/api/notes/<NOTE_ID> \
  -H "Authorization: Bearer <TOKEN>"
```

- [ ] **Step 7: Test unauthorized access**

```bash
curl http://localhost:3001/api/labs
```

Expected: `{"error":"Missing or invalid authorization header"}` with 401 status.

Stop the dev server after all verifications pass.

---

### Task 10: Frontend API Client

**Files:**
- Create: `src/lib/api.ts`

- [ ] **Step 1: Create src/lib/api.ts**

```typescript
const API_BASE = "/api";

let token: string | null = localStorage.getItem("healthtracker_token");

export function setToken(newToken: string | null) {
  token = newToken;
  if (newToken) {
    localStorage.setItem("healthtracker_token", newToken);
  } else {
    localStorage.removeItem("healthtracker_token");
  }
}

export function getToken(): string | null {
  return token;
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat: add API client with JWT token management"
```

---

### Task 11: Vite Dev Proxy

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Update vite.config.ts to proxy /api to backend**

Replace the full contents of `vite.config.ts` with:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
```

This means the frontend can call `/api/labs` and Vite will forward it to `http://localhost:3001/api/labs` during development. No CORS issues.

- [ ] **Step 2: Commit**

```bash
git add vite.config.ts
git commit -m "feat: add Vite dev proxy for /api to backend"
```

---

### Task 12: Rewrite useAuth Hook

**Files:**
- Modify: `src/hooks/useAuth.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add AuthResponse type to src/types/index.ts**

Append to the end of the file:

```typescript
export interface AuthResponse {
  token: string;
  user: {
    name: string;
    email: string;
  };
}
```

- [ ] **Step 2: Rewrite src/hooks/useAuth.ts**

Replace the full contents with:

```typescript
import { useState, useCallback } from "react";
import { api, setToken, getToken } from "../lib/api";
import type { AuthResponse } from "../types";

interface AuthState {
  isAuthenticated: boolean;
  userName: string;
}

function getStoredAuth(): AuthState {
  const token = getToken();
  const name = localStorage.getItem("healthtracker_userName");
  if (token && name) {
    return { isAuthenticated: true, userName: name };
  }
  return { isAuthenticated: false, userName: "" };
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>(getStoredAuth);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    localStorage.setItem("healthtracker_userName", data.user.name);
    setAuth({ isAuthenticated: true, userName: data.user.name });
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const data = await api<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    setToken(data.token);
    localStorage.setItem("healthtracker_userName", data.user.name);
    setAuth({ isAuthenticated: true, userName: data.user.name });
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem("healthtracker_userName");
    setAuth({ isAuthenticated: false, userName: "" });
  }, []);

  return {
    isAuthenticated: auth.isAuthenticated,
    userName: auth.userName,
    login,
    register,
    logout,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAuth.ts src/types/index.ts
git commit -m "feat: rewrite useAuth to use JWT API authentication"
```

---

### Task 13: Update Login Page

**Files:**
- Modify: `src/pages/Login.tsx`

- [ ] **Step 1: Rewrite src/pages/Login.tsx with register toggle and async auth**

Replace the full contents with:

```tsx
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Activity } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
            <Activity className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">HealthTracker</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor your health data in one place
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-6 text-lg font-semibold text-gray-900">
            {isRegister ? "Create Account" : "Sign In"}
          </h2>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label
                  htmlFor="name"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : isRegister
                  ? "Create Account"
                  : "Sign In"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              {isRegister ? "Sign in" : "Create one"}
            </button>
          </p>

          <p className="mt-2 text-center text-xs text-gray-400">
            Demo account: demo@example.com / password
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Login.tsx
git commit -m "feat: update Login page with register toggle, async auth, and error display"
```

---

### Task 14: Rewrite useLabData Hook

**Files:**
- Modify: `src/hooks/useLabData.ts`

- [ ] **Step 1: Rewrite src/hooks/useLabData.ts**

Replace the full contents with:

```typescript
import { useState, useCallback, useEffect } from "react";
import type { LabResult } from "../types";
import { api } from "../lib/api";

interface BiomarkerHistoryEntry {
  date: string;
  value: number;
  unit: string;
  referenceMin?: number;
  referenceMax?: number;
  flag: "high" | "low" | "normal";
}

export function useLabData() {
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchLabs() {
      try {
        const data = await api<LabResult[]>("/labs");
        if (!cancelled) {
          setLabResults(data);
        }
      } catch (err) {
        console.error("Failed to fetch lab results:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchLabs();
    return () => { cancelled = true; };
  }, []);

  const getBiomarkerHistory = useCallback(
    (name: string): BiomarkerHistoryEntry[] => {
      const entries: BiomarkerHistoryEntry[] = [];

      for (const result of labResults) {
        for (const panel of result.panels) {
          for (const biomarker of panel.biomarkers) {
            if (biomarker.name === name) {
              entries.push({
                date: result.dateCollected,
                value: biomarker.value,
                unit: biomarker.unit,
                referenceMin: biomarker.referenceMin,
                referenceMax: biomarker.referenceMax,
                flag: biomarker.flag,
              });
            }
          }
        }
      }

      return entries.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    },
    [labResults],
  );

  return { labResults, loading, getBiomarkerHistory };
}
```

**Note:** The `getBiomarkerHistory` function still computes from the in-memory `labResults` array (same as before). This avoids an extra API call per biomarker on the Trends page. The `/api/labs/biomarkers/:name/history` endpoint exists for individual lookups if needed later.

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useLabData.ts
git commit -m "feat: rewrite useLabData to fetch from API instead of localStorage"
```

---

### Task 15: Rewrite Notes Page

**Files:**
- Modify: `src/pages/Notes.tsx`

- [ ] **Step 1: Rewrite src/pages/Notes.tsx**

Replace the full contents with:

```tsx
import { useState, useCallback, useEffect, type FormEvent } from "react";
import { StickyNote, Plus, Trash2, Calendar } from "lucide-react";
import type { HealthNote } from "../types";
import { api } from "../lib/api";

export function Notes() {
  const [notes, setNotes] = useState<HealthNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchNotes() {
      try {
        const data = await api<HealthNote[]>("/notes");
        if (!cancelled) setNotes(data);
      } catch (err) {
        console.error("Failed to fetch notes:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchNotes();
    return () => { cancelled = true; };
  }, []);

  const addNote = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!title.trim() || !content.trim()) return;

      setSubmitting(true);
      try {
        const newNote = await api<HealthNote>("/notes", {
          method: "POST",
          body: JSON.stringify({ date, title: title.trim(), content: content.trim() }),
        });
        setNotes((prev) => [newNote, ...prev]);
        setTitle("");
        setContent("");
        setDate(new Date().toISOString().split("T")[0]);
      } catch (err) {
        console.error("Failed to add note:", err);
      } finally {
        setSubmitting(false);
      }
    },
    [title, content, date],
  );

  const deleteNote = useCallback(async (id: string) => {
    try {
      await api(`/notes/${id}`, { method: "DELETE" });
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Health Notes</h1>
        <p className="mt-1 text-sm text-gray-500">
          Keep track of symptoms, medications, and observations
        </p>
      </div>

      {/* Add note form */}
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-900">Add New Note</h2>
        </div>

        <form onSubmit={addNote} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="note-title"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Title
              </label>
              <input
                id="note-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Started new supplement"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label
                htmlFor="note-date"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Date
              </label>
              <input
                id="note-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="note-content"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Content
            </label>
            <textarea
              id="note-content"
              required
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note here..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {submitting ? "Adding..." : "Add Note"}
          </button>
        </form>
      </div>

      {/* Notes list */}
      <div className="space-y-4">
        {loading ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-100">
            <p className="text-sm text-gray-500">Loading notes...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-100">
            <StickyNote className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-500">
              No notes yet
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Add your first health note above
            </p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {note.title}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar className="h-3 w-3" />
                      {new Date(note.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
                    {note.content}
                  </p>
                </div>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="ml-4 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  aria-label={`Delete note: ${note.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Notes.tsx
git commit -m "feat: rewrite Notes page to use API instead of localStorage"
```

---

### Task 16: Cleanup Old Files

**Files:**
- Delete: `src/data/seedData.ts`

- [ ] **Step 1: Delete frontend seed data**

```bash
rm src/data/seedData.ts
rmdir src/data
```

- [ ] **Step 2: Verify no remaining imports of seedData**

Search for any remaining imports of `seedData` or `seedLabResults` in the frontend:

```bash
grep -r "seedData\|seedLabResults" src/
```

Expected: No results.

- [ ] **Step 3: Commit**

```bash
git rm src/data/seedData.ts
git commit -m "chore: remove frontend seed data (data now lives in database)"
```

---

### Task 17: Full Integration Verification

No new files. This task verifies the complete app works end-to-end.

- [ ] **Step 1: Reset and re-seed the database**

```bash
cd backend && npx prisma migrate reset --force
```

This drops and recreates the DB, then runs the seed script.

- [ ] **Step 2: Start the backend**

```bash
cd backend && npm run dev
```

- [ ] **Step 3: Start the frontend (in another terminal)**

```bash
npm run dev
```

- [ ] **Step 4: Verify login flow**

1. Open `http://localhost:5173`
2. Log in with `demo@example.com` / `password`
3. Should redirect to Dashboard
4. Dashboard should show stat cards, flagged biomarkers with sparklines, recent panels

- [ ] **Step 5: Verify Lab Results page**

1. Click "Lab Results" in sidebar
2. Should show date selector with 4 dates
3. Each panel should expand with biomarker table
4. Biomarker names should be clickable links to Trends

- [ ] **Step 6: Verify Trends page**

1. Click "Trends" in sidebar
2. Should show popular biomarker charts with data
3. Click a specific biomarker from Lab Results — should show that biomarker's trend chart

- [ ] **Step 7: Verify Notes page**

1. Click "Notes" in sidebar
2. Add a new note — should appear in the list
3. Delete the note — should disappear
4. Refresh the page — notes should persist (from database, not localStorage)

- [ ] **Step 8: Verify registration**

1. Log out
2. Click "Create one" to switch to register
3. Register with a new email/password/name
4. Should redirect to Dashboard (with empty data since new user has no lab results)

- [ ] **Step 9: Verify auth protection**

1. Clear localStorage and refresh the page
2. Should redirect to login page
3. Should not be able to access `/dashboard` directly

---

### Task 18: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README.md**

Replace the full contents with:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README with backend setup, API docs, and architecture"
```
