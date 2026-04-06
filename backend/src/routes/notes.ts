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
