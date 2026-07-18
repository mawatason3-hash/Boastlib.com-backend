import { Router } from "express";
import { query } from "../db";

const router = Router();

router.get("/platforms", async (_req, res) => {
  try {
    const result = await query(
      `SELECT
         platform,
         MAX(updated_at) AS lastmod
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

router.get("/", async (req, res) => {
  try {
    const platform = String(req.query.platform || "").trim();
    const values: any[] = [];
    const filters = ["s.status = 'active'"];

    if (platform) {
      values.push(platform);
      filters.push(`LOWER(s.platform) = LOWER($${values.length})`);
    }

    const whereClause = `WHERE ${filters.join(" AND ")}`;
    const limit = Number(req.query.limit) || 100;
    values.push(limit);

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
       ${whereClause}
       ORDER BY s.platform, s.category, s.name
       LIMIT $${values.length}`,
      values
    );

    return res.json(
      result.rows.map((row: any) => ({
        id: row.id,
        platform: row.platform,
        category: row.category,
        name: row.name,
        rate_per_1000: Number(row.rate_per_1000),
        min_qty: Number(row.min_qty),
        max_qty: Number(row.max_qty),
        speed_estimate: row.speed_estimate,
        avg_time_minutes: row.avg_time_minutes !== null ? Number(row.avg_time_minutes) : null,
        start_time_estimate: row.start_time_estimate,
        guaranteed: Boolean(row.guaranteed),
        drip_feed_enabled: Boolean(row.drip_feed_enabled),
      }))
    );
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to fetch services" });
  }
});

router.get("/search", async (req, res) => {
  try {
    const search = String(req.query.q || "").trim();
    const terms = search.split(/\s+/).filter(Boolean);
    const whereClauses: string[] = ["s.status = 'active'"];
    const values: any[] = [];

    if (terms.length) {
      terms.forEach((term) => {
        values.push(`%${term}%`);
        whereClauses.push(`(
          s.platform ILIKE $${values.length}
          OR s.category ILIKE $${values.length}
          OR s.name ILIKE $${values.length}
        )`);
      });
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
         m.start_time_estimate,
         m.guaranteed,
         m.drip_feed_enabled,
         similarity(s.platform || ' ' || s.category || ' ' || s.name, $${values.length + 1}) AS similarity
       FROM services s
       LEFT JOIN service_provider_mappings m
         ON m.service_id = s.id AND m.is_active_provider = true
       ${terms.length ? `WHERE ${whereClauses.join(" AND ")}` : "WHERE s.status = 'active'"}
       ORDER BY similarity DESC, s.platform, s.category, s.name
       LIMIT 10`,
      [...values, search]
    );

    return res.json(
      result.rows.map((row: any) => ({
        id: row.id,
        platform: row.platform,
        category: row.category,
        name: row.name,
        rate_per_1000: Number(row.rate_per_1000),
        min_qty: Number(row.min_qty),
        max_qty: Number(row.max_qty),
        speed_estimate: row.speed_estimate,
        start_time_estimate: row.start_time_estimate,
        guaranteed: Boolean(row.guaranteed),
        drip_feed_enabled: Boolean(row.drip_feed_enabled),
      }))
    );
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to search services" });
  }
});

router.get("/:id", async (req, res) => {
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

    const row = result.rows[0];
    return res.json({
      id: row.id,
      platform: row.platform,
      category: row.category,
      name: row.name,
      rate_per_1000: Number(row.rate_per_1000),
      min_qty: Number(row.min_qty),
      max_qty: Number(row.max_qty),
      speed_estimate: row.speed_estimate,
      avg_time_minutes: row.avg_time_minutes !== null ? Number(row.avg_time_minutes) : null,
      start_time_estimate: row.start_time_estimate,
      guaranteed: Boolean(row.guaranteed),
      drip_feed_enabled: Boolean(row.drip_feed_enabled),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to fetch service" });
  }
});

export default router;
