import { Router } from "express";
import { query } from "../db";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";
import { requireAdmin } from "../middleware/requireAdmin";

const router = Router();

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { serviceId, link, quantity } = req.body;
    if (!serviceId || !link || !quantity) {
      return res.status(400).json({ error: "serviceId, link, and quantity are required" });
    }

    const serviceResult = await query(`SELECT * FROM services WHERE id = $1`, [serviceId]);
    const service = serviceResult.rows[0];
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }
    if (quantity < service.min_qty || quantity > service.max_qty) {
      return res.status(400).json({ error: "Quantity outside allowed range" });
    }

    const userResult = await query(`SELECT * FROM users WHERE id = $1`, [req.user!.id]);
    const user = userResult.rows[0];
    const cost = Number(service.rate_per_1000) * (Number(quantity) / 1000);
    if (Number(user.balance) < cost) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const mappingResult = await query(
      `SELECT m.*, p.api_base_url, p.api_key FROM service_provider_mappings m JOIN providers p ON p.id = m.provider_id WHERE m.service_id = $1 AND m.is_active_provider = true LIMIT 1`,
      [serviceId]
    );
    const mapping = mappingResult.rows[0];
    if (!mapping) {
      return res.status(500).json({ error: "Active provider mapping unavailable" });
    }

    await query(`UPDATE users SET balance = balance - $1 WHERE id = $2`, [cost, req.user!.id]);
    const updatedUser = await query(`SELECT balance FROM users WHERE id = $1`, [req.user!.id]);

    const orderResult = await query(
      `INSERT INTO orders (user_id, service_id, provider_id, link, quantity, charge, cost_at_time, status) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending') RETURNING *`,
      [req.user!.id, serviceId, mapping.provider_id, link, quantity, cost, mapping.cost_price]
    );

    await query(
      `INSERT INTO transactions (user_id, type, amount, gateway, balance_after, status) VALUES ($1,'charge',$2,'system',$3,'completed')`,
      [req.user!.id, cost, updatedUser.rows[0].balance]
    );

    return res.json(orderResult.rows[0]);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to place order" });
  }
});

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await query(`SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC`, [req.user!.id]);
    return res.json(result.rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to fetch orders" });
  }
});

router.get("/admin", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const result = await query(`SELECT * FROM orders ORDER BY created_at DESC`);
    return res.json(result.rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to fetch admin orders" });
  }
});

export default router;
