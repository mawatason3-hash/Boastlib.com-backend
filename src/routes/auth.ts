import { Router } from "express";
import { z } from "zod";
import { query } from "../db";
import { hashPassword, verifyPassword, createToken } from "../auth";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const schema = z.object({
      fullName: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(8),
    });
    const { fullName, email, password } = schema.parse(req.body);

    const passwordHash = await hashPassword(password);
    const result = await query(
      `INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, full_name, email, role, balance, status, created_at`,
      [fullName, email, passwordHash]
    );
    const user = result.rows[0];
    const token = createToken(user.id, user.role);
    return res.json({ user, token });
  } catch (error: any) {
    if (error.code === "23505") {
      return res.status(400).json({ error: "Email already exists" });
    }
    return res.status(400).json({ error: error.message || "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
    });
    const { email, password } = schema.parse(req.body);

    const result = await query(`SELECT * FROM users WHERE email = $1`, [email]);
    const user = result.rows[0];
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = createToken(user.id, user.role);
    return res.json({ user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role, balance: user.balance, status: user.status }, token });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || "Login failed" });
  }
});

export default router;
