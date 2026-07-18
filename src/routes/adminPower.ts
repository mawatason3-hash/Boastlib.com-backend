import { Router } from "express";
import { query } from "../db";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";
import { requireAdmin } from "../middleware/requireAdmin";

const router = Router();

router.post("/boost", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { platform, serviceId, account, quantity, note } = req.body;
    const mappingResult = await query(`SELECT * FROM services WHERE id = $1`, [serviceId]);
    const service = mappingResult.rows[0];
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }
    const providerMappingResult = await query(
      `SELECT cost_price FROM service_provider_mappings WHERE service_id = $1 AND is_active_provider = true LIMIT 1`,
      [serviceId]
    );
    const mapping = providerMappingResult.rows[0];
    const providerCost = mapping ? Number(mapping.cost_price) * (Number(quantity) / 1000) : 0;

    await query(
      `INSERT INTO admin_power_boosts (admin_id, platform, service_id, account, quantity, provider_cost, status, note) VALUES ($1,$2,$3,$4,$5,$6,'pending',$7)`,
      [req.user!.id, platform, serviceId, account, quantity, providerCost, note]
    );
    return res.json({ success: true, provider_cost: providerCost });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to create admin boost" });
  }
});

export default router;
