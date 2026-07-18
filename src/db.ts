import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

function resolveConnectionString() {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.DATABASE_PUBLIC_URL,
    process.env.DATABASE_PRIVATE_URL,
    process.env.RAILWAY_DATABASE_URL,
  ].filter(Boolean) as string[];

  let connectionString = candidates[0] || "";

  if (!connectionString) {
    const host = process.env.PGHOST;
    if (host) {
      const user = process.env.PGUSER || "postgres";
      const password = process.env.PGPASSWORD || "";
      const port = process.env.PGPORT || "5432";
      const database = process.env.PGDATABASE || "postgres";
      connectionString = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
    }
  }

  if (!connectionString) {
    throw new Error("No database connection string found. Set DATABASE_URL, DATABASE_PUBLIC_URL, DATABASE_PRIVATE_URL, RAILWAY_DATABASE_URL, or PGHOST/PGUSER/PGPASSWORD/PGDATABASE.");
  }

  if (connectionString.startsWith("postgres://")) {
    connectionString = connectionString.replace("postgres://", "postgresql://");
  }

  return connectionString;
}

const connectionString = resolveConnectionString();
const isRailwayRuntime = Boolean(process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_PROJECT_NAME);

export const pool = new Pool({
  connectionString,
  ssl: isRailwayRuntime ? { rejectUnauthorized: false } : undefined,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
