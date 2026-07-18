import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../auth";

export interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing authorization token" });
    }

    const token = authHeader.split(" ")[1];
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
