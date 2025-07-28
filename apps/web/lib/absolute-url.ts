export function absoluteUrl(path: string) {
  // In Next-Forge setup, the web app runs on port 3001 (as shown in terminal)
  const base =
    process.env["NEXT_PUBLIC_WEB_URL"] ||
    process.env["NEXT_PUBLIC_APP_URL"] ||
    "http://localhost:3001"
  if (path.startsWith("/")) {
    return `${base}${path}`
  }
  return `${base}/${path}`
}
