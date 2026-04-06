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

// GET /api/labs/biomarkers/:name/history — biomarker trend over time
// IMPORTANT: must be defined BEFORE /:id to prevent "biomarkers" matching as an id
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

export default router;
