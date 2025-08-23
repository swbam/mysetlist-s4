import { headers } from "next/headers";
// NextResponse removed - unused import

export async function POST(_request: Request) {
  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  const cronSecret = process.env['CRON_SECRET'];

  // Check various auth methods
  const checks = {
    hasAuthHeader: !!authHeader,
    authHeaderValue: authHeader ? `${authHeader.substring(0, 20)}...` : null,
    hasCronSecret: !!cronSecret,
    cronSecretLength: cronSecret ? cronSecret.length : 0,
    expectedAuth: cronSecret
      ? `${`Bearer ${cronSecret}`.substring(0, 20)}...`
      : null,
    authMatches: authHeader === `Bearer ${cronSecret}`,
    // Check if it's using the old value
    matchesOldSecret: authHeader === "Bearer 615002300",
    matchesNewSecret: authHeader === "Bearer 6155002300",
    // Check environment
    nodeEnv: process.env['NODE_ENV'],
    hasSpotifyId: !!process.env['SPOTIFY_CLIENT_ID'],
    hasSpotifySecret: !!process.env['SPOTIFY_CLIENT_SECRET'],
  };

  return NextResponse.json(checks);
}
