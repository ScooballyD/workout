import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mock API for workout data
  app.get("/api/workouts", (req, res) => {
    res.json([
      { id: "1", name: "Bench Press", sets: 5, reps: "5-8", completedSets: [] },
      { id: "2", name: "Incline Dumbbell Press", sets: 4, reps: "8-10", completedSets: [] },
      { id: "3", name: "Pec Deck Fly", sets: 3, reps: "12-15", completedSets: [] },
      { id: "4", name: "Tricep Pushdown", sets: 4, reps: "10-12", completedSets: [] },
    ]);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
