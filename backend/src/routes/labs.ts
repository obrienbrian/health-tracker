import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = Router();

router.use(authMiddleware);

// POST /api/labs — save a new lab result
router.post("/", async (req: Request, res: Response) => {
  const { dateCollected, dateReported, fasting, panels } = req.body;

  if (!dateCollected || !dateReported || !Array.isArray(panels)) {
    res.status(400).json({ error: "Missing required fields: dateCollected, dateReported, panels" });
    return;
  }

  const result = await prisma.labResult.create({
    data: {
      userId: req.userId!,
      dateCollected: new Date(dateCollected),
      dateReported: new Date(dateReported),
      fasting: Boolean(fasting),
      panels: {
        create: panels.map((p: { name: string; biomarkers: Array<{ name: string; value: number; unit: string; referenceMin?: number; referenceMax?: number; flag: string }> }) => ({
          name: p.name,
          biomarkers: {
            create: p.biomarkers.map((b) => ({
              name: b.name,
              value: b.value,
              unit: b.unit,
              referenceMin: b.referenceMin ?? null,
              referenceMax: b.referenceMax ?? null,
              flag: b.flag.toUpperCase(),
            })),
          },
        })),
      },
    },
    include: {
      panels: {
        include: { biomarkers: true },
      },
    },
  });

  res.status(201).json({
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

// GET /api/labs/templates — unique panels and biomarkers from user's history
router.get("/templates", async (req: Request, res: Response) => {
  const results = await prisma.labResult.findMany({
    where: { userId: req.userId },
    include: {
      panels: {
        include: { biomarkers: true },
      },
    },
    orderBy: { dateCollected: "desc" },
    take: 5,
  });

  const panelMap = new Map<string, Map<string, { unit: string; referenceMin?: number; referenceMax?: number }>>();

  for (const result of results) {
    for (const panel of result.panels) {
      if (!panelMap.has(panel.name)) {
        panelMap.set(panel.name, new Map());
      }
      const biomarkerMap = panelMap.get(panel.name)!;
      for (const b of panel.biomarkers) {
        if (!biomarkerMap.has(b.name)) {
          biomarkerMap.set(b.name, {
            unit: b.unit,
            referenceMin: b.referenceMin ?? undefined,
            referenceMax: b.referenceMax ?? undefined,
          });
        }
      }
    }
  }

  const templates = Array.from(panelMap.entries()).map(([name, biomarkerMap]) => ({
    name,
    biomarkers: Array.from(biomarkerMap.entries()).map(([bName, bData]) => ({
      name: bName,
      unit: bData.unit,
      referenceMin: bData.referenceMin,
      referenceMax: bData.referenceMax,
    })),
  }));

  res.json(templates);
});

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
