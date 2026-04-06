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
