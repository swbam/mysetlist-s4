import { db } from "@repo/database"
import { artists, setlists, shows, songs, venues } from "@repo/database"
import { inArray, sql } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "~/lib/supabase/server"
import { withRateLimit } from "~/middleware/rate-limit"

export const runtime = "nodejs"
export const maxDuration = 30 // 30 seconds for batch operations

interface BatchOperation {
  id: string
  type: "create" | "update" | "delete" | "upsert"
  resource: "artists" | "shows" | "venues" | "songs" | "setlists"
  data: any
}

interface BatchRequest {
  operations: BatchOperation[]
  transactional?: boolean
  continueOnError?: boolean
}

interface BatchResult {
  id: string
  success: boolean
  result?: any
  error?: string
}

async function processBatchOperations(
  operations: BatchOperation[],
  options: { transactional: boolean; continueOnError: boolean }
): Promise<BatchResult[]> {
  const results: BatchResult[] = []

  if (options.transactional) {
    // Process all operations in a single transaction
    try {
      await db.transaction(async (tx) => {
        for (const op of operations) {
          const result = await processOperation(op, tx)
          results.push(result)

          if (!result.success && !options.continueOnError) {
            throw new Error(`Operation ${op.id} failed: ${result.error}`)
          }
        }
      })
    } catch (_error) {
      // If transaction fails, mark all remaining operations as failed
      const processedIds = new Set(results.map((r) => r.id))
      for (const op of operations) {
        if (!processedIds.has(op.id)) {
          results.push({
            id: op.id,
            success: false,
            error: "Transaction rolled back",
          })
        }
      }
    }
  } else {
    // Process operations individually
    for (const op of operations) {
      const result = await processOperation(op, db)
      results.push(result)

      if (!result.success && !options.continueOnError) {
        break
      }
    }
  }

  return results
}

async function processOperation(
  operation: BatchOperation,
  dbClient: any
): Promise<BatchResult> {
  try {
    let result

    switch (operation.type) {
      case "create":
        result = await handleCreate(operation, dbClient)
        break
      case "update":
        result = await handleUpdate(operation, dbClient)
        break
      case "delete":
        result = await handleDelete(operation, dbClient)
        break
      case "upsert":
        result = await handleUpsert(operation, dbClient)
        break
      default:
        throw new Error(`Unknown operation type: ${operation.type}`)
    }

    return {
      id: operation.id,
      success: true,
      result,
    }
  } catch (error) {
    return {
      id: operation.id,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

async function handleCreate(operation: BatchOperation, dbClient: any) {
  const table = getTable(operation.resource)

  if (Array.isArray(operation.data)) {
    // Batch insert
    return await dbClient.insert(table).values(operation.data).returning()
  }
  // Single insert
  const [result] = await dbClient
    .insert(table)
    .values(operation.data)
    .returning()
  return result
}

async function handleUpdate(operation: BatchOperation, dbClient: any) {
  const table = getTable(operation.resource)

  if (Array.isArray(operation.data)) {
    // Batch update - update multiple records by ID
    const updates: any[] = []

    for (const item of operation.data) {
      const { id, ...updateData } = item
      const [updated] = await dbClient
        .update(table)
        .set(updateData)
        .where(sql`${table.id} = ${id}`)
        .returning()
      updates.push(updated)
    }

    return updates
  }
  // Single update
  const { id, ...updateData } = operation.data
  const [result] = await dbClient
    .update(table)
    .set(updateData)
    .where(sql`${table.id} = ${id}`)
    .returning()
  return result
}

async function handleDelete(operation: BatchOperation, dbClient: any) {
  const table = getTable(operation.resource)

  if (Array.isArray(operation.data)) {
    // Batch delete by IDs
    const ids = operation.data.map((item: any) =>
      typeof item === "string" ? item : item.id
    )

    return await dbClient
      .delete(table)
      .where(inArray(table.id, ids))
      .returning()
  }
  // Single delete
  const id =
    typeof operation.data === "string" ? operation.data : operation.data.id

  const [result] = await dbClient
    .delete(table)
    .where(sql`${table.id} = ${id}`)
    .returning()
  return result
}

async function handleUpsert(operation: BatchOperation, dbClient: any) {
  const table = getTable(operation.resource)

  if (Array.isArray(operation.data)) {
    // Batch upsert
    return await dbClient
      .insert(table)
      .values(operation.data)
      .onConflictDoUpdate({
        target: table.id,
        set: operation.data.reduce((acc: any, item: any) => {
          const { id, ...rest } = item
          Object.keys(rest).forEach((key) => {
            acc[key] = sql`EXCLUDED.${sql.identifier(key)}`
          })
          return acc
        }, {}),
      })
      .returning()
  }
  // Single upsert
  const { id, ...data } = operation.data
  const [result] = await dbClient
    .insert(table)
    .values(operation.data)
    .onConflictDoUpdate({
      target: table.id,
      set: Object.keys(data).reduce((acc: any, key) => {
        acc[key] = sql`EXCLUDED.${sql.identifier(key)}`
        return acc
      }, {}),
    })
    .returning()
  return result
}

function getTable(resource: string) {
  const tables: Record<string, any> = {
    artists,
    shows,
    venues,
    songs,
    setlists,
  }

  const table = tables[resource]
  if (!table) {
    throw new Error(`Unknown resource: ${resource}`)
  }

  return table
}

async function handler(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createServiceClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: BatchRequest = await request.json()

    // Validate request
    if (!body.operations || !Array.isArray(body.operations)) {
      return NextResponse.json(
        { error: "Invalid request: operations array required" },
        { status: 400 }
      )
    }

    if (body.operations.length > 100) {
      return NextResponse.json(
        { error: "Too many operations: maximum 100 per request" },
        { status: 400 }
      )
    }

    // Process operations
    const results = await processBatchOperations(body.operations, {
      transactional: body.transactional ?? false,
      continueOnError: body.continueOnError ?? false,
    })

    // Calculate summary
    const summary = {
      total: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    }

    const response = NextResponse.json({
      success: summary.failed === 0,
      summary,
      results,
      timestamp: new Date().toISOString(),
    })

    // No caching for batch operations
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")

    return response
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to process batch operations" },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handler, {
  maxRequests: 10,
  windowSeconds: 60, // 10 batch requests per minute
})
