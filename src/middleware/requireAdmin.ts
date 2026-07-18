import { Response, NextFunction } from "express";
import { AuthRequest } from "./requireAuth";

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin privileges required" });
  }
  next();
};
