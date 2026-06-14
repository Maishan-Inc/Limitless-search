# PostgreSQL Install And Admin Config Design

Date: 2026-06-14

## Goal

Replace the current file-based admin SQLite storage and business environment-variable configuration with a PostgreSQL-backed install and admin configuration flow.

The first implementation phase keeps the existing two-service architecture:

- Next.js remains responsible for the public web app, installer, admin UI, admin sessions, and admin API routes.
- Go remains responsible for search and plugin execution.
- PostgreSQL becomes the shared durable store for admin data, rankings, and business configuration.

Docker still uses infrastructure-level environment variables for ports and database bootstrap. User-facing business configuration moves into PostgreSQL and is managed from the installer or admin console.

## Scope

This phase includes:

- PostgreSQL service and connection wiring in Docker.
- A PostgreSQL database access layer for the Next.js app.
- Migration of admin users, admin sessions, ranking versions, ranking lists, and ranking items from the current `sql.js` schema into PostgreSQL tables.
- New installation state detection.
- New `/install` wizard:
  - Open-source license agreement with scroll-to-bottom requirement before agreeing.
  - Environment and database checks.
  - Initial admin account creation and custom admin path configuration.
- Dynamic admin login entry based on configured admin path.
- Removal of business configuration from public Docker build args and runtime env where practical.
- Admin configuration center for:
  - AI search suggestion settings.
  - AI ranking settings.
  - AI prompt management.
  - Captcha provider and keys.
  - Ranking automation schedule.
  - Core project settings currently expressed as business env.
- Runtime config read helpers so existing AI, captcha, ranking, sitemap, and admin bootstrap logic read from PostgreSQL.

This phase excludes:

- Drag-and-drop ranking sorting.
- Manual multilingual ranking title editing.
- Full AI multilingual authoring workflow UI.
- Moving all admin APIs from Next.js into Go.
- Removing infrastructure env required by Docker, PostgreSQL, ports, and service-to-service connection.

Those excluded items are reserved for a second implementation phase.

## Current State

The app currently has:

- Root Docker Compose with a single `limitless-search` service and many business env values.
- Next.js app in `web/limitless_search_web`.
- Go search service in `backend/limitless_search`.
- Admin users, sessions, and ranking versions stored through `web/limitless_search_web/src/lib/admin-db.ts` using `sql.js` and a persisted SQLite file.
- Admin login fixed at `/admin`.
- Existing ranking admin UI and protected mutation routes.
- AI, captcha, and ranking behavior primarily configured from `process.env`.

## Architecture

### Services

Docker Compose will run:

- `postgres`: PostgreSQL database with a named volume.
- `limitless-search`: existing combined app container, still running Go backend and Next.js frontend.

Infrastructure env remains limited to:

- PostgreSQL bootstrap variables.
- `DATABASE_URL` or equivalent database connection details.
- `PORT`, `WEB_PORT`, and internal service addresses.

Business config such as AI provider keys, captcha keys, prompts, ranking switches, plugin lists, channel lists, cache behavior, and ranking schedule will be persisted in PostgreSQL.

### Database Access

Add a server-only PostgreSQL helper for the Next.js app:

- Use the `pg` Node package.
- Create a pooled connection module.
- Provide `query`, `firstRow`, `scalar`, and transaction helpers.
- Replace admin DB calls that currently depend on `sql.js`.

The first phase keeps Go config reads conservative:

- Add a small Go config repository backed by PostgreSQL.
- Keep fallback defaults for startup resilience.
- Load runtime search settings from database when available.
- Leave Go plugin internals untouched unless they directly depend on removed business env.

### Installation State

Installation is considered complete only when all are true:

- Database connection succeeds.
- Required tables exist or can be migrated.
- At least one admin user exists.
- A valid admin path exists in the settings table.
- License agreement has been accepted.

Before installation is complete:

- `/install` is accessible.
- `/admin` redirects to `/install`.
- Admin-only APIs reject setup-dependent operations except installer bootstrap and setup endpoints.

After installation is complete:

- `/install` redirects to the configured admin path.
- `/admin` returns 404 or redirects to `/` unless the configured path is exactly `/admin`.
- Only the configured admin path renders the admin auth panel.

## Data Model

Create or migrate these tables:

- `admin_users`
- `admin_sessions`
- `ranking_versions`
- `ranking_lists`
- `ranking_items`
- `app_settings`
- `install_state`
- `setting_audit_logs`

`app_settings` stores typed settings:

- `key text primary key`
- `value_json jsonb not null`
- `is_secret boolean not null default false`
- `category text not null`
- `updated_at timestamptz not null`
- `updated_by_admin_id bigint null`

Secret values such as API keys and captcha secrets are stored as database values marked with `is_secret`. Admin read APIs return masked values unless explicitly needed for server-side execution.

`install_state` stores:

- license acceptance timestamp.
- installed timestamp.
- schema version.
- configured admin path.

Ranking tables keep the existing structure with PostgreSQL-native IDs and JSONB for multilingual title maps.

## Installer

### Step 1: License

The installer renders the project license text. The agree button remains disabled until the scroll container reaches the bottom. Agreement is submitted to the setup API and stored only as part of the final install transaction.

### Step 2: Environment Check

Checks include:

- PostgreSQL connection.
- Required extension availability where needed.
- Required table migration status.
- Writable migration state.
- Current install status.
- Node runtime and Next.js server availability.
- Go backend health endpoint.

Docker is expected to make these pass, but failures are shown with actionable messages.

### Step 3: Admin And Admin Path

The final step collects:

- Admin email.
- Admin password and confirmation.
- Admin path, for example `/manage-portal`.

Validation:

- Admin path must start with `/`.
- Admin path cannot be `/install`, `/api`, `/rankings`, static asset paths, or reserved Next.js routes.
- Password must be at least 8 characters.
- Only the first admin user can be created during install.

The setup API creates the admin user, writes install state, writes default app settings, creates a session, and redirects to the configured admin path.

## Dynamic Admin Path

Next.js routing will use a catch-all or middleware-based guard:

- Requests to the configured admin path render the existing admin login/dashboard flow.
- Requests to fixed `/admin` no longer expose the login page after installation.
- Admin dashboard subpaths are rooted under the configured admin path.
- Admin API routes remain under `/api/admin/*` and require a valid admin session.

Admin path changes from the configuration center require confirmation. After save, the current session remains valid, but future UI links use the new path.

## Configuration Center

Add an admin settings area with sections:

- Overview: install state, database state, active admin path, last update.
- AI API:
  - suggestion enabled.
  - ranking enabled.
  - base URL.
  - model.
  - API key.
  - request threshold.
  - require captcha for AI suggestion.
- AI Prompts:
  - search suggestion prompt.
  - yearly ranking prompt.
  - monthly ranking prompt.
  - daily ranking prompt.
  - moderation prompt.
  - translation prompt.
  - score normalization prompt.
  - verification prompt.
- Captcha:
  - provider: `none`, `turnstile`, or `hcaptcha`.
  - site key.
  - secret key.
- Ranking Automation:
  - enabled.
  - nav visible.
  - run at.
  - timezone.
  - run on startup.
  - minimum items.
  - sync token.
- Core Runtime:
  - channels.
  - enabled plugins.
  - cache settings.
  - async plugin settings.
  - proxy.
  - optional search authentication settings.

Each settings update writes an audit record. Secret fields support "leave unchanged" semantics.

## Runtime Config Reads

Replace direct `process.env` reads in Next.js runtime code with server-side config helpers:

- `captcha.ts` reads captcha provider and keys from settings.
- `api/ai-suggest/route.ts` reads AI suggestion config from settings.
- `rankings-config.ts` reads ranking enablement from settings.
- `rankings.ts` reads ranking AI, schedule, prompt, and Bilibili config from settings.
- Admin bootstrap reads setup and captcha state from settings.

Build-time `NEXT_PUBLIC_*` usage should be removed for these features where possible. Client components receive required public config through server-rendered props or API bootstrap responses.

## Go Backend Config

Go will read shared runtime config from PostgreSQL using `DATABASE_URL`.

Initial Go integration focuses on:

- channels.
- enabled plugins.
- cache settings.
- async plugin settings.
- auth settings.
- proxy.

If database config is unavailable during startup, Go logs a clear warning and falls back to compiled defaults or minimal safe defaults. Search should not crash solely because optional business settings are missing.

## Migration Strategy

The app is currently early-stage enough that this phase can introduce PostgreSQL as the new required store.

Migration behavior:

- New installs create PostgreSQL schema and default settings.
- Existing `sql.js` admin data is not automatically imported in phase one.
- If an old SQLite admin file exists, the installer shows a warning that PostgreSQL setup will become the active store.

This avoids writing a fragile one-off SQLite-to-PostgreSQL importer before the new data layer is stable.

## Security

- Password hashing remains `scrypt`.
- Admin sessions remain HTTP-only cookies.
- Admin API routes continue to require a valid session.
- Admin path is not treated as authentication. It only hides the login entry from predictable URLs.
- Secrets are never sent back to the browser in full after save.
- Captcha verification uses server-side secrets only.
- Setup endpoints are locked after installation.
- Admin path changes are audited.

## Error Handling

- Database connection failure on `/install` displays a blocking environment check failure.
- Database connection failure after install causes admin APIs to return service-unavailable JSON.
- Missing optional AI config disables AI calls with clear admin-facing messages.
- Invalid prompt output handling remains defensive and continues using existing JSON parsing safeguards.
- Ranking generation failures preserve the existing fallback behavior where possible.

## Testing

Implementation should include:

- TypeScript type checks and lint for the web app.
- Unit-level tests or focused script checks for settings read/write helpers if the repo adds a test runner.
- Manual Docker smoke test:
  - fresh `docker compose up`.
  - open `/install`.
  - accept license only after scrolling.
  - verify environment checks.
  - create admin and custom path.
  - confirm `/admin` no longer opens login.
  - confirm configured admin path opens login/dashboard.
  - save AI, captcha, and ranking settings.
  - call AI suggestion and ranking sync with config loaded from PostgreSQL.
- Go build check after adding PostgreSQL config reads.

## Phase Two

After this phase, implement:

- Drag-and-drop ranking editor.
- Manual multilingual ranking title editor.
- AI multilingual generation and review UI.
- Visual ranking layout configuration.
- Optional import path from legacy SQLite data.

