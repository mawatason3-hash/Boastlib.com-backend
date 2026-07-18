import { Router } from "express";
import { query } from "../db";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";
import { requireAdmin } from "../middleware/requireAdmin";
import { randomBytes } from "crypto";

const router = Router();

router.get("/info", async (_req, res) => {
  try {
    const result = await query(`SELECT name, contact, credit_line FROM developer_info LIMIT 1`);
    return res.json(result.rows[0] || { name: "BoastLib", contact: "support@boastlib.com", credit_line: "Built by Solomon" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to fetch developer info" });
  }
});

router.post("/request-key", async (req, res) => {
  try {
    const { name, organization, useCase } = req.body;
    if (!name || !organization || !useCase) {
      return res.status(400).json({ error: "name, organization, and useCase are required" });
    }
    const apiKey = randomBytes(24).toString("hex");
    await query(
      `INSERT INTO developer_keys (issued_to, api_key, base_url, rate_limit, usage_count, status) VALUES ($1,$2,$3,60,0,'pending')`,
      [name, apiKey, process.env.API_BASE_URL || process.env.FRONTEND_URL || ""]
    );
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to request API key" });
  }
});

router.get("/docs", async (_req, res) => {
  try {
    return res.json({
      baseUrl: process.env.API_BASE_URL || process.env.BACKEND_URL || process.env.FRONTEND_URL || "",
      endpoints: [
        { path: "/services", method: "GET", description: "List available services" },
        { path: "/orders", method: "POST", description: "Place an order" },
        { path: "/orders/:id", method: "GET", description: "Check order status" },
        { path: "/developer/info", method: "GET", description: "Developer portal details" },
        { path: "/developer/request-key", method: "POST", description: "Request API access" },
      ],
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to fetch docs" });
  }
});

router.get("/admin/developer-keys", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const result = await query(`SELECT * FROM developer_keys ORDER BY created_at DESC`);
    return res.json(result.rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to fetch developer keys" });
  }
});

router.patch("/admin/developer-keys/:id/approve", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await query(`UPDATE developer_keys SET status = 'active' WHERE id = $1`, [id]);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to approve developer key" });
  }
});

router.patch("/admin/developer-keys/:id/revoke", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await query(`UPDATE developer_keys SET status = 'revoked' WHERE id = $1`, [id]);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to revoke developer key" });
  }
});

export default router;
