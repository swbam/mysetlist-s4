import { cookies } from 'next/headers';

export async function GET(request) {
  const cookieStore = cookies();
  return new Response(JSON.stringify({ message: "Analytics Advanced Route - Cookie fix applied" }), {
    headers: { "Content-Type": "application/json" }
  });
}