import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import { authMiddleware } from "../middleware/auth.js";
import { parseLabCorpPdf } from "../lib/parse-labcorp.js";

const prisma = new PrismaClient();
const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

router.use(authMiddleware);

// POST /api/labs/parse-pdf — parse a LabCorp PDF, return structured data (not saved)
router.post("/parse-pdf", upload.single("file"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No PDF file provided" });
    return;
  }

  try {
    const result = await parseLabCorpPdf(req.file.buffer);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse PDF";
    res.status(422).json({ error: message });
  }
});

// POST /api/labs — save a new lab result
router.post("/", async (req: Request, res: Response) => {
  const { dateCollected, dateReported, fasting, panels } = req.body;

  if (!dateCollected || !dateReported || !Array.isArray(panels) || panels.length === 0) {
    res.status(400).json({ error: "Missing required fields: dateCollected, dateReported, panels" });
    return;
  }

  const collected = new Date(dateCollected);
  const reported = new Date(dateReported);
  if (isNaN(collected.getTime()) || isNaN(reported.getTime())) {
    res.status(400).json({ error: "Invalid date format for dateCollected or dateReported" });
    return;
  }

  for (const p of panels) {
    if (typeof p.name !== "string" || !p.name.trim() || !Array.isArray(p.biomarkers)) {
      res.status(400).json({ error: "Each panel must have a name (string) and biomarkers (array)" });
      return;
    }
    for (const b of p.biomarkers) {
      if (typeof b.name !== "string" || !b.name.trim() || typeof b.value !== "number" || typeof b.unit !== "string") {
        res.status(400).json({ error: "Each biomarker must have name (string), value (number), unit (string)" });
        return;
      }
      if (typeof b.flag !== "string" || !["high", "low", "normal"].includes(b.flag.toLowerCase())) {
        res.status(400).json({ error: "Each biomarker flag must be 'high', 'low', or 'normal'" });
        return;
      }
    }
  }

  try {
    const result = await prisma.labResult.create({
      data: {
        userId: req.userId!,
        dateCollected: collected,
        dateReported: reported,
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save lab result";
    res.status(500).json({ error: message });
  }
});

// GET /api/labs/templates — unique panels and biomarkers from user's history
router.get("/templates", async (req: Request, res: Response) => {
  try {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch templates";
    res.status(500).json({ error: message });
  }
});

// GET /api/labs — all lab results for the logged-in user
router.get("/", async (req: Request, res: Response) => {
  try {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch lab results";
    res.status(500).json({ error: message });
  }
});

// GET /api/labs/biomarkers/:name/history — biomarker trend over time
// IMPORTANT: must be defined BEFORE /:id to prevent "biomarkers" matching as an id
router.get("/biomarkers/:name/history", async (req: Request, res: Response) => {
  try {
    const biomarkerName = decodeURIComponent(req.params.name as string);

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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch biomarker history";
    res.status(500).json({ error: message });
  }
});

// GET /api/labs/:id — single lab result
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const result = await prisma.labResult.findFirst({
      where: { id: req.params.id as string, userId: req.userId },
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch lab result";
    res.status(500).json({ error: message });
  }
});

export default router;
