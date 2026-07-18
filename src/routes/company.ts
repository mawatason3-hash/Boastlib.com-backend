import { Router } from "express";
import { query } from "../db";
import { requireAuth, requireAdmin } from "../middleware/requireAuth";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const result = await query(
      `SELECT name, email, phone, address_country, address_locality, website, logo_url FROM company_info LIMIT 1`
    );

    if (!result.rowCount) {
      return res.json({
        name: "BoastLib",
        email: "support@boastlib.com",
        phone: "+250 788 000 000",
        address_country: "RW",
        address_locality: "Kigali",
        website: "https://boastlib.com",
        logo_url: "https://boastlib.com/logo.png",
      });
    }

    return res.json(result.rows[0]);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to fetch company info" });
  }
});

router.patch("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, phone, address_country, address_locality, website, logo_url } = req.body;
    const existing = await query(`SELECT id FROM company_info LIMIT 1`);

    if (existing.rowCount) {
      await query(
        `UPDATE company_info SET name = $1, email = $2, phone = $3, address_country = $4, address_locality = $5, website = $6, logo_url = $7 WHERE id = $8`,
        [name, email, phone, address_country, address_locality, website, logo_url, existing.rows[0].id]
      );
    } else {
      await query(
        `INSERT INTO company_info (name, email, phone, address_country, address_locality, website, logo_url) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [name, email, phone, address_country, address_locality, website, logo_url]
      );
    }

    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to update company info" });
  }
});

export default router;
