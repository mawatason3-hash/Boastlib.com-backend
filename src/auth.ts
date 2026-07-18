import { sign, verify } from "jsonwebtoken";
import type { StringValue } from "ms";
import bcrypt from "bcrypt";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
const JWT_EXPIRES_IN: StringValue = (process.env.JWT_EXPIRES_IN || "7d") as StringValue;

export const hashPassword = (password: string) => bcrypt.hash(password, 10);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

export const createToken = (userId: string, role: string) =>
  sign({ sub: userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

export const verifyToken = (token: string) =>
  verify(token, JWT_SECRET) as { sub: string; role: string };
