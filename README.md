# test.xmartycreator.com - Test Management System

Production test management app with:
- Role based auth (`ADMIN`, `STUDENT`)
- Admin modules: dashboard, tests, questions, results, batches, courses, enrollments
- Student modules: dashboard, attempt UI, result, profile, batch, enrolled courses
- Frontend-first architecture with backend-ready services and API routes

## Tech
- Next.js App Router + TypeScript
- TailwindCSS
- Framer Motion
- Zustand
- React Hook Form + Zod
- Recharts
- Lucide icons
- MongoDB-backed APIs (same DB as main project)

## Run
```bash
npm install
npm run dev
```
App runs on `http://localhost:3011`.

## Login
- Direct login is disabled here.
- Login on main app first, then open `/login` on test subdomain.

## Notes
- Route guards are handled in `middleware.ts`.
- API routes in `app/api/*` provide backend-ready structure.
- Services in `/services` call real `app/api/*` endpoints (no mock data/users).
- Set `MONGODB_URI` (or `MONGO_URI`) in this subdomain env to the same value as main project DB.
- Shared session bridge:
  - If main app user is already logged in (admin or student), this app auto-syncs role on `/login`, `/admin/*`, `/student/*`.
  - Configure `MAIN_SITE_URL` (example local: `http://localhost:3000`) if your main app runs on a custom host/port.

# test.xmartycreator.com
