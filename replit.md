# BenePortal — Benefits Enrollment Platform

A full-featured benefits enrollment and administration platform similar to Ease/Bernie Portal.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm --filter @workspace/benefits-portal run dev` — run the frontend (port varies, proxied at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Wouter + TanStack Query + shadcn/ui + Recharts

## Where things live

- `lib/db/src/schema/index.ts` — all 12 DB tables (source of truth)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `artifacts/api-server/src/routes/index.ts` — all 15+ API routers
- `artifacts/benefits-portal/src/App.tsx` — all frontend routes
- `artifacts/benefits-portal/src/index.css` — brand theme (Tailwind CSS v4 `@theme`)
- `artifacts/benefits-portal/src/components/layout/app-layout.tsx` — sidebar nav + chatbot widget
- `artifacts/benefits-portal/src/components/chatbot-widget.tsx` — floating chatbot UI
- Generated hooks: `lib/api-client-react/src/generated/api.ts`
- Generated Zod schemas: `lib/api-zod/src/generated/`

## Architecture decisions

- Contract-first: OpenAPI YAML → Orval codegen → typed React Query hooks + Zod schemas. Never manually write fetch calls.
- Chatbot is fully rule-based (keyword matching knowledge base in `artifacts/api-server/src/routes/chatbot.ts`) — no external AI model.
- Enrollment changes outside open periods are captured in `enrollment_changes` table and require admin approval.
- Max 3 admin users per employer enforced at the route level (`admin_users.ts`).
- Dependent age-26 tracking: `daysUntilAge26()` computes days remaining; notifications auto-created when dependent is added within 60 days of aging out.

## Product

### Multi-employer management
- Employer directory with EIN, industry, location, contact info
- Per-employer census upload (CSV or paste)

### Employee management
- Employee list with search, status, invitation tracking
- CSV file upload import (real file picker → FileReader → POST /api/employees/import-csv)
- Employee detail page: contact info, employment details, real enrollment status (plan + carrier + coverage level + transmission status), dependents

### Benefits & enrollment
- Benefits plan catalog by type (medical, dental, vision, life, disability)
- Enrollment tracking with carrier transmission status
- Enrollment period controls: open, new hire, life event windows
- Out-of-period change requests captured and routed to approval queue

### Carrier connections
- Carrier directory with connection type (EDI, SFTP, API, Email)
- Carrier-level integration tracking

### Dependent management
- Full dependent CRUD on employee detail page
- Age-26 alerts and days-until-ageout tracking
- COBRA notice tracking

### Admin & compliance
- Up to 3 admin users per employer
- Approval workflow for out-of-period enrollment changes
- System notifications (CSV imports, enrollment period changes, dependent age alerts, pending approvals)
- Notification bell with unread count badge

### Benefits chatbot
- Floating chat widget (bottom-right bubble)
- Rule-based keyword matching across 12+ benefit topics (HSA, FSA, HMO, PPO, COBRA, dental, vision, deductibles, etc.)
- Topic suggestions on open, follow-up question chips after each answer

### Documents & integrations
- Document management page
- Integration management (payroll, carrier, HRIS connections)

## Brand / Design

Colors applied via CSS variables in `artifacts/benefits-portal/src/index.css`:
- Primary Red `#9E1E34` (350 68% 37%) — buttons, active states, badges
- Deep Burgundy `#5E0E20` (347 74% 21%) — sidebar background
- Dusty Teal `#4A8FA3` (194 38% 46%) — accent icons, callouts
- Slate Blue-Gray `#4A5568` (218 17% 35%) — body text
- Blush `#FAE0DC` (8 75% 92%) — secondary backgrounds, tag highlights
- Warm Gray `#D1CFC7` (48 10% 80%) — borders, muted backgrounds
- Soft White `#F8F6F4` (30 22% 96%) — page background
- Fonts: Inter (body), Outfit (display/headings)

## User preferences

- No external AI model in the app — chatbot must be rule-based keyword matching only
- Brand color kit must be used throughout the UI

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change before editing frontend code
- The OpenAPI YAML must have `paths:` before `components:` — use the Python rebuild script if the order gets corrupted
- In Tailwind CSS v4, Google Fonts `@import url(...)` must be the very first line in index.css (before `@import "tailwindcss"`)
- Generated hooks take positional args, not objects — e.g. `useListDependents(empId, opts)` not `useListDependents({ employeeId: empId }, opts)`
- `useGetActiveEnrollmentPeriod` returns `{ isOpen, activePeriod, message }` — access `.activePeriod` not the root data object

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
