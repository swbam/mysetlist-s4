import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "anonymous-session";
const ACTIONS_COOKIE_NAME = "anonymous-actions";
const SESSION_DURATION = 60 * 60 * 24; // 24 hours

export interface AnonymousActions {
  votes: number;
  songsAdded: number;
  lastReset: string;
}

export const ANONYMOUS_LIMITS = {
  votes: 5,
  songsAdded: 1,
} as const;

/**
 * Get or create anonymous session ID
 */
export async function getAnonymousSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const existingSession = cookieStore.get(SESSION_COOKIE_NAME);

  if (existingSession?.value) {
    return existingSession.value;
  }

  const newSessionId = randomUUID();
  cookieStore.set(SESSION_COOKIE_NAME, newSessionId, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION,
  });

  return newSessionId;
}

/**
 * Get anonymous user actions
 */
export async function getAnonymousActions(): Promise<AnonymousActions> {
  const cookieStore = await cookies();
  const actionsCookie = cookieStore.get(ACTIONS_COOKIE_NAME);

  if (!actionsCookie?.value) {
    return {
      votes: 0,
      songsAdded: 0,
      lastReset: new Date().toISOString(),
    };
  }

  try {
    const actions = JSON.parse(actionsCookie.value) as AnonymousActions;

    // Reset if more than 24 hours have passed
    const lastReset = new Date(actions.lastReset);
    const now = new Date();
    const hoursSinceReset =
      (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

    if (hoursSinceReset >= 24) {
      return {
        votes: 0,
        songsAdded: 0,
        lastReset: now.toISOString(),
      };
    }

    return actions;
  } catch {
    return {
      votes: 0,
      songsAdded: 0,
      lastReset: new Date().toISOString(),
    };
  }
}

/**
 * Update anonymous user actions
 */
export async function updateAnonymousActions(
  actions: AnonymousActions,
): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ACTIONS_COOKIE_NAME, JSON.stringify(actions), {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION,
  });
}

/**
 * Check if anonymous user can perform action
 */
export async function canPerformAnonymousAction(
  actionType: keyof typeof ANONYMOUS_LIMITS,
): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
  const actions = await getAnonymousActions();
  const limit = ANONYMOUS_LIMITS[actionType];
  const current = actions[actionType] || 0;

  const lastReset = new Date(actions.lastReset);
  const resetTime = new Date(lastReset.getTime() + 24 * 60 * 60 * 1000);

  return {
    allowed: current < limit,
    remaining: Math.max(0, limit - current),
    resetTime,
  };
}

/**
 * Increment anonymous action count
 */
export async function incrementAnonymousAction(
  actionType: keyof typeof ANONYMOUS_LIMITS,
): Promise<boolean> {
  const { allowed } = await canPerformAnonymousAction(actionType);

  if (!allowed) {
    return false;
  }

  const actions = await getAnonymousActions();
  actions[actionType] = (actions[actionType] || 0) + 1;

  await updateAnonymousActions(actions);
  return true;
}

/**
 * Get anonymous user limits status
 */
export async function getAnonymousLimitsStatus(): Promise<{
  sessionId: string;
  limits: typeof ANONYMOUS_LIMITS;
  usage: {
    votes: { used: number; remaining: number };
    songsAdded: { used: number; remaining: number };
  };
  resetTime: Date;
}> {
  const sessionId = await getAnonymousSessionId();
  const actions = await getAnonymousActions();
  const resetTime = new Date(
    new Date(actions.lastReset).getTime() + 24 * 60 * 60 * 1000,
  );

  return {
    sessionId,
    limits: ANONYMOUS_LIMITS,
    usage: {
      votes: {
        used: actions.votes || 0,
        remaining: Math.max(0, ANONYMOUS_LIMITS.votes - (actions.votes || 0)),
      },
      songsAdded: {
        used: actions.songsAdded || 0,
        remaining: Math.max(
          0,
          ANONYMOUS_LIMITS.songsAdded - (actions.songsAdded || 0),
        ),
      },
    },
    resetTime,
  };
}
