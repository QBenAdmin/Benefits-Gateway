import { Router } from "express";
import { seedDatabase } from "../lib/seed";

const router = Router();

const SEED_KEY = process.env.SEED_KEY ?? "beneportal-seed-2025-xK9mR";

router.post("/admin/seed", async (req, res) => {
  const key = req.headers["x-seed-key"];
  if (key !== SEED_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const result = await seedDatabase();
  res.json(result);
});

export default router;
