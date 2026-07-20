import { randomBytes } from "crypto";
import { Request, Response, Router } from "express";
import { z } from "zod";
import { query } from "../db";
import { hashPassword, verifyPassword, createToken } from "../auth";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";

const router = Router();
const googleStateStore = new Map<string, number>();

function getBaseUrl(req: Request) {
  const forwardedProto = req.get("x-forwarded-proto");
  const protocol = forwardedProto?.split(",")[0] || req.protocol;
  const host = req.get("host");
  return `${protocol}://${host}`;
}

function getGoogleConfig(req: Request) {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || process.env.GOOGLE_OAUTH_REDIRECT_URI || `${getBaseUrl(req)}/api/auth/google/callback`,
  };
}

function sanitizeUser(user: any) {
  return {
    id: user.id,
    full_name: user.full_name,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    balance: user.balance,
    status: user.status,
  };
}

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
    return res.json({ user: sanitizeUser(user), token });
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
    return res.json({ user: sanitizeUser(user), token });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || "Login failed" });
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await query(`SELECT id, full_name, email, role, balance, status FROM users WHERE id = $1`, [userId]);
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      balance: user.balance,
      status: user.status,
    }});
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Unable to fetch user" });
  }
});

router.get("/google", (req, res) => {
  const config = getGoogleConfig(req);
  if (!config.clientId || !config.clientSecret) {
    return res.status(500).json({ error: "Google OAuth is not configured" });
  }

  const state = randomBytes(16).toString("hex");
  googleStateStore.set(state, Date.now() + 10 * 60 * 1000);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get("/google/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Missing Google authorization code" });
    }

    if (!state || typeof state !== "string" || !googleStateStore.has(state)) {
      return res.status(400).json({ error: "Invalid Google OAuth state" });
    }

    googleStateStore.delete(state);

    const config = getGoogleConfig(req);
    if (!config.clientId || !config.clientSecret) {
      return res.status(500).json({ error: "Google OAuth is not configured" });
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return res.status(400).json({ error: tokenData.error_description || "Failed to exchange Google code" });
    }

    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = await userResponse.json();
    const email = profile.email;
    if (!email) {
      return res.status(400).json({ error: "Google account did not return an email" });
    }

    const existing = await query(`SELECT * FROM users WHERE email = $1 OR google_id = $2 LIMIT 1`, [email, profile.id]);
    let user = existing.rows[0];

    if (user) {
      if (!user.google_id) {
        await query(`UPDATE users SET google_id = $1, full_name = COALESCE($2, full_name) WHERE id = $3`, [profile.id, profile.name || profile.given_name || user.full_name, user.id]);
      }
    } else {
      const insertResult = await query(
        `INSERT INTO users (full_name, email, google_id, password_hash, role, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, full_name, email, role, balance, status, created_at`,
        [profile.name || profile.given_name || "Google User", email, profile.id, null, "user", "active"]
      );
      user = insertResult.rows[0];
    }

    const token = createToken(user.id, user.role);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const redirectTarget = new URL("/auth/google/callback", frontendUrl);
    redirectTarget.searchParams.set("token", token);
    redirectTarget.searchParams.set("user", encodeURIComponent(JSON.stringify(sanitizeUser(user))));

    return res.redirect(redirectTarget.toString());
  } catch (error: any) {
    return res.status(400).json({ error: error.message || "Google login failed" });
  }
});

export default router;
