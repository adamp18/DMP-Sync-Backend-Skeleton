# API Server

Multi-tenant SaaS API that powers both a Chrome extension (JSON API) and a
React admin portal. Built with TypeScript + Express 4, PostgreSQL via Drizzle
ORM, JWT auth, Zod validation, and pino logging.

## Setup

1. Install dependencies from the workspace root:

   ```bash
   pnpm install
   ```

2. Copy the environment template and fill in values:

   ```bash
   cp .env.example .env
   ```

   Required variables:

   - `DATABASE_URL` — Postgres connection string (Replit provisions this
     automatically when a database is attached)
   - `JWT_SECRET`, `JWT_REFRESH_SECRET` — long random strings used to sign
     access / refresh tokens
   - `ADMIN_UI_ORIGIN` — origin of the React admin portal (comma-separated
     list supported)
   - `EXTENSION_ORIGIN` — Chrome extension origin prefix
     (`chrome-extension://`)

   On Replit, prefer Replit Secrets over a local `.env` file in production.

3. Push the (currently empty) Drizzle schema to the database:

   ```bash
   pnpm --filter @workspace/api-server run db:push
   ```

## Scripts

| Script           | Description                                       |
| ---------------- | ------------------------------------------------- |
| `dev`            | Run the server in watch mode (`tsx watch`)        |
| `build`          | Bundle the server with esbuild into `dist/`      |
| `start`          | Run the bundled production server                 |
| `db:push`        | Push Drizzle schema changes to the database       |
| `db:studio`      | Open Drizzle Studio against the configured DB     |
| `typecheck`      | Run `tsc --noEmit`                                |

Run any of them with:

```bash
pnpm --filter @workspace/api-server run <script>
```

## Health check

```bash
curl http://localhost:$PORT/api/health
# => { "ok": true, "ts": "2026-04-23T12:00:00.000Z" }
```

## Project layout

```text
src/
├── index.ts                 # Entry point — starts Express
├── app.ts                   # Express app factory (CORS, JSON, logging)
├── db/
│   ├── client.ts            # Drizzle client + pg Pool
│   └── schema.ts            # Drizzle table definitions (empty for now)
├── lib/
│   ├── env.ts               # Zod-validated environment loader
│   └── logger.ts            # pino instance
├── middleware/
│   ├── auth.ts              # JWT validation middleware (stub)
│   └── error.ts             # Central error handler
└── routes/
    └── index.ts             # Route registration (currently /api/health)
```
