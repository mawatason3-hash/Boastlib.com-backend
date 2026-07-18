import { Router } from "express";
import { query } from "../db";

const router = Router();

router.get("/public", async (_req, res) => {
  try {
    const result = await query(
      `SELECT platform, MIN(rate_per_1000) AS cheapest_rate, COUNT(*) AS service_count
       FROM services
       WHERE status = 'active'
       GROUP BY platform
       ORDER BY MIN(rate_per_1000) ASC`
    );

    const stats = result.rows.map((row) => ({
      platform: row.platform,
      cheapestRate: Number(row.cheapest_rate),
      serviceCount: Number(row.service_count),
    }));

    return res.json(stats);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to fetch public stats" });
  }
});

export default router;
