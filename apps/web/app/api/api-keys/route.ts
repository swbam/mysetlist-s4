import { createHash } from 'node:crypto';
import { db } from '@repo/database';
import { apiKeys } from '@repo/database';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '~/lib/supabase/server';

export const runtime = 'nodejs';

interface CreateApiKeyRequest {
  name: string;
  scopes: string[];
  expiresIn?: number; // days
  rateLimit?: {
    requests: number;
    window: number; // seconds
  };
}

// Generate a secure API key
function generateApiKey(): { key: string; hash: string } {
  const prefix = 'msl_';
  const randomPart = nanoid(32);
  const key = `${prefix}${randomPart}`;

  // Hash the key for storage
  const hash = createHash('sha256').update(key).digest('hex');

  return { key, hash };
}


export async function GET(_request: NextRequest) {
  try {
    // Check authentication
    const supabase = createServiceClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's API keys
    const keys = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        scopes: apiKeys.scopes,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
        rateLimit: apiKeys.rateLimit,
      })
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, user.id), eq(apiKeys.isActive, true)))
      .orderBy(apiKeys.createdAt);

    return NextResponse.json({
      keys,
      count: keys.length,
    });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createServiceClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateApiKeyRequest = await request.json();

    // Validate request
    if (!body.name || !body.scopes || !Array.isArray(body.scopes)) {
      return NextResponse.json(
        { error: 'Invalid request: name and scopes are required' },
        { status: 400 }
      );
    }

    // Check user's API key limit (e.g., max 10 keys)
    const existingKeys = await db
      .select({ id: apiKeys.id })
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, user.id), eq(apiKeys.isActive, true)));

    if (existingKeys.length >= 10) {
      return NextResponse.json(
        { error: 'API key limit reached. Maximum 10 keys allowed.' },
        { status: 400 }
      );
    }

    // Generate API key
    const { key, hash } = generateApiKey();

    // Calculate expiry
    const expiresAt = body.expiresIn
      ? new Date(Date.now() + body.expiresIn * 24 * 60 * 60 * 1000)
      : null;

    // Create API key record
    const [apiKey] = await db
      .insert(apiKeys)
      .values({
        id: nanoid(),
        userId: user.id,
        name: body.name,
        keyHash: hash,
        scopes: body.scopes,
        expiresAt,
        rateLimit: body.rateLimit || { requests: 1000, window: 3600 },
        isActive: true,
      })
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        scopes: apiKeys.scopes,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
      });

    return NextResponse.json({
      apiKey: {
        ...apiKey,
        key, // Only returned once on creation
      },
      message:
        'API key created successfully. Store this key securely - it will not be shown again.',
    });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createServiceClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json(
        { error: 'API key ID is required' },
        { status: 400 }
      );
    }

    // Soft delete the API key
    const [deleted] = await db
      .update(apiKeys)
      .set({
        isActive: false,
        revokedAt: new Date(),
      })
      .where(
        and(
          eq(apiKeys.id, keyId),
          eq(apiKeys.userId, user.id),
          eq(apiKeys.isActive, true)
        )
      )
      .returning({ id: apiKeys.id });

    if (!deleted) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'API key revoked successfully',
      id: deleted.id,
    });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to revoke API key' },
      { status: 500 }
    );
  }
}

