import { Router } from "express";
import { query } from "../db";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";
import { requireAdmin } from "../middleware/requireAdmin";
import { hashPassword } from "../auth";
import { recalculateServicePrice } from "../providers/pricingEngine";

const router = Router();

router.get("/users", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const result = await query(`SELECT id, full_name, email, balance, status, role, created_at FROM users ORDER BY created_at DESC`);
    return res.json(result.rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to fetch users" });
  }
});

router.patch("/users/:id/balance", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { balance } = req.body;
    await query(`UPDATE users SET balance = $1 WHERE id = $2`, [balance, id]);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to update user balance" });
  }
});

router.patch("/users/:id/status", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await query(`UPDATE users SET status = $1 WHERE id = $2`, [status, id]);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to update user status" });
  }
});

router.post("/seed", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: "fullName, email, and password are required" });
    }
    const passwordHash = await hashPassword(password);
    const existing = await query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
    if (existing.rowCount) {
      return res.status(400).json({ error: "Admin user already exists" });
    }
    const result = await query(
      `INSERT INTO users (full_name, email, password_hash, role, balance, status) VALUES ($1,$2,$3,'admin',0,'active') RETURNING id, full_name, email, role, balance, status, created_at`,
      [fullName, email, passwordHash]
    );
    return res.json(result.rows[0]);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to seed admin user" });
  }
});

router.get("/developer-info", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const result = await query(`SELECT * FROM developer_info LIMIT 1`);
    return res.json(result.rows[0] || null);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to fetch developer info" });
  }
});

router.patch("/developer-info", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, contact, creditLine } = req.body;
    const existing = await query(`SELECT id FROM developer_info LIMIT 1`);
    if (existing.rowCount) {
      await query(`UPDATE developer_info SET name = $1, contact = $2, credit_line = $3 WHERE id = $4`, [name, contact, creditLine, existing.rows[0].id]);
    } else {
      await query(`INSERT INTO developer_info (name, contact, credit_line) VALUES ($1,$2,$3)`, [name, contact, creditLine]);
    }
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to update developer info" });
  }
});

router.get("/services", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const result = await query(`SELECT * FROM services ORDER BY platform, category, name`);
    return res.json(result.rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to fetch admin services" });
  }
});

router.post("/services", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { platform, category, name, minQty, maxQty, refillEnabled, cancelEnabled, status } = req.body;
    const result = await query(
      `INSERT INTO services (platform, category, name, rate_per_1000, min_qty, max_qty, refill_enabled, cancel_enabled, status) VALUES ($1,$2,$3,0,$4,$5,$6,$7,$8) RETURNING *`,
      [platform, category, name, minQty ?? 100, maxQty ?? 100000, refillEnabled ?? false, cancelEnabled ?? false, status ?? "active"]
    );
    return res.json(result.rows[0]);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to create service" });
  }
});

router.post("/services/sync-provider", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { serviceId } = req.body;
    await recalculateServicePrice(serviceId);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to sync service provider" });
  }
});

router.patch("/services/:id/pin-provider", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { providerId } = req.body;
    const serviceId = req.params.id;
    await query(
      `UPDATE service_provider_mappings SET priority_override = CASE WHEN provider_id = $1 THEN true ELSE false END WHERE service_id = $2`,
      [providerId, serviceId]
    );
    await recalculateServicePrice(serviceId);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to pin provider" });
  }
});

export default router;
