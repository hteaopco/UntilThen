# UntilThen

A Next.js app deployed on Railway with Postgres + Prisma.

## Stack
- Next.js 15 (App Router, TypeScript)
- Tailwind CSS
- Prisma ORM + Postgres
- Railway (Nixpacks build, GitHub auto-deploy)

## Local setup

```bash
# 1. Install deps
npm install

# 2. Copy env
cp .env.example .env
# edit DATABASE_URL to point at a local Postgres

# 3. Apply schema
npx prisma migrate dev --name init

# 4. Run dev
npm run dev
```

Health check: http://localhost:3000/api/health

## Railway setup (GitHub auto-deploy)

1. Push this repo to GitHub.
2. In [Railway](https://railway.app), **New Project → Deploy from GitHub repo** → pick this repo.
3. In the project, click **+ New → Database → Add PostgreSQL**.
4. On the web service, go to **Variables** and add a reference variable:
   `DATABASE_URL = ${{ Postgres.DATABASE_URL }}`
5. (Optional) Add `NEXT_PUBLIC_APP_URL` with your Railway domain.
6. Railway will build (Nixpacks), run `prisma migrate deploy`, then start Next.js.
7. Healthcheck is `/api/health`.

Every push to the connected branch triggers a deploy.

## Scripts
- `npm run dev` — local dev server
- `npm run build` — production build (runs `prisma generate`)
- `npm run start` — start production server
- `npm run db:migrate` — apply migrations (used on Railway)
- `npm run db:studio` — Prisma Studio
