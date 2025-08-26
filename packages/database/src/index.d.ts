export declare const db: import("drizzle-orm/postgres-js").PostgresJsDatabase<Record<string, unknown>>;
export declare function testConnection(): Promise<boolean>;
export { sql, eq, and, or, desc, asc, ilike, isNull, isNotNull, inArray } from "drizzle-orm";
export * from "./schema";
export * from "./utils/growth-calculation";
export * from "./schema/admin";
//# sourceMappingURL=index.d.ts.map