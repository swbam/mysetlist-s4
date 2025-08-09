// CORS configuration for production security
// Only allow specific origins instead of wildcard
const allowedOrigins = [
<<<<<<< HEAD
  "https://mysetlist-sonnet.vercel.app",
  "https://www.mysetlist-sonnet.vercel.app",
=======
  "https://theset.live",
  "https://www.theset.live",
>>>>>>> fccdd438ab7273b15f8870d2cd1c08442bb2d530
  // Add localhost for development
  "http://localhost:3000",
  "http://localhost:3001",
];

export const corsHeaders = (origin?: string) => {
  // If no origin or origin is allowed, use it. Otherwise default to first allowed origin
  const allowedOrigin =
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
};
