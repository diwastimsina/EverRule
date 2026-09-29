// Persistence is optional. Nothing configured means the stateless demo (the
// browser holds the run). DATABASE_URL means managed Postgres for deployments.
// EVERRULE_DB=pglite means embedded Postgres on disk for local development;
// EVERRULE_DB=memory is for tests. Migrations in ./drizzle run on first connect.
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzlePg<typeof schema>> | ReturnType<typeof drizzlePglite<typeof schema>>;
export type PersistenceMode = "postgres" | "pglite" | "memory" | "none";

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(here, "..", "drizzle");

let cached: Promise<Db | null> | null = null;

export function persistenceMode(env: Record<string, string | undefined> = process.env): PersistenceMode {
  if (env["DATABASE_URL"]) return "postgres";
  if (env["EVERRULE_DB"] === "pglite") return "pglite";
  if (env["EVERRULE_DB"] === "memory") return "memory";
  return "none";
}

/** Shared connection for the app. Null when persistence is off. */
export function getDb(): Promise<Db | null> {
  if (!cached) cached = open(persistenceMode());
  return cached;
}

/** A fresh in-memory database with migrations applied. Tests use this. */
export async function openMemoryDb(): Promise<Db> {
  const db = await open("memory");
  if (!db) throw new Error("unreachable");
  return db;
}

async function open(mode: PersistenceMode): Promise<Db | null> {
  if (mode === "none") return null;
  if (mode === "postgres") {
    const { default: postgres } = await import("postgres");
    const sql = postgres(process.env["DATABASE_URL"]!, { max: 5, prepare: false });
    await applyMigrations(async (s) => { await sql.unsafe(s); });
    return drizzlePg(sql, { schema });
  }
  const { PGlite } = await import("@electric-sql/pglite");
  let client: InstanceType<typeof PGlite>;
  if (mode === "memory") {
    client = new PGlite();
  } else {
    const dir = join(process.cwd(), ".data");
    mkdirSync(dir, { recursive: true });
    client = new PGlite(join(dir, "everrule.pglite"));
  }
  await applyMigrations(async (s) => { await client.exec(s); });
  return drizzlePglite(client, { schema });
}

/** Applies every SQL file in ./drizzle once, in name order, tracked in everrule_migrations. */
async function applyMigrations(exec: (sql: string) => Promise<void>): Promise<void> {
  await exec("CREATE TABLE IF NOT EXISTS everrule_migrations (name text primary key, applied_at timestamptz not null default now())");
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    if (await isApplied(exec, f)) continue;
    const sql = readFileSync(join(MIGRATIONS_DIR, f), "utf8").split("--> statement-breakpoint").join("\n");
    await exec(sql);
    await exec(`INSERT INTO everrule_migrations (name) VALUES ('${f}')`);
  }
}

async function isApplied(exec: (sql: string) => Promise<void>, name: string): Promise<boolean> {
  try {
    await exec(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM everrule_migrations WHERE name = '${name}') THEN RAISE EXCEPTION 'EVERRULE_APPLIED'; END IF; END $$;`);
    return false;
  } catch (e) {
    if (e instanceof Error && e.message.includes("EVERRULE_APPLIED")) return true;
    throw e;
  }
}
