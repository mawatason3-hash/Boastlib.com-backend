import { Router } from "express";
import { query } from "../db";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";

const router = Router();

router.get("/", async (req: AuthRequest, res) => {
  try {
    const { platform, category, status } = req.query;
    const filters: string[] = [];
    const values: any[] = [];

    if (platform) {
      values.push(platform);
      filters.push(`platform = $${values.length}`);
    }
    if (category) {
      values.push(category);
      filters.push(`category = $${values.length}`);
    }
    if (status) {
      values.push(status);
      filters.push(`status = $${values.length}`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const result = await query(`SELECT * FROM services ${whereClause} ORDER BY platform, category, name`, values);
    return res.json(result.rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to fetch services" });
  }
});

router.get("/platforms", async (_req, res) => {
  try {
    const result = await query(
      `SELECT
         platform,
         MAX(COALESCE(updated_at, created_at)) AS lastmod
       FROM services
       WHERE status = 'active'
       GROUP BY platform
       ORDER BY platform`
    );

    return res.json(
      result.rows.map((row: any) => ({
        platform: row.platform,
        lastmod: row.lastmod,
      }))
    );
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to fetch platforms" });
  }
});

router.get("/search", async (req: AuthRequest, res) => {
  try {
    const { q } = req.query;
    const search = String(q || "").trim();
    const wildcard = `%${search}%`;

    const result = await query(
      `SELECT
         s.id,
         s.platform,
         s.category,
         s.name,
         s.rate_per_1000,
         s.min_qty,
         s.max_qty,
         m.speed_estimate,
         m.avg_time_minutes,
         m.start_time_estimate,
         m.guaranteed,
         m.drip_feed_enabled,
         GREATEST(
           similarity(s.platform, $1),
           similarity(s.category, $1),
           similarity(s.name, $1),
           similarity(s.platform || ' ' || s.category || ' ' || s.name, $1)
         ) AS similarity
       FROM services s
       LEFT JOIN service_provider_mappings m
         ON m.service_id = s.id AND m.is_active_provider = true
       WHERE s.status = 'active'
         AND (
           $1 = ''
           OR s.platform ILIKE $2
           OR s.category ILIKE $2
           OR s.name ILIKE $2
           OR similarity(s.platform || ' ' || s.category || ' ' || s.name, $1) > 0.2
         )
       ORDER BY similarity DESC, s.platform, s.category, s.name
       LIMIT 10`,
      [search, wildcard]
    );

    return res.json(
      result.rows.map((row: any) => ({
        ...row,
        rate_per_1000: Number(row.rate_per_1000),
        min_qty: Number(row.min_qty),
        max_qty: Number(row.max_qty),
        avg_time_minutes: row.avg_time_minutes !== null ? Number(row.avg_time_minutes) : null,
        guaranteed: Boolean(row.guaranteed),
        drip_feed_enabled: Boolean(row.drip_feed_enabled),
      }))
    );
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to search services" });
  }
});

router.post("/:id/calculate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { quantity } = req.body;
    const parsedQuantity = Number(quantity);
    if (!parsedQuantity || parsedQuantity <= 0) {
      return res.status(400).json({ error: "Quantity must be a positive number" });
    }

    const result = await query(
      `SELECT
         s.id,
         s.platform,
         s.category,
         s.name,
         s.rate_per_1000,
         s.min_qty,
         s.max_qty,
         m.speed_estimate,
         m.avg_time_minutes,
         m.start_time_estimate,
         m.guaranteed,
         m.drip_feed_enabled
       FROM services s
       LEFT JOIN service_provider_mappings m
         ON m.service_id = s.id AND m.is_active_provider = true
       WHERE s.id = $1`,
      [req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: "Service not found" });
    }

    const service = result.rows[0];
    if (parsedQuantity < service.min_qty || parsedQuantity > service.max_qty) {
      return res.status(400).json({ error: `Quantity must be between ${service.min_qty} and ${service.max_qty}` });
    }

    const charge = Number(service.rate_per_1000) * (parsedQuantity / 1000);
    return res.json({
      service: {
        id: service.id,
        platform: service.platform,
        category: service.category,
        name: service.name,
        rate_per_1000: Number(service.rate_per_1000),
        min_qty: Number(service.min_qty),
        max_qty: Number(service.max_qty),
      },
      metadata: {
        speed_estimate: service.speed_estimate,
        avg_time_minutes: service.avg_time_minutes !== null ? Number(service.avg_time_minutes) : null,
        start_time_estimate: service.start_time_estimate,
        guaranteed: Boolean(service.guaranteed),
        drip_feed_enabled: Boolean(service.drip_feed_enabled),
      },
      quantity: parsedQuantity,
      charge: Number(charge.toFixed(2)),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to calculate order" });
  }
});

router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT
         s.id,
         s.platform,
         s.category,
         s.name,
         s.rate_per_1000,
         s.min_qty,
         s.max_qty,
         m.speed_estimate,
         m.avg_time_minutes,
         m.start_time_estimate,
         m.guaranteed,
         m.drip_feed_enabled
       FROM services s
       LEFT JOIN service_provider_mappings m
         ON m.service_id = s.id AND m.is_active_provider = true
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: "Service not found" });
    }
    const service = result.rows[0];
    return res.json({
      ...service,
      rate_per_1000: Number(service.rate_per_1000),
      min_qty: Number(service.min_qty),
      max_qty: Number(service.max_qty),
      avg_time_minutes: service.avg_time_minutes !== null ? Number(service.avg_time_minutes) : null,
      guaranteed: Boolean(service.guaranteed),
      drip_feed_enabled: Boolean(service.drip_feed_enabled),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to fetch service" });
  }
});

export default router;
