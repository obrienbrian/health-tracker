import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = Router();

// Basic validation for incoming lab result payload
function isValidLabPayload(body: any): boolean {
  if (!body || typeof body !== "object") return false;

  if (typeof body.dateCollected !== "string" || body.dateCollected.trim() === "") return false;
  if (typeof body.dateReported !== "string" || body.dateReported.trim() === "") return false;
  if (typeof body.fasting !== "boolean") return false;
  if (!Array.isArray(body.panels)) return false;

  // Validate panels and biomarkers
  for (const panel of body.panels) {
    if (!panel || typeof panel.name !== "string" || panel.name.trim() === "") return false;
    if (!Array.isArray(panel.biomarkers)) return false;

    for (const biomarker of panel.biomarkers) {
      if (!biomarker || typeof biomarker.name !== "string" || biomarker.name.trim() === "") return false;
      if (typeof biomarker.value !== "number") return false;
      if (typeof biomarker.unit !== "string" || biomarker.unit.trim() === "") return false;

      if (
          biomarker.flag !== "high" &&
          biomarker.flag !== "low" &&
          biomarker.flag !== "normal"
      ) {
        return false;
      }
    }
  }

  return true;
}

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

// POST /api/labs — create a new lab result for the logged-in user
router.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body;

    // Validate incoming request data
    if (!isValidLabPayload(body)) {
      res.status(400).json({ error: "Invalid lab result data" });
      return;
    }

    // Create lab result with nested panels and biomarkers
    const created = await prisma.labResult.create({
      data: {
        userId: req.userId!,
        dateCollected: new Date(body.dateCollected),
        dateReported: new Date(body.dateReported),
        fasting: body.fasting,
        panels: {
          create: body.panels.map((panel: any) => ({
            name: panel.name,
            biomarkers: {
              create: panel.biomarkers.map((biomarker: any) => ({
                name: biomarker.name,
                value: biomarker.value,
                unit: biomarker.unit,
                referenceMin: biomarker.referenceMin ?? null,
                referenceMax: biomarker.referenceMax ?? null,
                flag: biomarker.flag.toUpperCase(),
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
      id: created.id,
      dateCollected: created.dateCollected.toISOString().split("T")[0],
      dateReported: created.dateReported.toISOString().split("T")[0],
      fasting: created.fasting,
      panels: created.panels.map((p: any) => ({
        name: p.name,
        biomarkers: p.biomarkers.map((b: any) => ({
          name: b.name,
          value: b.value,
          unit: b.unit,
          referenceMin: b.referenceMin ?? undefined,
          referenceMax: b.referenceMax ?? undefined,
          flag: b.flag.toLowerCase() as "high" | "low" | "normal",
        })),
      })),
    });
  } catch (error) {
    console.error("Error creating lab result:", error);
    res.status(500).json({ error: "Failed to create lab result" });
  }
});
