export { getDb, openMemoryDb, persistenceMode, type Db, type PersistenceMode } from "./client";
export { Repo, type IncidentMeta, type PullRequestRef } from "./repo";
export * as schema from "./schema";

/** One workspace until Sprint 8 adds real organizations. */
export const DEMO_ORG = { id: "org_demo", name: "Demo workspace", slug: "demo" } as const;
