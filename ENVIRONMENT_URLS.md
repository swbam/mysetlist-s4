# MySetlist Environment URLs Configuration

## Environment URL Mapping

| Environment             | URL                           | Usage                             |
| ----------------------- | ----------------------------- | --------------------------------- |
| **Local Development**   | `http://localhost:3001`       | Local development with `pnpm dev` |
| **Development/Preview** | `https://windhoek.vercel.app` | Vercel preview deployments        |
| **Production**          | `https://theset.live`         | Production deployment             |

## Configuration Details

### 1. Local Development

- **URL**: `http://localhost:3001`
- **Configuration**: Set in `.env.local`
- **Command**: `pnpm dev` (automatically runs on port 3001)

### 2. Vercel Development/Preview

- **URL**: `https://windhoek.vercel.app`
- **Configuration**: Set in Vercel environment variables for preview deployments
- **Branch**: Development/feature branches

### 3. Production

- **URL**: `https://theset.live`
- **Configuration**: Set in Vercel environment variables for production
- **Branch**: `main` branch only

## Dynamic URL Resolution

The application uses a dynamic URL resolution function in `apps/web/lib/utils.ts`:

```typescript
export function getBaseUrl(): string {
  // Check for explicitly set URL first
  if (process.env.NEXT_PUBLIC_URL) {
    return process.env.NEXT_PUBLIC_URL;
  }

  // Production
  if (process.env.NODE_ENV === "production") {
    if (process.env.VERCEL_ENV === "production") {
      return "https://theset.live";
    }
    // Development/preview deployments on Vercel
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    // Fallback for production builds running locally
    return "http://localhost:3001";
  }

  // Local development
  return "http://localhost:3001";
}
```

## Environment Files

1. **`.env.local`** - Local development configuration
2. **`.env.development.example`** - Template for Vercel preview deployments
3. **`.env.production.example`** - Template for production deployment

## Important Notes

- Always use `getBaseUrl()` or `getAppUrl()` functions for dynamic URL resolution
- Never hardcode URLs in the application code
- Vercel automatically sets `VERCEL_URL` for preview deployments
- Production URLs should be explicitly set in Vercel environment variables
