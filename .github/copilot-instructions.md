# Copilot Instructions

## Architecture

This is a **Cloudflare Worker** serving a church website (Gnosjö Missionskyrka) with two layers:

1. **Static site (Eleventy/11ty):** Markdown and Nunjucks pages in `src/content/pages/` are built into `_site/` and served as Worker static assets.
2. **Worker API (`src/index.ts`):** Handles authentication and protected file access. Routes:
   - `/api/auth/{login,logout,check}` — session-based auth using KV
   - `/api/file/{path}` — serves files from R2; `members/` paths require auth

**Cloudflare bindings:**
- `SESSIONS_KV` (KV) — sessions and rate-limit data
- `FILE_BUCKET` (R2) — file storage with `public/` and `members/` prefixes
- `GNMK_MEMBERS_PASSWORD` (secret) — shared password for member login

The Wrangler build step runs `npm run build` (Eleventy) before deploying, so the static site and Worker are deployed together.

## Commands

```bash
npm run dev          # Local dev server (wrangler dev, runs Eleventy build automatically)
npm test             # Run all tests (vitest with Cloudflare Workers pool)
npx vitest run test/index.spec.ts  # Run a single test file
npm run build        # Build static site only (Eleventy → _site/)
npm run cf-typegen   # Regenerate worker-configuration.d.ts from wrangler.jsonc
npm run deploy       # Deploy to Cloudflare
```

## Testing

Tests use **Vitest** with `@cloudflare/vitest-pool-workers`, which runs tests inside the Workers runtime. Test files live in `test/` and import helpers from `cloudflare:test`:

```ts
import { env, createExecutionContext, SELF } from 'cloudflare:test';
```

- **Unit style:** call `worker.fetch(request, env, ctx)` directly
- **Integration style:** use `SELF.fetch(url)` to make requests through the full Worker

## Content (Eleventy)

- Pages: `src/content/pages/` (Markdown/Nunjucks, uses `pages.json` for default layout)
- Layouts: `src/content/_includes/` (Nunjucks partials: `base.njk`, `header.njk`, etc.)
- Static assets: `src/content/{styles,scripts,images}/` (passed through to `_site/`)
- Collections are defined in `.eleventy.js`: `activities`, `news`, `pages` — sorted by `order` or `date` frontmatter

News items support an `expires` frontmatter field (items past expiry are excluded from the collection).

## Conventions

- TypeScript strict mode; the Worker entry point is a single file (`src/index.ts`) with the default `fetch` export
- Formatting: 2-space indent, no tabs (see `.prettierrc`)
- Deployment: GitHub Actions on `workflow_dispatch` or daily cron; PR previews via Wrangler versions
- Environment variables with defaults are defined in `wrangler.jsonc` `vars`; secrets are set via `wrangler secret`
- After changing bindings in `wrangler.jsonc`, run `npm run cf-typegen` to update `worker-configuration.d.ts`
