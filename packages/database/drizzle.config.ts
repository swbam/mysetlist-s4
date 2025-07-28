import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { config } from "dotenv"
import type { Config } from "drizzle-kit"

// Load environment variables from multiple possible locations
const envPaths = [
  resolve(__dirname, "../../.env.local"),
  resolve(__dirname, "../../apps/web/.env.local"),
  resolve(__dirname, ".env.local"),
  resolve(__dirname, ".env"),
]

// Load environment variables from all available paths
for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    config({ path: envPath, override: false })
  }
}

// Get DATABASE_URL from environment
const DATABASE_URL = process.env["DATABASE_URL"] || process.env["POSTGRES_URL"]

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is required for database migrations. Please check your .env.local file."
  )
}

export default {
  schema: "./src/schema/index.ts",
  out: "./migrations",
  driver: "pg",
  dbCredentials: {
    connectionString: DATABASE_URL,
  },
  verbose: true,
  strict: false, // disable interactive prompts to allow non-interactive CI migrations
  // @ts-ignore - property not in Config type but supported at runtime
  extensionsFilters: ["postgis"],
} satisfies Config
