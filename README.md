# Cooking Network

A Next.js web app for sharing cooking posts, tracking groceries, and getting recipe recommendations based on what you have.

## Features

- **User blogs** – Each user has a public blog of cooking posts (stories and recipes).
- **Discovery feed** – Browse recent posts from all users.
- **Private grocery list** – Track groceries with quantity and “remind when below” threshold.
- **Low-stock reminders** – In-app section showing items below your threshold.
- **What can I cook?** – Recommendations based on your current groceries.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Database**

   Use PostgreSQL and set `DATABASE_URL` in `.env` (see `.env.example`).

   ```bash
   npx prisma migrate dev
   ```

3. **Auth**

   Set in `.env`:

   - `NEXTAUTH_URL` – e.g. `http://localhost:3000`
   - `NEXTAUTH_SECRET` – e.g. `openssl rand -base64 32`
   - Optional: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for Google sign-in

4. **Seed recipes (optional)**

   Adds a few sample recipes so “What can I cook?” returns results before user-created recipes exist:

   ```bash
   npm run db:seed
   ```

5. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). You’ll be redirected to the feed. Sign up or sign in to create posts, manage groceries, and use recommendations.

## Scripts

- `npm run dev` – Start dev server (with Turbopack)
- `npm run build` – Production build
- `npm run start` – Start production server
- `npm run db:generate` – Generate Prisma client
- `npm run db:push` – Push schema to DB (no migration files)
- `npm run db:migrate` – Run migrations
- `npm run db:seed` – Seed sample recipes
