import { Router } from "express";
import { query } from "../db";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";
import { initCardPayment, verifyPayment as verifyPaystackPayment, verifyPaystackSignature } from "../payments/paystack";
import { initMobileMoneyPayment as initDpoPayment, verifyPayment as verifyDpoPayment } from "../payments/dpo";
import { initMobileMoneyPayment as initPawapayPayment, verifyPayment as verifyPawapayPayment } from "../payments/pawapay";

const router = Router();

router.post("/country", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { country } = req.body;
    if (!country) {
      return res.status(400).json({ error: "Country is required" });
    }
    const result = await query(`SELECT method_type, gateway FROM payment_gateway_configs WHERE country = $1 AND enabled = true`, [country]);
    return res.json(result.rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to fetch gateways" });
  }
});

router.post("/paystack/init", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { amount, email } = req.body;
    const init = await initCardPayment(amount, email);
    return res.json(init);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to initialize Paystack payment" });
  }
});

router.post("/paystack/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-paystack-signature"] as string;
    const payload = JSON.stringify(req.body);
    if (!verifyPaystackSignature(signature, payload)) {
      return res.status(403).json({ error: "Invalid Paystack signature" });
    }
    const event = req.body;
    if (event.event === "charge.success") {
      const { reference, amount, customer } = event.data;
      const email = customer.email;
      const userResult = await query(`SELECT id, balance FROM users WHERE email = $1`, [email]);
      const user = userResult.rows[0];
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const creditedAmount = Number(amount) / 100;
      const newBalance = Number(user.balance) + creditedAmount;
      await query(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, user.id]);
      await query(
        `INSERT INTO transactions (user_id, type, amount, gateway, gateway_ref, balance_after, status) VALUES ($1, 'deposit', $2, 'paystack', $3, $4, 'completed')`,
        [user.id, creditedAmount, reference, newBalance]
      );
    }
    return res.json({ received: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Paystack webhook failed" });
  }
});

router.post("/momo/init", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { amount, phone, country } = req.body;
    const configResult = await query(
      `SELECT gateway FROM payment_gateway_configs WHERE country = $1 AND method_type = 'momo' AND enabled = true ORDER BY gateway`,
      [country]
    );
    if (!configResult.rowCount) {
      return res.status(400).json({ error: "No mobile money gateway configured for this country" });
    }
    const gateway = configResult.rows[0].gateway;
    const init = gateway === "dpo" ? await initDpoPayment(amount, phone, country) : await initPawapayPayment(amount, phone, country);
    return res.json({ gateway, init });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to initialize mobile money payment" });
  }
});

router.post("/momo/webhook", async (req, res) => {
  try {
    const { reference, gateway } = req.body;
    if (!reference || !gateway) {
      return res.status(400).json({ error: "reference and gateway are required" });
    }
    const verify = gateway === "dpo" ? await verifyDpoPayment(reference) : await verifyPawapayPayment(reference);
    if (!verify || verify.status !== "success") {
      return res.status(400).json({ error: "Payment verification failed" });
    }
    const email = verify.customer?.email || verify.email;
    const userResult = await query(`SELECT id, balance FROM users WHERE email = $1`, [email]);
    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const creditedAmount = Number(verify.amount || 0);
    const newBalance = Number(user.balance) + creditedAmount;
    await query(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, user.id]);
    await query(
      `INSERT INTO transactions (user_id, type, amount, gateway, gateway_ref, balance_after, status) VALUES ($1, 'deposit', $2, $3, $4, $5, 'completed')`,
      [user.id, creditedAmount, gateway, reference, newBalance]
    );
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Mobile money webhook failed" });
  }
});

export default router;
