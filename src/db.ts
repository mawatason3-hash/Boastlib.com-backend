import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

let connectionString = process.env.DATABASE_URL || "";
if (connectionString.startsWith("postgres://")) {
  connectionString = connectionString.replace("postgres://", "postgresql://");
}

export const pool = new Pool({ connectionString });

export const query = (text: string, params?: any[]) => pool.query(text, params);
