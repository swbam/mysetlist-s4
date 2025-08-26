Got it — I did a full pass on your repo structure and the Next-Forge web starter docs, then did two more “ultrathink” passes to cross-check likely failure points and how they map to Next-Forge conventions. Here’s a precise, hand-offable plan to get **mysetlist-s4** building cleanly and deployed.

> What I could inspect
>
> * Your repo is a **monorepo** with `apps/web`, `packages/`, `@repo/design-system/components/ui/`, `supabase/`, `turbo.json`, `pnpm-workspace.yaml`, `vercel.json`, etc. ([GitHub][1])
> * Next-Forge expects a Turborepo monorepo with **apps** and **packages**, with shared code imported as `@repo/*`, an `env.ts` in each app that **composes** environment keys from packages, a **design system** package (shadcn/ui) instead of scattering UI under `apps/web/components` or a root `components/` folder, and separate deploys for each app (set `Root Directory` per app in Vercel). ([next-forge.com][2])

I couldn’t open individual file contents due to GitHub page rendering limits via my browser tool, so the outline below targets structural & import/alias issues that **commonly** break builds when a Next-Forge monorepo “strays”. If any step already matches your repo, you can skip it.

---

# 1) Align repo layout to Next-Forge

**Goal:** match Next-Forge’s apps/packages shape to stop module resolution and boundaries errors.

**Target structure (high-level)**

```
apps/
  web/               # marketing/site
  api/               # optional - serverless cron/webhooks
  app/               # optional - product app
  docs/              # Mintlify docs app
packages/
  design-system/     # shadcn/ui lives here
  analytics/         # posthog/… if used
  auth/              # clerk/auth helpers if used
  cms/               # blog/docs content plumbing if used
  database/          # prisma/drizzle, migrations, db client
  env/               # per-package env keys (t3-env) re-exports
  ...                # other shared libs
turbo.json
pnpm-workspace.yaml
```

Docs refs: structure, web app, docs app, env composition. ([next-forge.com][2])

**Concrete actions**

1. **Create/move packages:**

   * `packages/design-system` (see §2 for moving `components/ui` here). ([next-forge.com][3])
   * If DB code is in `supabase/`, move the reusable client/schema into `packages/database` and re-export helpers from there; keep Supabase SQL/migrations where they belong. (Next-Forge uses a `database` package conceptually.) ([next-forge.com][2])
   * If you have auth, analytics, CMS, etc., create the sibling packages and put shared code there (imports will become `@repo/auth`, `@repo/analytics`, …). ([next-forge.com][4])

2. **Create/move apps:**

   * Ensure `apps/web` is the site you’re deploying to `www.` (your current repo already has this). ([GitHub][1], [next-forge.com][5])
   * If you have webhook/cron code, put it in `apps/api` (cron under `app/cron`, webhooks under `app/webhooks`). ([next-forge.com][6])
   * If your “NEWDOCS” live in the root or `mysetlist-docs/`, migrate them into **Mintlify** at `apps/docs` as `.mdx` files with `mint.json` nav. ([next-forge.com][7])

3. **pnpm workspaces**

   * `pnpm-workspace.yaml` should be:

     ```yaml
     packages:
       - apps/*
       - packages/*
     ```

4. **turbo.json** (baseline)

   ```json
   {
     "$schema": "https://turbo.build/schema.json",
     "globalEnv": [
       "NEXT_PUBLIC_*",
       "DATABASE_URL",
       "SUPABASE_*",
       "SENTRY_*",
       "VERCEL_*",
       "STRIPE_*"
     ],
     "pipeline": {
       "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
       "dev": { "cache": false },
       "lint": {},
       "typecheck": {}
     }
   }
   ```

   (Next-Forge uses Turborepo with boundaries; we’ll enable that in §8.) ([next-forge.com][2])

---

# 2) Centralize UI into a **design-system** package

**Problem observed:** you have a **root** `@repo/design-system/components/ui/` folder. That breaks Next-Forge’s “shared UI in a package” rule and causes alias/boundary confusion. ([GitHub][1])

**Fix (do this exactly):**

1. Create `packages/design-system/` with:

   ```
   packages/design-system/
     package.json
     src/
       components/...(shadcn/ui components moved here)
       lib/fonts.ts
       index.ts
     tailwind.config.ts (if needed for tokens)
     components.json (shadcn config)
   ```

   Docs: shadcn/ui lives in the design-system package and is installed via CLI targeting that package. ([next-forge.com][3])

2. Move everything from root `@repo/design-system/components/ui/*` **into** `packages/design-system/src/@repo/design-system/components/ui/*`.

3. **Exports**
   In `packages/design-system/src/index.ts` re-export what the apps should import:

   ```ts
   // packages/design-system/src/index.ts
   export * from './@repo/design-system/components/ui/button';
   export * from './@repo/design-system/components/ui/input';
   // ...add all re-exports you use
   ```

   (You can also export a `ui` namespace if preferred.)

4. **Install/update via shadcn CLI** (in root):

   ```bash
   npx shadcn@latest add --all --overwrite -c packages/design-system
   ```

   ([next-forge.com][3])

5. **Fonts + tokens**
   Put fonts in `packages/design-system/src/lib/fonts.ts` (Next-Forge pattern) and wire Tailwind tokens. ([next-forge.com][8])

---

# 3) Fix **imports** and **path aliases** (the #1 cause of Vercel build failures)

**Next-Forge import rules**

* Shared things come from `@repo/<package>` (e.g., `@repo/design-system`). ([next-forge.com][4])
* App-local things use `@/*` **inside that app** (e.g., `apps/web/*`).
* Don’t import across apps with `@/*`. Use packages.

**tsconfig setup**

* **Root** `tsconfig.json`:

  ```json
  {
    "compilerOptions": {
      "baseUrl": ".",
      "paths": {
        "@repo/*": ["packages/*/src"]
      }
    }
  }
  ```

* **apps/web/tsconfig.json**:

  ```json
  {
    "extends": "@repo/typescript-config/nextjs.json", // if you have a shared tsconfig pkg
    "compilerOptions": {
      "baseUrl": ".",
      "paths": {
        "@/*": ["./*"],                 // app-local
        "@repo/*": ["../../packages/*/src"] // shared
      }
    },
    "include": ["next-env.d.ts", "next.config.*", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]
  }
  ```

  (A known Next-Forge fix is to explicitly set the `@/*` mapping in app tsconfig to avoid dev/runtime alias mismatch.) ([GitHub][9])

**package.json (design-system)**

```json
{
  "name": "@repo/design-system",
  "version": "0.0.0",
  "type": "module",
  "main": "src/index.ts",
  "typings": "src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

**Mandatory find/replace (run at repo root)**

> *Use `rg` (ripgrep) + `sd` (or `sed`). Test each command; commit in small batches.*

* Replace app-local UI imports with package imports:

  ```bash
  # "@/@repo/design-system/components/ui/..."  ->  "@repo/design-system/..."
  rg -l --hidden --glob '!node_modules' --glob '!packages/**' 'from ["'\'']@/@repo/design-system/components/ui/' \
    | xargs sd 'from ["'\'']@/@repo/design-system/components/ui/' 'from "@repo/design-system/'

  # "@repo/design-system/components/ui/..." (no alias) -> package import
  rg -l --hidden --glob '!node_modules' --glob '!packages/**' 'from ["'\'']@repo/design-system/components/ui/' \
    | xargs sd 'from ["'\'']@repo/design-system/components/ui/' 'from "@repo/design-system/'
  ```

* Replace **any** deep relative grabs into shared code with `@repo/*`:

  ```bash
  # example: ../../@repo/design-system/components/ui/Button -> @repo/design-system/button
  rg -l '\.\./\.\./.*components/ui' apps web \
    | xargs -I{} sd '\.\./\.\./.*components/ui' '@repo/design-system'
  ```

* If you previously imported shared libs as `@/lib/...` from inside `apps/web`, split these:

  * If truly **shared**, move into `packages/<lib>/src/...` and import as `@repo/<lib>`.
  * If **web-only**, keep under `apps/web/lib/...` and ensure imports are `@/lib/...` (which resolves to web app via tsconfig).

**Check it:** run a quick type check after replacements:

```bash
pnpm --filter @repo/web typecheck
```

Helpful background on path aliases in Turborepo. ([GitHub][10], [jelaniharris.com][11])

---

# 4) Environment variables via **composed env**

**Why:** missing/incorrect env composition is another common Vercel failure.

**Pattern (Next-Forge):**

* Each **package** defines its env `keys.ts` (using `@t3-oss/env-nextjs`).
* Each **app** has an `env.ts` that **composes** the keys it uses from packages.
* Fill `.env.local` per app (`apps/web/.env.local` etc.). ([next-forge.com][12])

**Concrete steps**

1. In each package with env, create `packages/<name>/src/env/keys.ts` (server/client zod schemas).
2. In `apps/web/env.ts`, compose:

   ```ts
   // apps/web/env.ts
   import { keys as db } from '@repo/database/env/keys'
   import { keys as analytics } from '@repo/analytics/env/keys'
   import { createEnv } from '@t3-oss/env-nextjs'
   // ...compose what web needs
   export const env = createEnv({
     server: {
       ...db.server,
       ...analytics.server,
       // plus any web-only
     },
     client: {
       ...analytics.client,
       NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
       NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
     },
     runtimeEnv: process.env
   })
   ```
3. Ensure these files exist and are filled:
   `apps/web/.env.local`, optional `apps/api/.env.local`, `apps/app/.env.local`, plus package-level `.env` where required. ([next-forge.com][12])

---

# 5) Vercel monorepo deployment (fix for failed build)

**Most likely cause** of your last failed Vercel build: deploying the **repo root** with a single project + `vercel.json`. Next-Forge recommends **separate Vercel projects** with the app’s **Root Directory** set to `apps/web`, `apps/api`, etc., and env added per project. ([next-forge.com][13])

**Do this:**

1. Create **three** Vercel projects (if you have all three apps), otherwise at least one for `apps/web`.
2. In each project’s **Settings → General**, set **Root Directory**:

   * Web → `apps/web`
   * API → `apps/api` (if present)
   * App → `apps/app` (if present)
3. **Remove or ignore root `vercel.json`** if it conflicts. Manage settings per project in the Vercel dashboard. (Root vercel.json at monorepo top often causes mis-detect.)
4. Add env variables in **Settings → Environment Variables** for each project (match §4).
   (Vercel will auto-detect Next.js at the app root and populate the default build/output config.) ([next-forge.com][13])

---

# 6) Scripts & Turborepo filters

**Root `package.json` scripts** (baseline):

```json
{
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint",
    "boundaries": "turbo run boundaries"
  }
}
```

**App scripts** (`apps/web/package.json`):

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "biome check --write ."
  }
}
```

> On Vercel, build uses the app’s `build` script automatically when the Root Directory is set to the app. ([next-forge.com][13])

---

# 7) Clean up & relocate strays

These things at repo root can trip monorepo detection / add noise:

* **`@repo/design-system/components/ui/`** → moved to `packages/design-system` (done in §2). ([GitHub][1])
* **Docs** (e.g., `mysetlist-docs/`, `docs/`) → move into `apps/docs` (Mintlify). ([next-forge.com][7])
* **Standalone HTML** (e.g., `QuickAuction-Notification-Template.html`) → move to `packages/email/templates/` and render via React Email or keep in a separate assets folder ignored by builds. ([GitHub][1], [next-forge.com][14])
* Ensure only **one** Node version (`.nvmrc`) and one package manager (pnpm). Your repo has `.nvmrc` & `.npmrc`; make sure they match the engines used by Next/React. ([GitHub][1])

---

# 8) Boundaries, lint, typecheck (catch regressions early)

* Enable **Turborepo boundaries** and run:

  ```bash
  pnpm boundaries
  ```

  Fix any reported workspace violations (usually cross-app imports). ([next-forge.com][2])
* Keep **Biome/ESLint** coherent; your repo has `biome.json`. Run:

  ```bash
  pnpm lint
  pnpm --filter @repo/web typecheck
  ```

---

# 9) Optional: API & cron/webhooks separation

If you’re currently doing webhooks/cron under `apps/web`, move them to `apps/api`:

* `apps/api/app/cron/*.ts` for scheduled jobs
* `apps/api/app/webhooks/*.ts` for inbound hooks
  Docs pattern is explicitly separated. ([next-forge.com][6])

---

# 10) Exact search/replace checklist (copy/paste)

> Run from repo root. Install tools first: `pnpm add -Dw ripgrep sd` (or use `sed` if you prefer).

**A. UI import normalization**

```bash
# 1) "@/@repo/design-system/components/ui/*" -> "@repo/design-system/*"
rg -l --hidden --glob '!node_modules' 'from ["'\'']@/@repo/design-system/components/ui/' \
 | xargs sd 'from ["'\'']@/@repo/design-system/components/ui/' 'from "@repo/design-system/'

# 2) "@repo/design-system/components/ui/*" -> "@repo/design-system/*"
rg -l --hidden --glob '!node_modules' 'from ["'\'']@repo/design-system/components/ui/' \
 | xargs sd 'from ["'\'']@repo/design-system/components/ui/' 'from "@repo/design-system/'

# 3) remove deep relative grabs to UI
rg -n '\.\./\.\./.*components/ui'
```

**B. Shared lib imports**

```bash
# Example: "@/lib/something" used in multiple apps → if shared:
#  - Move to packages/<lib>/src/something.ts
#  - Then:
rg -l 'from ["'\'']@/lib/' apps \
 | xargs -I{} echo "Check if shared; move & import from @repo/<lib> where appropriate"
```

**C. App-local imports sanity**

```bash
# Ensure @/* resolves to the app only
rg -n 'from ["'\'']@/' apps/web \
 | rg -v '@repo/'  # remaining lines should only be web-local files
```

**D. TSConfig guardrails**

```bash
# Verify each app has @/* and @repo/* path entries:
rg -n '"paths"\s*:\s*{' apps/*/tsconfig.json
```

**E. Boundaries check**

```bash
pnpm boundaries
```

---

# 11) Local build & deploy steps (end-to-end)

1. **Install & bootstrap**

   ```bash
   pnpm i
   ```
2. **Move UI to design-system & run replacements** (section §2 & §10).
3. **Wire env composition** (section §4), fill `apps/web/.env.local` minimally:

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
4. **Typecheck + dev**

   ```bash
   pnpm --filter @repo/web typecheck
   pnpm --filter @repo/web dev
   ```
5. **Build**

   ```bash
   pnpm --filter @repo/web build
   ```
6. **Vercel**

   * Create a new Vercel project pointing to **Root Directory = `apps/web`**.
   * Paste env vars.
   * Deploy. ([next-forge.com][13])

---

## Why this fixes the build

* **Wrong root** on Vercel → fails to find a Next app or runs the wrong scripts. **Root Directory** per app fixes that. ([next-forge.com][13])
* **Scattered UI** (`components/ui` at root) + ad-hoc aliases → breaks Turborepo boundaries and TS/Next resolution. Centralizing in `packages/design-system` + `@repo/*` imports resolves it. ([next-forge.com][3])
* **Missing env composition** → runtime/type errors in Next 14/15. Adding `env.ts` per app to compose package keys matches Next-Forge. ([next-forge.com][12])
* **Path aliases** not consistent between IDE and dev/build → add `@/*` mapping inside each app’s tsconfig to match Next-Forge’s known fix. ([GitHub][9])

---

## Notes on Turbopack & Next 15

* Next 15’s defaults are fine; no special Turbopack flags needed for production (`next build` uses Rust compiler). Keep `next.config` minimal and avoid cross-package `src/` imports unless you’ve set exports/paths as above. (See “Next-Forge Web” app docs.) ([next-forge.com][5])

---

If you want, I can also draft the **exact** `packages/design-system` skeleton (package.json, shadcn `components.json`, Tailwind token wiring) and a **sample** `apps/web/env.ts` file you can drop in. Otherwise, run the steps above in order and you should go from red to green on Vercel.

[1]: https://github.com/swbam/mysetlist-s4 "GitHub - swbam/mysetlist-s4"
[2]: https://www.next-forge.com/docs/structure "Structure"
[3]: https://www.next-forge.com/packages/design-system/components "Components"
[4]: https://www.next-forge.com/packages "AI"
[5]: https://www.next-forge.com/apps/web "Web"
[6]: https://www.next-forge.com/apps "API"
[7]: https://www.next-forge.com/apps/docs "Documentation"
[8]: https://www.next-forge.com/packages/design-system/typography "Typography"
[9]: https://github.com/vercel/next-forge/issues/267?utm_source=chatgpt.com "Typescript Alias import error · Issue #267 · vercel/next-forge"
[10]: https://github.com/vercel/turborepo/discussions/620?utm_source=chatgpt.com "TypeScript \"paths\" in monorepo · vercel turborepo - GitHub"
[11]: https://jelaniharris.com/blog/solving-the-module-not-found-error-when-using-nextjs-and-monorepos/?utm_source=chatgpt.com "Solving the Module Not Found error when using NextJS and MonoRepos"
[12]: https://www.next-forge.com/docs/setup/env "Environment Variables"
[13]: https://www.next-forge.com/docs/deployment/vercel "Deploying to Vercel"
[14]: https://www.next-forge.com/packages/email "Transactional Emails"
