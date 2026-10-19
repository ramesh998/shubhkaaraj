# ShubhKaaraj

Website, API and admin backend for ShubhKaaraj, a wedding and corporate event decor and planning company.

**Status:** Phase 0–1 (foundation + backend). The public pages and the admin UI are the next phases; everything they need (data models, CRUD API, auth, uploads, lead capture) is in place.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · MongoDB + Mongoose · Zod · `jose` + `bcryptjs` (cookie sessions) · `sharp` (image pipeline) · Cloudflare R2 or local disk · Resend (email) · Cloudflare Turnstile · Docker Compose + Caddy.

> Next.js 16 has breaking changes from older versions (for example `middleware` is now `proxy`, and `revalidateTag` takes a second argument). See `AGENTS.md` and `node_modules/next/dist/docs/`.

## Run it locally

Prerequisites: Node 20.19+ (22 recommended), Docker Desktop.

```bash
cp .env.example .env              # then edit: AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, Mongo passwords
openssl rand -base64 48           # use the output as AUTH_SECRET
docker compose up -d mongo        # MongoDB on 127.0.0.1:27017 (authenticated)
npm install
npm run seed:admin                # creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD
npm run dev                       # http://localhost:3000
```

In another terminal, verify the whole backend end to end (needs the server and Mongo running):

```bash
npm run smoke
```

With the `R2_*` variables empty, images are saved to `./uploads` and served from `/api/media/...`, and emails are printed to the console, so nothing external is needed in development.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev server / production build / production server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (validators, sessions, rate limiting, image pipeline, storage) |
| `npm run seed:admin` | Create or reset the admin user |
| `npm run smoke` | End-to-end API check against a running server and MongoDB |

## API

All responses are JSON: `{ "data": ... }` (lists add `meta: { page, limit, total }`) or `{ "error": { "message", "details" } }`.

**Public**

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/leads` | Enquiry form (rate-limited, Turnstile + honeypot, emails you and the visitor) |
| GET | `/api/health` | Liveness + database ping |
| GET | `/api/media/...` | Local-disk images (only when R2 is not configured) |

**Auth**: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`

**Admin** (session cookie required; `editor` and `admin` unless noted)

| Resource | Endpoints |
|---|---|
| Events | `GET/POST /api/admin/events`, `GET/PATCH/DELETE /api/admin/events/:id` |
| Services | `GET/POST /api/admin/services`, `GET/PATCH/DELETE /api/admin/services/:id` |
| Testimonials | `GET/POST /api/admin/testimonials`, `GET/PATCH/DELETE /api/admin/testimonials/:id` |
| Leads | `GET /api/admin/leads`, `GET/PATCH /api/admin/leads/:id`, `DELETE` (admin only), `GET /api/admin/leads/export` (CSV) |
| Media | `POST /api/admin/media` (multipart `files`, `folder`), `DELETE /api/admin/media` |
| Settings | `GET/PUT /api/admin/settings` |
| Users | `GET/POST /api/admin/users`, `PATCH/DELETE /api/admin/users/:id` (admin only) |

List endpoints accept `page`, `limit`, `q` (search) and resource filters (events: `status`, `category`, `city`, `featured`).

### How uploads work

`POST /api/admin/media` validates each file is a real JPEG/PNG/WebP/AVIF image, auto-rotates it, strips metadata, and stores WebP + AVIF at 640 / 1280 / 1920 px (never upscaled) plus a tiny blur placeholder. It returns image objects that you embed in an event, service or testimonial when saving it. When an image is removed from a record, or the record is deleted, its files are deleted from storage too.

## Security notes

- Passwords are hashed with bcrypt (12 rounds); login is rate-limited per IP and per email and runs a hash comparison even for unknown emails.
- Sessions are signed HTTP-only cookies, re-checked against the database on every admin request, so disabling a user or changing their password signs them out everywhere immediately.
- State-changing admin requests from another origin are rejected (CSRF).
- Uploads are decoded and re-encoded (never stored as sent); storage keys are validated against a strict pattern.
- CSV export neutralises spreadsheet formula injection.
- MongoDB is published on `127.0.0.1` only and the app connects as a least-privilege user.

## Deploying to a VPS

1. Point your domain's DNS at the server (Cloudflare proxied is fine). Open ports 80 and 443 only, plus SSH by key.
2. `cp .env.example .env` and set real secrets, `DOMAIN`, `NEXT_PUBLIC_SITE_URL`, and (recommended) the R2, Resend and Turnstile values.
3. `docker compose up -d --build`. Caddy obtains HTTPS certificates automatically.
4. Create the admin once. Mongo listens on the server's `127.0.0.1:27017`, so from the checkout on the VPS run `npm ci && npm run seed:admin` (with `MONGODB_URI` in `.env` pointing at `127.0.0.1`, as in `.env.example`). Remove `ADMIN_PASSWORD` from `.env` afterwards.
5. Schedule `scripts/backup.sh` with cron (nightly) and test a restore.

## Roadmap

- [x] Phase 0–1: scaffold, Docker, models, validators, auth, CRUD API, uploads, leads
- [ ] Phase 2: admin panel UI
- [ ] Phase 3: public website (home, services, portfolio, event pages, enquiry form, SEO)
- [ ] Phase 4: production hardening (monitoring, backups tested, analytics)
