import { Router } from "express";
import { query } from "../db";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await query(`SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC`, [req.user!.id]);
    return res.json(result.rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to fetch transactions" });
  }
});

export default router;
