# Benefits-Gateway — Project Brief
**For:** Project Manager onboarding
**Repo:** https://github.com/QBenAdmin/Benefits-Gateway
**As of:** June 2026

---

## What This Is

Two production-ready web applications sharing a single backend and database:

1. **BenePortal** (`/`) — A multi-employer benefits enrollment and administration platform (comparable to Ease or Bernie Portal). HR teams and benefits brokers use it to manage employee census data, benefit plan elections, carrier transmissions, enrollment periods, and dependent coverage.

2. **ERT Compliance Auditor** (`/hr-compliance-auditor`) — A standalone HR compliance tool for conducting Title VII / EEOC adverse impact audits. Analysts upload employee workforce data (hiring, promotions, terminations, compensation), run statistical analysis (Four-Fifths Rule, Chi-Square, Welch's T-test), complete an ERT (Equitable Review Tool) checklist, and download a branded PDF audit report.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces |
| Language | TypeScript 5.9, Node.js 24 |
| Backend | Express 5 |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod v4 + drizzle-zod |
| API contract | OpenAPI YAML → Orval codegen |
| Frontend | React 19 + Vite + Wouter + TanStack Query |
| UI components | shadcn/ui + Radix UI + Recharts |
| Styling | Tailwind CSS v4 |
| PDF generation | pdfkit (server-side) |
| Email | Nodemailer (SMTP or simulate mode) |

---

## Repository Layout

```
Benefits-Gateway/
├── artifacts/
│   ├── api-server/          # Express 5 backend — all routes, mailer, PDF gen
│   ├── benefits-portal/     # BenePortal React frontend
│   ├── hr-compliance-auditor/  # ERT Compliance Auditor React frontend
│   └── mockup-sandbox/      # Design exploration sandbox (internal tooling only)
├── lib/
│   ├── db/                  # Drizzle schema (source of truth for all 12+ tables)
│   ├── api-spec/            # openapi.yaml (source of truth for API contract)
│   ├── api-client-react/    # Generated TanStack Query hooks (DO NOT EDIT MANUALLY)
│   └── api-zod/             # Generated Zod schemas (DO NOT EDIT MANUALLY)
├── scripts/                 # One-off seed/reset scripts (tsx, not deployed)
├── pnpm-workspace.yaml      # Dependency catalog + overrides
├── tsconfig.base.json       # Shared strict TS config
└── replit.md                # Living project README (always up to date)
```

### Key single-file sources of truth
- **`lib/db/src/schema/index.ts`** — all database tables
- **`lib/api-spec/openapi.yaml`** — all API routes and request/response shapes
- **`artifacts/api-server/src/routes/index.ts`** — all route registrations
- **`artifacts/benefits-portal/src/App.tsx`** — all BenePortal frontend routes
- **`artifacts/hr-compliance-auditor/src/App.tsx`** — all Auditor frontend routes

---

## Development Workflow (Critical)

The project is **contract-first**. The mandatory sequence for any API change is:

```
1. Edit lib/api-spec/openapi.yaml
2. Run: pnpm --filter @workspace/api-spec run codegen
3. Edit the route handler in artifacts/api-server/src/routes/
4. Use generated hooks in the frontend (never write fetch calls manually)
```

**Never** hand-write fetch calls or TypeScript types for API data — always use the generated hooks from `lib/api-client-react/src/generated/api.ts`.

### Other key commands
```bash
pnpm --filter @workspace/db run push          # Apply DB schema changes (dev only)
pnpm run typecheck                             # Full typecheck across all packages
pnpm --filter @workspace/api-server run build # Build API server (esbuild → CJS)
```

### Pushing to GitHub
```bash
git push https://QBenAdmin:$GITHUB_TOKEN@github.com/QBenAdmin/Benefits-Gateway.git HEAD:main
```

---

## Database Schema (12 Tables)

| Table | Purpose |
|---|---|
| `employers` | Company directory (EIN, industry, location) |
| `employees` | Employee roster per employer |
| `dependents` | Family members on coverage |
| `benefit_plans` | Plan catalog (medical/dental/vision/life/disability) |
| `enrollments` | Active plan elections per employee |
| `enrollment_periods` | Open/new-hire/life-event windows |
| `enrollment_changes` | Out-of-period change requests (approval queue) |
| `carriers` | Carrier directory with connection type |
| `admin_users` | Up to 3 admins per employer |
| `notifications` | System-wide alerts (bell icon) |
| `activity_log` | Audit trail |
| `audit_sessions` | ERT Compliance Auditor sessions |
| `audit_csv_uploads` | Uploaded workforce data per session |
| `audit_statistical_results` | Computed adverse impact findings |
| `audit_ert_responses` | ERT checklist answers per session |
| `documents` | Employer document attachments |
| `integrations` | Payroll/HRIS/carrier connection records |

---

## BenePortal Feature Inventory

### Employer Management
- Employer directory with EIN, industry, city/state, contact info
- Per-employer scoping of all downstream data

### Employee Management
- Searchable employee list with invitation status badges (Not Yet Invited / Invite Sent / Portal Active)
- Employee detail page: contact info, date of hire, salary, employment type
- CSV file import (FileReader → `POST /api/employees/import-csv`)
- Send/resend portal invitations via email
- Edit dialog covers all fields including DOH

### Benefits & Enrollment
- Plan catalog by type; enrollment tracking with carrier transmission status
- Enrollment period controls with open/close dates
- **Send Enrollment Notices** — bulk-emails all employees with branded HTML email (SMTP or simulated)
- Out-of-period change requests → admin approval queue

### Dependent Management
- Full CRUD on employee detail page
- Age-26 alert: auto-creates notification when dependent is within 60 days of aging out; `daysUntilAge26()` displayed inline

### Carrier Connections
- Carrier directory; connection type tracking (EDI, SFTP, API, Email)

### Admin & Compliance
- Max 3 admin users per employer (enforced at route level)
- Notification bell with unread count badge
- System notifications for: CSV imports, enrollment period changes, age-26 alerts, pending approvals

### Chatbot
- Floating widget (bottom-right); rule-based keyword matching only — **no external AI model**
- 12+ topics: HSA, FSA, HMO, PPO, COBRA, dental, vision, deductibles, life events, etc.
- Topic suggestion chips on open; follow-up chips after each answer

### Documents & Integrations
- Document management page
- Integration tracking (payroll, carrier, HRIS)

---

## ERT Compliance Auditor Feature Inventory

### Audit Lifecycle (4-step wizard)
1. **Session setup** — name, cadence (weekly/monthly/quarterly/yearly), analysis window dates
2. **CSV upload** — upload workforce data; auto-maps columns; Download Sample CSV button provides a 35-row synthetic dataset that exercises all disparity types
3. **ERT Checklist** — structured questionnaire across 5 pillars (Governance, Data, Model, Deployment, Monitoring)
4. **Results** — tabbed view: Overview, Findings, Report, ERT

### Statistical Analysis
- Adverse Impact: Four-Fifths Rule (hiring, promotion, termination rates by gender/race)
- Compensation Gap: mean salary by gender and race (percentage gaps)
- Statistical tests: Chi-Square and Welch's T-test
- Severity bucketing: High / Medium / Low

### Scheduling & Alerts
- `nextDueDate` and `scheduleStatus` computed at read time (no DB columns needed) from cadence + last completion date
- Dashboard "Upcoming & Overdue Audits" alert card (hidden when nothing due)
- DB notifications auto-created for overdue sessions (idempotent)
- Audit list filter pills: All / On Track / Due Soon / Overdue

### PDF Export
- `GET /audit/sessions/:id/report.pdf` — server-side branded PDF via pdfkit
- Fonts: Outfit (headings) + Inter (body) — TTF files bundled in `artifacts/api-server/src/fonts/`
- Content: session metadata, overall risk badge, ERT pillar score boxes, statistical tables, findings, methodology, legal references
- Multi-page with correct page X of N footer

### Regulatory Feed
- RSS integration pulling live EEOC and regulatory updates

---

## Brand / Design System

Applied via CSS variables in each app's `index.css`:

| Token | Hex | Use |
|---|---|---|
| Primary Red | `#9E1E34` | Buttons, active states, badges |
| Deep Burgundy | `#5E0E20` | Sidebar background |
| Dusty Teal | `#4A8FA3` | Accent icons, callouts |
| Slate Blue-Gray | `#4A5568` | Body text |
| Blush | `#FAE0DC` | Secondary backgrounds, tag highlights |
| Warm Gray | `#D1CFC7` | Borders, muted backgrounds |
| Soft White | `#F8F6F4` | Page background |

Fonts: **Inter** (body), **Outfit** (display/headings) — loaded via Google Fonts.

---

## Environment Variables

| Variable | Purpose | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `SESSION_SECRET` | Express session signing | Yes |
| `GITHUB_TOKEN` | Push to QBenAdmin/Benefits-Gateway | Yes |
| `SMTP_HOST` | Email delivery | No (simulates if unset) |
| `SMTP_PORT` | Email delivery | No |
| `SMTP_USER` | Email delivery | No |
| `SMTP_PASS` | Email delivery | No |
| `SMTP_FROM` | From address on enrollment notices | No |
| `SMTP_SECURE` | TLS on/off | No |

`REPLIT_DOMAINS` is set automatically by the Replit platform and used to construct portal URLs in invitation emails.

---

## Known Constraints & Gotchas

1. **Contract-first is mandatory** — editing routes without regenerating codegen causes type drift. Always run codegen after any OpenAPI change.
2. **OpenAPI YAML key order** — `paths:` must appear before `components:`. If order gets corrupted, use the Python rebuild script in the repo.
3. **Tailwind CSS v4** — Google Fonts `@import url(...)` must be the very first line in `index.css`, before `@import "tailwindcss"`.
4. **Generated hook signatures are positional** — e.g. `useListDependents(empId, opts)` not `useListDependents({ employeeId: empId }, opts)`.
5. **`useGetActiveEnrollmentPeriod`** returns `{ isOpen, activePeriod, message }` — access `.activePeriod`, not the root object.
6. **`annualSalary` type** — Zod parses it as `number` but Drizzle `numeric` expects `string`. Pattern: `String(annualSalary)` before any DB insert/update.
7. **Max 3 admin users per employer** — enforced at the route level in `admin_users.ts`.
8. **Chatbot is rule-based only** — no external AI model is to be introduced. User preference is explicit.
9. **`pdfkit` must stay in esbuild externals** — its `fontkit` dependency uses `@swc/helpers` which breaks bundling if included.
10. **`lib/*` packages are composite** — run `pnpm run typecheck:libs` after changing any lib before checking leaf artifacts.

---

## Current State (June 2026)

All core features are complete and functional. Recent completed work:

- Email enrollment notices (Nodemailer, branded HTML, SMTP or simulate)
- Employee portal invitations with DOH field and invitation status tracking
- ERT Compliance Auditor: full audit lifecycle, adverse impact analysis, PDF export
- Audit scheduling: cadence-based next-due dates, due-soon/overdue alerts, list filters
- Sample CSV download in wizard (realistic disparity data for testing)
- Security: removed `xlsx` (unpatched CVEs), forced `qs >= 6.15.2` override
- GitHub sync: full commit history pushed to QBenAdmin/Benefits-Gateway

No open bugs are known. No pending migrations — DB schema is in sync.

---

## How to Contribute

1. Identify the right source-of-truth file to edit (schema, OpenAPI spec, or route)
2. For API changes: edit OpenAPI → run codegen → implement route → use generated hook
3. For DB changes: edit `lib/db/src/schema/` → run `pnpm --filter @workspace/db run push`
4. Typecheck before submitting: `pnpm run typecheck`
5. Push to GitHub when done
