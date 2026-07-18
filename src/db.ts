import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

function normalizeConnectionString(connectionString: string) {
  if (connectionString.startsWith("postgres://")) {
    return connectionString.replace("postgres://", "postgresql://");
  }
  return connectionString;
}

function resolveConnectionStrings() {
  const fallbackDatabaseUrl = "postgresql://postgres:HqZaVwsYtBZdOdGVtKUHWZdXpHaWgezx@postgres.railway.internal:5432/railway";
  const candidates = [
    process.env.DATABASE_URL,
    process.env.DATABASE_PUBLIC_URL,
    process.env.DATABASE_PRIVATE_URL,
    process.env.RAILWAY_DATABASE_URL,
    fallbackDatabaseUrl,
  ].filter(Boolean) as string[];

  if (candidates.length > 0) {
    return candidates.map(normalizeConnectionString);
  }

  const host = process.env.PGHOST;
  if (host) {
    const user = process.env.PGUSER || "postgres";
    const password = process.env.PGPASSWORD || "";
    const port = process.env.PGPORT || "5432";
    const database = process.env.PGDATABASE || "postgres";
    return [normalizeConnectionString(`postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`)];
  }

  throw new Error("No database connection string found. Set DATABASE_URL, DATABASE_PUBLIC_URL, DATABASE_PRIVATE_URL, RAILWAY_DATABASE_URL, or PGHOST/PGUSER/PGPASSWORD/PGDATABASE.");
}

const isRailwayRuntime = Boolean(process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_PROJECT_NAME);
const connectionStrings = resolveConnectionStrings();

function createPool(connectionString: string) {
  return new Pool({
    connectionString,
    ssl: isRailwayRuntime ? { rejectUnauthorized: false } : undefined,
  });
}

let currentConnectionString = connectionStrings[0];
let pool = createPool(currentConnectionString);

async function switchToNextConnectionString(error: unknown) {
  const currentIndex = connectionStrings.indexOf(currentConnectionString);
  const nextConnectionString = connectionStrings.find((candidate, index) => index > currentIndex && candidate !== currentConnectionString);

  if (!nextConnectionString) {
    throw error;
  }

  currentConnectionString = nextConnectionString;
  await pool.end();
  pool = createPool(nextConnectionString);
  return nextConnectionString;
}

export const query = async (text: string, params?: any[]) => {
  try {
    return await pool.query(text, params);
  } catch (error: any) {
    const isDnsFailure = error?.code === "ENOTFOUND" || error?.errno === -3008 || error?.message?.includes("ENOTFOUND");
    if (isDnsFailure && connectionStrings.length > 1) {
      const nextConnectionString = await switchToNextConnectionString(error);
      console.warn(`Database host lookup failed. Retrying with ${nextConnectionString}`);
      return await pool.query(text, params);
    }
    throw error;
  }
};

export { pool };
