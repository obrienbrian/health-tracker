import { Router, Request, Response } from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/auth.js";
import { parseLabCorpPdf } from "../lib/parse-labcorp.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

const router = Router();

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

export default router;
