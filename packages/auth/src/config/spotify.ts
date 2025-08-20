import { keys } from "../../keys";

const env = keys();

export const SPOTIFY_CONFIG = {
  clientId: env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!,
  clientSecret: env.SPOTIFY_CLIENT_SECRET!,
  scopes: [
    "user-read-email",
    "user-read-private",
    "user-library-read",
    "user-top-read",
    "user-read-recently-played",
    "playlist-read-private",
    "playlist-read-collaborative",
  ],
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/auth/callback`,
} as const;

export const getSpotifyAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: SPOTIFY_CONFIG.clientId,
    response_type: "code",
    redirect_uri: SPOTIFY_CONFIG.redirectUri,
    scope: SPOTIFY_CONFIG.scopes.join(" "),
    state: crypto.randomUUID(), // CSRF protection
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
};
