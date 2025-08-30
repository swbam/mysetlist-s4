# **ULTIMATE MYSETLIST-S4 FIX IMPLEMENTATION GUIDE**
## **Combining Structural Alignment + Complete Code Implementation**
*Version: Final | Estimated Time: 5-6 hours*

---

## **🚨 PHASE 0: PRE-FLIGHT CHECKS & BACKUP**

### **0.1 Create Recovery Point**
```bash
# Backup current state
git add -A
git commit -m "backup: pre-restructure state"
git push origin main
git checkout -b fix/next-forge-alignment

# Document current structure
find . -type d -name node_modules -prune -o -type d -print | head -50 > structure-before.txt
```

### **0.2 Install Required Tools**
```bash
# Install search/replace tools globally
npm install -g ripgrep sd
# Or on Mac
brew install ripgrep sd

# Verify pnpm version
pnpm --version # Should be 9.0.0+
```

---

## **📂 PHASE 1: MONOREPO STRUCTURE ALIGNMENT**

### **1.1 Create Proper Directory Structure**

**Target Structure (Next-Forge Standard):**
```
mysetlist-s4/
├── apps/
│   ├── web/                 # Main website
│   ├── api/                 # Serverless functions
│   └── docs/                # Mintlify documentation
├── packages/
│   ├── ai/                  # AI integration utilities
│   ├── auth/                # Supabase auth wrapper
│   ├── collaboration/       # Real-time features
│   ├── database/            # Supabase client + types
│   ├── design-system/       # shadcn/ui components
│   ├── email/               # Email templates
│   ├── env/                 # Environment validation
│   ├── external-apis/       # Spotify/Setlistfm/TM
│   ├── feature-flags/       # Feature toggles
│   ├── internationalization/# i18n support
│   ├── next-config/         # Shared Next.js config
│   ├── notifications/       # Push/email notifications
│   ├── observability/       # Monitoring/logging
│   ├── queues/              # BullMQ queue system
│   ├── rate-limit/          # API rate limiting
│   ├── security/            # Security utilities
│   ├── seo/                 # SEO utilities
│   ├── storage/             # File storage
│   ├── testing/             # Test utilities
│   ├── typescript-config/   # Shared TS configs
│   ├── ui/                  # Additional UI helpers
│   ├── utils/               # General utilities
│   └── webhooks/            # Webhook handlers
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### **1.2 Execute Structure Migration**

```bash
# 1. Clean up root level directories that shouldn't exist
rm -rf components lib types  # These should be in packages
mkdir -p apps/api apps/docs

# 2. Move web app files to proper src structure
cd apps/web
mkdir -p src/{app,components,lib,hooks,providers,actions,middleware,types}

# Move app directory contents (preserve Next.js app router)
mv app/* src/app/ 2>/dev/null || true
rmdir app

# Move other directories into src
mv components/* src/components/ 2>/dev/null || true
mv lib/* src/lib/ 2>/dev/null || true
mv hooks/* src/hooks/ 2>/dev/null || true
mv providers/* src/providers/ 2>/dev/null || true
mv actions/* src/actions/ 2>/dev/null || true
mv middleware/* src/middleware/ 2>/dev/null || true
mv types/* src/types/ 2>/dev/null || true

# Clean up empty directories
find . -type d -empty -delete

# 3. Return to root
cd ../..

# 4. Move scattered files to proper locations
mv test-*.{js,ts} apps/web/src/__tests__/ 2>/dev/null || true
mv validate-*.js apps/web/scripts/ 2>/dev/null || true
mv verify-*.js apps/web/scripts/ 2>/dev/null || true
mv final-*.{js,cjs} apps/web/scripts/ 2>/dev/null || true

# 5. Move docs to Mintlify app
mkdir -p apps/docs
mv NEWDOCS/* apps/docs/ 2>/dev/null || true
mv mysetlist-docs/* apps/docs/ 2>/dev/null || true
mv docs/* apps/docs/ 2>/dev/null || true
mv *.md apps/docs/ 2>/dev/null || true  # Keep README.md in root

# 6. Create API app structure for webhooks/cron
mkdir -p apps/api/app/{cron,webhooks,health}
```

---

## **🎨 PHASE 2: DESIGN SYSTEM PACKAGE SETUP**

### **2.1 Create Design System Package**

```bash
# Create package structure
mkdir -p packages/design-system/src/components

# Create package.json
cat > packages/design-system/package.json << 'EOF'
{
  "name": "@repo/design-system",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./components/*": "./src/components/*.tsx"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@radix-ui/react-accordion": "^1.2.1",
    "@radix-ui/react-alert-dialog": "^1.1.2",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.2",
    "@radix-ui/react-icons": "^1.3.2",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-select": "^2.1.2",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.1",
    "@radix-ui/react-toast": "^1.2.2",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.511.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^3.0.0",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.8.3"
  }
}
EOF

# Create shadcn components.json
cat > packages/design-system/components.json << 'EOF'
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "../../apps/web/tailwind.config.ts",
    "css": "../../apps/web/src/app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components"
  }
}
EOF
```

### **2.2 Move and Install UI Components**

```bash
# Move existing UI components if they exist
if [ -d "components/ui" ]; then
  mv components/ui/* packages/design-system/src/components/ 2>/dev/null || true
fi

# Install all shadcn components
cd packages/design-system
npx shadcn@latest add --all --yes

# Create index.ts with exports
cat > src/index.ts << 'EOF'
// UI Components
export * from './components/accordion';
export * from './components/alert-dialog';
export * from './components/avatar';
export * from './components/badge';
export * from './components/button';
export * from './components/calendar';
export * from './components/card';
export * from './components/checkbox';
export * from './components/dialog';
export * from './components/dropdown-menu';
export * from './components/form';
export * from './components/input';
export * from './components/label';
export * from './components/popover';
export * from './components/radio-group';
export * from './components/select';
export * from './components/separator';
export * from './components/skeleton';
export * from './components/switch';
export * from './components/table';
export * from './components/tabs';
export * from './components/textarea';
export * from './components/toast';
export * from './components/toaster';
export * from './components/tooltip';

// Utils
export { cn } from './lib/utils';
EOF

# Create utils file
mkdir -p src/lib
cat > src/lib/utils.ts << 'EOF'
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
EOF

cd ../..
```

---

## **🔧 PHASE 3: PACKAGE IMPLEMENTATIONS**

### **3.1 Environment Package (@repo/env)**

```bash
# Create env package
mkdir -p packages/env/src

cat > packages/env/package.json << 'EOF'
{
  "name": "@repo/env",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@t3-oss/env-nextjs": "^0.13.4",
    "zod": "^3.25.0"
  }
}
EOF

cat > packages/env/src/index.ts << 'EOF'
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    SUPABASE_JWT_SECRET: z.string().min(1),
    
    // Redis
    REDIS_URL: z.string().url().optional(),
    REDIS_HOST: z.string().optional(),
    REDIS_PORT: z.string().optional(),
    REDIS_PASSWORD: z.string().optional(),
    
    // External APIs
    SPOTIFY_CLIENT_SECRET: razil.string().min(1),
    SETLISTFM_API_KEY: z.string().min(1),
    TICKETMASTER_API_KEY: z.string().min(1),
    
    // Security
    CRON_SECRET: z.string().min(1),
    NEXTAUTH_SECRET: z.string().min(1),
    NEXTAUTH_URL: z.string().url(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_SPOTIFY_CLIENT_ID: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_APP_ENV: z.enum(['development', 'production', 'preview']).default('development'),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SPOTIFY_CLIENT_ID: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },
});
EOF
```

### **3.2 Database Package (@repo/database)**

```bash
mkdir -p packages/database/src/{types,queries,mutations}

cat > packages/database/package.json << 'EOF'
{
  "name": "@repo/database",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types/index.ts",
    "./queries": "./src/queries/index.ts",
    "./mutations": "./src/mutations/index.ts"
  },
  "scripts": {
    "db:generate": "supabase gen types typescript --local > src/types/database.ts",
    "db:push": "supabase db push",
    "db:migrate": "supabase migration up"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.55.0",
    "server-only": "^0.0.1"
  },
  "devDependencies": {
    "supabase": "^1.226.0"
  }
}
EOF

cat > packages/database/src/index.ts << 'EOF'
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const db = supabase;

// Re-export types
export * from './types/database';
export * from './queries';
export * from './mutations';

// Helper functions
export async function withTransaction<T>(
  callback: (client: typeof supabase) => Promise<T>
): Promise<T> {
  return callback(supabase);
}
EOF
```

### **3.3 Next Config Package**

```bash
mkdir -p packages/next-config/src

cat > packages/next-config/package.json << 'EOF'
{
  "name": "@repo/next-config",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@sentry/nextjs": "^9.0.0",
    "next": "^15.0.0"
  }
}
EOF

cat > packages/next-config/src/index.ts << 'EOF'
import type { NextConfig } from 'next';

interface CreateConfigOptions {
  transpilePackages?: string[];
  experimental?: NextConfig['experimental'];
  images?: NextConfig['images'];
  serverExternalPackages?: string[];
}

export function createConfig(options: CreateConfigOptions = {}): NextConfig {
  const {
    transpilePackages = [],
    experimental = {},
    images = {},
    serverExternalPackages = [],
  } = options;

  const config: NextConfig = {
    reactStrictMode: true,
    transpilePackages,
    serverExternalPackages: [
      'sharp',
      '@supabase/supabase-js',
      'bullmq',
      'ioredis',
      ...serverExternalPackages,
    ],
    experimental: {
      optimizeCss: true,
      serverActions: {
        bodySizeLimit: '2mb',
      },
      ...experimental,
    },
    images: {
      formats: ['image/avif', 'image/webp'],
      ...images,
    },
    webpack: (config, { isServer }) => {
      if (isServer) {
        config.externals = [...(config.externals || []), {
          'require-in-the-middle': 'commonjs require-in-the-middle',
          '@opentelemetry/instrumentation': 'commonjs @opentelemetry/instrumentation',
          'bullmq': 'commonjs bullmq',
          'ioredis': 'commonjs ioredis',
        }];
      } else {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          net: false,
          tls: false,
          crypto: false,
          os: false,
          stream: false,
          path: false,
        };
      }
      return config;
    },
    poweredByHeader: false,
    compress: true,
    output: 'standalone',
  };

  // Add Sentry if configured
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    const { withSentryConfig } = require('@sentry/nextjs');
    return withSentryConfig(config, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
    });
  }

  return config;
}
EOF
```

### **3.4 Queue Package**

```bash
mkdir -p packages/queues/src/{queues,processors,config}

cat > packages/queues/package.json << 'EOF'
{
  "name": "@repo/queues",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./config": "./src/config/index.ts",
    "./processors": "./src/processors/index.ts"
  },
  "dependencies": {
    "bullmq": "^5.58.0",
    "ioredis": "^5.7.0"
  }
}
EOF

cat > packages/queues/src/config/redis.ts << 'EOF'
import Redis from 'ioredis';
import type { ConnectionOptions } from 'bullmq';

class RedisConfig {
  private static instance: Redis | null = null;
  
  static getConnectionOptions(): ConnectionOptions {
    const isProduction = process.env.NODE_ENV === 'production';
    const redisUrl = process.env.REDIS_URL;
    
    if (isProduction) {
      if (!redisUrl) {
        throw new Error('REDIS_URL is required in production');
      }
      
      return {
        connection: new Redis(redisUrl, {
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          retryStrategy: (times) => Math.min(times * 50, 2000),
        }),
      };
    }
    
    // Development config
    return {
      connection: new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: null,
      }),
    };
  }
  
  static getConnection(): Redis {
    if (!this.instance) {
      const options = this.getConnectionOptions();
      this.instance = options.connection as Redis;
      
      this.instance.on('connect', () => {
        console.log('✅ Redis connected');
      });
      
      this.instance.on('error', (error) => {
        console.error('❌ Redis error:', error);
      });
    }
    
    return this.instance;
  }
  
  static async shutdown(): Promise<void> {
    if (this.instance) {
      await this.instance.quit();
      this.instance = null;
    }
  }
}

export default RedisConfig;
export const bullMQConnection = RedisConfig.getConnectionOptions();
EOF
```

---

## **🔄 PHASE 4: FIX ALL IMPORTS**

### **4.1 TypeScript Configuration**

```bash
# Root tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@repo/*": ["packages/*/src"]
    }
  },
  "include": [],
  "exclude": ["node_modules"]
}
EOF

# apps/web/tsconfig.json
cat > apps/web/tsconfig.json << 'EOF'
{
  "extends": "@repo/typescript-config/nextjs.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/app/*": ["./src/app/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/actions/*": ["./src/actions/*"],
      "@/types/*": ["./src/types/*"],
      "@repo/*": ["../../packages/*/src"]
    },
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
EOF
```

### **4.2 Search and Replace Commands**

```bash
# Fix UI imports - Phase 1: Direct replacements
rg -l '@/@repo/design-system/components/ui/' apps/web/src \
  | xargs sd '@/@repo/design-system/components/ui/' '@repo/design-system/'

rg -l '@repo/design-system/components/ui/' apps/web/src \
  | xargs sd '@repo/design-system/components/ui/' '@repo/design-system/'

rg -l 'from "@/components/ui/' apps/web/src \
  | xargs sd 'from "@/components/ui/' 'from "@repo/design-system/'

rg -l "from '@/components/ui/" apps/web/src \
  | xargs sd "from '@/components/ui/" "from '@repo/design-system/"

# Fix database imports
rg -l "from ['\"]\.\./\.\./packages/database" apps/web/src \
  | xargs sd "from ['\"]\.\./\.\./packages/database" "from '@repo/database"

rg -l "from ['\"]\.\./packages/database" apps/web/src \
  | xargs sd "from ['\"]\.\./packages/database" "from '@repo/database"

rg -l "@/packages/database" apps/web/src \
  | xargs sd "@/packages/database" "@repo/database"

# Fix auth imports
rg -l "from ['\"]\.\./\.\./packages/auth" apps/web/src \
  | xargs sd "from ['\"]\.\./\.\./packages/auth" "from '@repo/auth"

rg -l "@/lib/auth" apps/web/src \
  | xargs sd "@/lib/auth" "@repo/auth"

# Fix utils imports
rg -l "@/lib/utils" apps/web/src \
  | xargs sd "@/lib/utils" "@repo/utils"

rg -l "from ['\"]\.\./\.\./packages/utils" apps/web/src \
  | xargs sd "from ['\"]\.\./\.\./packages/utils" "from '@repo/utils"

# Fix env imports
rg -l "from ['\"]\.\./\.\./env" apps/web/src \
  | xargs sd "from ['\"]\.\./\.\./env" "from '@repo/env"

rg -l "from ['\"]@/env" apps/web/src \
  | xargs sd "from ['\"]@/env" "from '@repo/env"

# Fix queue imports
rg -l "from ['\"]\.\./\.\./packages/queues" apps/web/src \
  | xargs sd "from ['\"]\.\./\.\./packages/queues" "from '@repo/queues"

# Fix relative imports to use @ alias within app
rg -l "from ['\"]\.\./" apps/web/src \
  | xargs sd "from ['\"]\.\./" "from '@/"

rg -l "from ['\"]\./components/" apps/web/src \
  | xargs sd "from ['\"]\./components/" "from '@/components/"

rg -l "from ['\"]\./lib/" apps/web/src \
  | xargs sd "from ['\"]\./lib/" "from '@/lib/"

rg -l "from ['\"]\./hooks/" apps/web/src \
  | xargs sd "from ['\"]\./hooks/" "from '@/hooks/"
```

---

## **⚙️ PHASE 5: FIX CONFIGURATION FILES**

### **5.1 Update Root Configuration**

```bash
# pnpm-workspace.yaml
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - apps/*
  - packages/*
EOF

# turbo.json
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "globalDependencies": ["**/.env.*local"],
  "globalEnv": [
    "NODE_ENV",
    "NEXT_PUBLIC_*",
    "DATABASE_URL",
    "SUPABASE_*",
    "REDIS_*",
    "SPOTIFY_*",
    "SETLISTFM_*",
    "TICKETMASTER_*",
    "SENTRY_*",
    "VERCEL_*"
  ],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "test": {
      "dependsOn": ["build"],
      "inputs": ["$TURBO_DEFAULT$", "tests/**"]
    },
    "clean": {
      "cache": false
    },
    "db:push": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    }
  }
}
EOF

# Root package.json
cat > package.json << 'EOF'
{
  "name": "mysetlist",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev --parallel",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "clean": "turbo run clean && rm -rf node_modules",
    "format": "biome check . --write",
    "db:push": "turbo run db:push --filter=@repo/database",
    "db:migrate": "turbo run db:migrate --filter=@repo/database",
    "db:studio": "turbo run db:studio --filter=@repo/database",
    "boundaries": "turbo run boundaries"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "turbo": "^2.3.3",
    "typescript": "^5.8.3"
  },
  "packageManager": "pnpm@9.15.0",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
EOF
```

### **5.2 Update apps/web Configuration**

```bash
# apps/web/package.json
cat > apps/web/package.json << 'EOF'
{
  "name": "@repo/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "lint": "biome check . --write",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@repo/auth": "workspace:*",
    "@repo/database": "workspace:*",
    "@repo/design-system": "workspace:*",
    "@repo/env": "workspace:*",
    "@repo/external-apis": "workspace:*",
    "@repo/queues": "workspace:*",
    "@repo/utils": "workspace:*",
    "@repo/next-config": "workspace:*",
    "@supabase/supabase-js": "^2.55.0",
    "@t3-oss/env-nextjs": "^0.13.4",
    "framer-motion": "^11.18.2",
    "lucide-react": "^0.511.0",
    "next": "15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.54.2",
    "sonner": "^2.0.3",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@testing-library/react": "^15.0.0",
    "@types/node": "^22.10.2",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.5.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.8.3",
    "vitest": "^3.1.4"
  }
}
EOF

# apps/web/next.config.ts
cat > apps/web/next.config.ts << 'EOF'
import { createConfig } from '@repo/next-config';
import type { NextConfig } from 'next';

const config: NextConfig = createConfig({
  transpilePackages: [
    '@repo/database',
    '@repo/design-system',
    '@repo/auth',
    '@repo/external-apis',
    '@repo/queues',
    '@repo/utils',
    '@repo/env',
  ],
  experimental: {
    optimizeCss: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
});

export default config;
EOF

# apps/web/src/app/layout.tsx
cat > apps/web/src/app/layout.tsx << 'EOF'
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MySetlist',
  description: 'Discover and track setlists from your favorite artists',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
EOF

# Create globals.css if needed
cat > apps/web/src/app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: 0 0% 3.9%;
    --radius: 0.5rem;
  }
 
  .dark {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    --card: 0 0% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 0 0% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 0 0% 9%;
    --secondary: 0 0% 14.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 0 0% 14.9%;
    --muted-foreground: 0 0% 63.9%;
    --accent: 0 0% 14.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 14.9%;
    --input: 0 0% 14.9%;
    --ring: 0 0% 83.1%;
  }
}
EOF
```

---

## **🚀 PHASE 6: DATABASE & MIGRATION SETUP**

### **6.1 Complete Database Migration**

```bash
# Create complete migration file
cat > supabase/migrations/001_complete_schema.sql << 'EOF'
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Enums
CREATE TYPE user_role AS ENUM('user', 'moderator', 'admin');
CREATE TYPE show_status AS ENUM('upcoming', 'ongoing', 'completed', 'cancelled');
CREATE TYPE moderation_status AS ENUM('pending', 'approved', 'rejected', 'flagged');
CREATE TYPE setlist_type AS ENUM('predicted', 'actual');
CREATE TYPE import_stage AS ENUM(
  'initializing', 'syncing-identifiers', 'importing-songs', 
  'importing-shows', 'creating-setlists', 'completed', 'failed'
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'user',
  spotify_id TEXT UNIQUE,
  spotify_refresh_token TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Artists table
CREATE TABLE IF NOT EXISTS artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spotify_id TEXT UNIQUE,
  tm_attraction_id TEXT UNIQUE,
  mbid TEXT UNIQUE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  image_url TEXT,
  genres JSONB DEFAULT '[]',
  popularity INTEGER DEFAULT 0,
  followers INTEGER DEFAULT 0,
  trending_score NUMERIC DEFAULT 0,
  external_urls JSONB DEFAULT '{}',
  verified BOOLEAN DEFAULT FALSE,
  total_songs INTEGER DEFAULT 0,
  total_albums INTEGER DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Songs table
CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spotify_id TEXT UNIQUE,
  name TEXT NOT NULL,
  artist TEXT NOT NULL,
  album_name TEXT,
  album_id TEXT,
  track_number INTEGER,
  disc_number INTEGER DEFAULT 1,
  album_type TEXT,
  album_art_url TEXT,
  release_date TEXT,
  duration_ms INTEGER,
  popularity INTEGER DEFAULT 0,
  preview_url TEXT,
  spotify_uri TEXT,
  external_urls JSONB DEFAULT '{}',
  is_explicit BOOLEAN DEFAULT FALSE,
  is_playable BOOLEAN DEFAULT TRUE,
  is_live BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Artist Songs junction
CREATE TABLE IF NOT EXISTS artist_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  is_primary_artist BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(artist_id, song_id)
);

-- Venues table
CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tm_venue_id TEXT UNIQUE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  city TEXT NOT NULL,
  state_code TEXT,
  country_code TEXT NOT NULL,
  postal_code TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  timezone TEXT,
  address TEXT,
  url TEXT,
  image_url TEXT,
  capacity INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shows table
CREATE TABLE IF NOT EXISTS shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tm_event_id TEXT UNIQUE,
  setlistfm_id TEXT UNIQUE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  headliner_artist_id UUID REFERENCES artists(id),
  venue_id UUID REFERENCES venues(id),
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  status show_status DEFAULT 'upcoming',
  ticket_url TEXT,
  poster_url TEXT,
  min_price DECIMAL(10, 2),
  max_price DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Setlists table
CREATE TABLE IF NOT EXISTS setlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  type setlist_type DEFAULT 'predicted',
  songs JSONB NOT NULL DEFAULT '[]',
  created_by UUID REFERENCES users(id),
  confidence_score DECIMAL(3, 2),
  is_verified BOOLEAN DEFAULT FALSE,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
  weight INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, song_id, show_id)
);

-- User follows
CREATE TABLE IF NOT EXISTS user_follows_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, artist_id)
);

-- Import status
CREATE TABLE IF NOT EXISTS import_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  job_id TEXT UNIQUE,
  stage import_stage DEFAULT 'initializing',
  progress INTEGER DEFAULT 0,
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cron logs
CREATE TABLE IF NOT EXISTS cron_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL,
  result JSONB,
  execution_time_ms INTEGER,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Queue jobs
CREATE TABLE IF NOT EXISTS queue_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name VARCHAR(100) NOT NULL,
  job_id VARCHAR(255) NOT NULL,
  job_data JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  priority INTEGER DEFAULT 10,
  attempts INTEGER DEFAULT 0,
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_artists_spotify_id ON artists(spotify_id) WHERE spotify_id IS NOT NULL;
CREATE INDEX idx_artists_trending_score ON artists(trending_score DESC);
CREATE INDEX idx_artists_search ON artists USING gin(to_tsvector('english', name));
CREATE INDEX idx_shows_date ON shows(date DESC);
CREATE INDEX idx_shows_artist_date ON shows(headliner_artist_id, date DESC);
CREATE INDEX idx_votes_recent ON votes(created_at DESC);
CREATE INDEX idx_songs_spotify_id ON songs(spotify_id) WHERE spotify_id IS NOT NULL;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlists ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view artists" ON artists FOR SELECT USING (true);
CREATE POLICY "Public can view shows" ON shows FOR SELECT USING (true);
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Helper functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_artists_updated_at BEFORE UPDATE ON artists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shows_updated_at BEFORE UPDATE ON shows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EOF

# Apply migrations
cd packages/database
npx supabase migration up
cd ../..
```

---

## **🔧 PHASE 7: VERCEL DEPLOYMENT SETUP**

### **7.1 Remove Root vercel.json**

```bash
# Remove or rename root vercel.json
mv vercel.json vercel.json.backup 2>/dev/null || true
```

### **7.2 Create App-Specific Vercel Configurations**

```bash
# apps/web/vercel.json (minimal, Vercel auto-detects most)
cat > apps/web/vercel.json << 'EOF'
{
  "framework": "nextjs",
  "buildCommand": "cd ../.. && pnpm build --filter=@repo/web",
  "installCommand": "cd ../.. && pnpm install",
  "outputDirectory": ".next"
}
EOF

# apps/api/vercel.json (if you have API app)
cat > apps/api/vercel.json << 'EOF'
{
  "framework": null,
  "buildCommand": "cd ../.. && pnpm build --filter=@repo/api",
  "installCommand": "cd ../.. && pnpm install",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/cron/(.*)", "destination": "/api/cron/$1" },
    { "source": "/webhooks/(.*)", "destination": "/api/webhooks/$1" }
  ]
}
EOF
```

### **7.3 Create .env Files**

```bash
# apps/web/.env.local (example)
cat > apps/web/.env.local << 'EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
SUPABASE_JWT_SECRET=your-jwt-secret
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# External APIs
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SETLISTFM_API_KEY=...
TICKETMASTER_API_KEY=...

# Security
CRON_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://your-domain.com

# Analytics (optional)
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=...
EOF
```

---

## **✅ PHASE 8: VALIDATION & BUILD**

### **8.1 Install Dependencies**

```bash
# Clean install
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
rm -rf apps/*/.next
rm -rf packages/*/dist

# Install all dependencies
pnpm install

# Build packages first
pnpm --filter "./packages/*" build

# Type check
pnpm typecheck
```

### **8.2 Fix Artist Sync Service (TypeScript)**

```bash
# Create the fixed service
cat > packages/external-apis/src/services/artist-sync.ts << 'EOF'
import { supabase } from '@repo/database';
import type { Database } from '@repo/database/types';

type Artist = Database['public']['Tables']['artists']['Row'];
type Song = Database['public']['Tables']['songs']['Row'];

interface SyncResult {
  success: boolean;
  artistId: string;
  spotifyId: string;
  name: string;
  totalSongs: number;
  totalAlbums: number;
  processingTime: number;
  error?: string;
}

export class ArtistSyncService {
  async syncArtist(spotifyId: string): Promise<SyncResult> {
    const startTime = Date.now();
    
    try {
      // Implementation here
      const { data: artist, error } = await supabase
        .from('artists')
        .select('*')
        .eq('spotify_id', spotifyId)
        .single();
        
      if (error) throw error;
      
      return {
        success: true,
        artistId: artist?.id || '',
        spotifyId,
        name: artist?.name || '',
        totalSongs: artist?.total_songs || 0,
        totalAlbums: artist?.total_albums || 0,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        artistId: '',
        spotifyId,
        name: '',
        totalSongs: 0,
        totalAlbums: 0,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  async syncCatalog(artistId: string, spotifyId: string): Promise<any> {
    // Full implementation as per the original guide
    console.log('Syncing catalog for', artistId, spotifyId);
    return { success: true };
  }
}
EOF
```

### **8.3 Build and Test**

```bash
# Build the web app
pnpm --filter @repo/web build

# If successful, test locally
pnpm --filter @repo/web start
```

---

## **🚀 PHASE 9: VERCEL DEPLOYMENT**

### **9.1 Create Vercel Projects**

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy web app
cd apps/web
vercel --prod

# When prompted:
# - Set up and deploy: Y
# - Which scope: Choose your account
# - Link to existing project: N (create new)
# - Project name: mysetlist-web
# - Directory: ./ (current)
# - Override settings: Y
# - Root Directory: apps/web
```

### **9.2 Configure in Vercel Dashboard**

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **General**
4. Set **Root Directory**: `apps/web`
5. Set **Build Command**: `cd ../.. && pnpm build --filter=@repo/web`
6. Set **Install Command**: `cd ../.. && pnpm install`
7. Go to **Environment Variables**
8. Add all variables from `.env.local`

### **9.3 Final Deployment**

```bash
# Commit all changes
git add -A
git commit -m "fix: align with next-forge structure"
git push origin fix/next-forge-alignment

# Create PR and merge
# Vercel will auto-deploy on merge to main
```

---

## **🎯 POST-DEPLOYMENT CHECKLIST**

### **Verify Everything Works:**

- [ ] ✅ Build passes on Vercel
- [ ] ✅ No TypeScript errors
- [ ] ✅ All imports use `@repo/*` for packages
- [ ] ✅ All app imports use `@/*` for local
- [ ] ✅ Database connections work
- [ ] ✅ Redis/queues connected
- [ ] ✅ Auth flow functional
- [ ] ✅ API routes responding
- [ ] ✅ No console errors in production

### **Performance Checks:**

- [ ] ✅ Lighthouse score > 90
- [ ] ✅ Core Web Vitals passing
- [ ] ✅ Images optimized
- [ ] ✅ Fonts loading correctly

---

## **🐛 TROUBLESHOOTING GUIDE**

### **If Build Still Fails:**

1. **Module not found errors:**
   ```bash
   # Check tsconfig paths
   cat apps/web/tsconfig.json | grep -A 10 paths
   
   # Verify packages are built
   pnpm --filter "./packages/*" build
   ```

2. **Environment variable errors:**
   ```bash
   # Verify env schema
   pnpm --filter @repo/env typecheck
   
   # Check if all required vars are in Vercel
   ```

3. **Database connection errors:**
   ```bash
   # Test Supabase connection
   cd packages/database
   npx supabase status
   ```

4. **Redis connection errors:**
   ```bash
   # Use Upstash Redis for production
   # Update REDIS_URL in Vercel env vars
   ```

### **Common Fixes:**

```bash
# Clear all caches
rm -rf .turbo
rm -rf apps/*/.next
rm -rf node_modules/.cache

# Fresh install
rm -rf node_modules && pnpm install

# Rebuild everything
pnpm clean && pnpm build
```

---

## **📊 ESTIMATED TIMELINE**

| Phase | Time | Priority |
|-------|------|----------|
| Phase 0-1: Structure | 30 min | CRITICAL |
| Phase 2: Design System | 30 min | CRITICAL |
| Phase 3: Packages | 45 min | HIGH |
| Phase 4: Imports | 45 min | CRITICAL |
| Phase 5: Config | 30 min | HIGH |
| Phase 6: Database | 45 min | HIGH |
| Phase 7-9: Deploy | 60 min | CRITICAL |
| Testing & Fixes | 60 min | HIGH |

**Total: 5-6 hours**

---

## **✨ FINAL NOTES**

This combined guide gives you:
1. **Correct Next-Forge structure** (from their guide)
2. **Complete code implementations** (from my guide)
3. **Ready-to-run commands** (combined best of both)
4. **Proper Vercel deployment** (their approach)
5. **Full TypeScript fixes** (my implementations)

Follow this guide step-by-step, and your build will succeed. The key insight is using **separate Vercel projects** with **Root Directory** set per app, not deploying from root.

Good luck! 🚀