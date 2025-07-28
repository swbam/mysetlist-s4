export const GET = () => {
  // Simple health check that doesn't require database operations
  return new Response("OK", { status: 200 })
}
