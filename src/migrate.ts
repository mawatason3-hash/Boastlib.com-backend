import fs from "fs";
import path from "path";
import { pool } from "./db";

function resolvePath(relativePath: string) {
  const candidates = [
    path.join(__dirname, relativePath),
    path.join(__dirname, "..", relativePath),
    path.join(process.cwd(), relativePath),
    path.join(process.cwd(), "src", relativePath),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

export async function runMigrations() {
  const schemaPath = resolvePath("schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");

  console.log("Running schema.sql...");
  await pool.query(schemaSql);
  console.log("schema.sql applied.");

  const migrationsDir = resolvePath("migrations");
  if (fs.existsSync(migrationsDir) && fs.statSync(migrationsDir).isDirectory()) {
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

    for (const file of files) {
      console.log(`Running migration: ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
      await pool.query(sql);
      console.log(`${file} applied.`);
    }
  }
}
