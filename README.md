# ChandranganXSumit Navratrotsav

Navratri prize & participant management system for the ChandranganXSumit Navratrotsav event.

React (Vite + TypeScript + Tailwind) frontend, PHP 8 REST API, MySQL database, and a WebP photo
pipeline. Built to deploy on Hostinger shared hosting with no permanently running Node server.

## Features

- **Admin dashboard** — participant totals, per-group prize counts, today's registrations.
- **Age groups** — create, edit, reorder, deactivate (deletion blocked while participants exist).
- **Add participant** — one guided form: name, age group, prize section (1st/2nd/3rd), photo.
  Prize placement is decided by *where* the participant is added; there is no separate
  "assign prize" step.
- **Duplicate detection** — live suggestions while typing; three server-verified levels:
  - `exact` — same name + group + prize → block (`duplicate_exact`)
  - `group` — same name + same group, different prize → confirm before adding
  - `other` — same name in another group → confirm before adding
- **Idempotent entries** — each logical entry carries a `request_id`, so a double-tap or network
  retry can never create two participants.
- **Participants** — debounced search by name / participant ID / age group, pagination,
  detail view with photo, registration history and delete (with confirmation).
- **Results** — public read-only results page (`/results`) and an admin view of the same data.
  The public payload exposes no IDs, no emails, no admin fields.
- **Settings** — change admin password.
- **Security** — session cookies (HttpOnly, SameSite=Lax), CSRF tokens on unsafe methods,
  login rate limiting (8 attempts / 15 min), server-side input validation, hardened uploads
  (MIME whitelist, server-side re-encode to WebP, randomized filenames).

## Project structure

```
CHANDRANGAN_NAVRATROTSAV/
├── frontend/          React + Vite + TypeScript + Tailwind (dev only; builds to static files)
├── backend/           PHP 8 REST API (uploaded as public_html/api/)
│   ├── index.php      Route table
│   ├── router.php     Dev-server router
│   ├── config/        config.php (+ optional config.local.php for credentials)
│   ├── src/           App code (Core, Controllers, Services)
│   ├── storage/       Rate-limit + logs (must stay writable, never web-readable)
│   └── uploads/       Participant photos (WebP + thumbnails)
├── database/
│   ├── schema.sql     Tables, indexes, foreign keys
│   ├── seed.sql       Admin login + 5 age groups + 32 demo participants
│   └── generate_demo_photos.php   Generates placeholder WebP photos for the demo data
└── deploy/
    └── public_html.htaccess   Root .htaccess for production (rename to .htaccess)
```

## Local development

Prerequisites: PHP 8.1+, MySQL 8 (or MariaDB), Node 20+.

### 1. Database

```bash
brew services start mysql          # macOS; use your platform's equivalent
mysql -u root -e "CREATE DATABASE navratrotsav CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root navratrotsav < database/schema.sql
mysql -u root navratrotsav < database/seed.sql
```

Optional demo photos for the seeded participants:

```bash
php database/generate_demo_photos.php
```

### 2. API server

```bash
NAV_ENV=development php -S 127.0.0.1:8080 -t backend backend/router.php
```

Check it: <http://127.0.0.1:8080/api/health>

Database credentials default to `root` / empty password on `127.0.0.1` with database
`navratrotsav`. To override, create `backend/config/config.local.php`:

```php
<?php
return [
    'db' => [
        'host' => '127.0.0.1',
        'name' => 'navratrotsav',
        'user' => 'root',
        'pass' => 'your-password',
    ],
];
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173> — Vite proxies `/api` to `http://127.0.0.1:8080`.

### 4. Useful commands

```bash
cd frontend
npm run build   # type-check (tsc) + production build into frontend/dist
npm run lint    # oxlint
```

### Admin login

| Username | Password        |
| -------- | --------------- |
| `admin`  | `Navratri@2026` |

Change it in **Admin → Settings → Change Password** after your first sign-in.

Routes: `/login`, `/admin` (dashboard), `/admin/age-groups`, `/admin/participants`,
`/admin/participants/new`, `/admin/results`, `/admin/settings`, `/results` (public).

## Deploying to Hostinger (shared hosting)

The production site is fully static + PHP: the React build is served from `public_html`,
and the API is mounted at `public_html/api`. **No Node process runs in production.**

### Step 1 — Create the database (hPanel)

1. Hostinger **hPanel → Databases → MySQL Databases**.
2. Create a database (e.g. `u123456_navratrotsav`) and a user; note the **name, username and password**.
3. Open **phpMyAdmin**, select the database, then **Import** → upload `database/schema.sql` → Go.
4. Repeat with `database/seed.sql`.
5. Optional: run `php database/generate_demo_photos.php` locally first so the demo photos exist,
   then import nothing — photos are just files (next steps).

### Step 2 — Build the frontend

```bash
cd frontend
npm install
npm run build          # produces frontend/dist/
```

### Step 3 — Upload files (File Manager or FTP)

Upload so the layout becomes:

```
public_html/
├── .htaccess            ← deploy/public_html.htaccess (rename to .htaccess)
├── index.html           ← frontend/dist/index.html
├── assets/              ← frontend/dist/assets/
├── favicon.svg          ← frontend/dist/favicon.svg
└── api/                 ← contents of backend/ (the folder itself, renamed to "api")
    ├── index.php
    ├── .htaccess
    ├── autoload.php, bootstrap.php, router.php*
    ├── config/
    ├── src/
    ├── storage/         ← chmod 755 (or 775) — rate limiter + logs must be writable
    └── uploads/         ← chmod 755/775 — photo uploads written here
```

\* `router.php` is only used by the PHP dev server; harmless to leave or delete on the host.

Recommended: zip the two trees locally and upload via **File Manager → Upload**, then extract:

```bash
zip -r dist.zip frontend/dist -x '*.DS_Store*'
zip -r api.zip backend -x '*.DS_Store*' 'backend/config/config.local.php'
```

### Step 4 — Configure the API for production

In `public_html/api/config/` add `config.local.php` (never overwrite `config.php`):

```php
<?php
return [
    'db' => [
        'host' => '127.0.0.1',
        'name' => 'u123456_navratrotsav',   // your database name
        'user' => 'u123456_admin',          // your database user
        'pass' => 'YOUR_DATABASE_PASSWORD',
    ],
];
```

Notes:

- `NAV_ENV` defaults to `production` (debug off) — nothing to set on shared hosting.
- Timezone defaults to `Asia/Kolkata`; override with `'app' => ['timezone' => '...']`.
- Make sure PHP in **hPanel → PHP Configuration** is set to **8.1 or newer**.

### Step 5 — Set permissions

```bash
chmod -R 755 public_html/api/storage public_html/api/uploads
```

(775 if the host runs PHP as a different user.)

### Step 6 — Verify

1. `https://your-domain.com/results` → public results page renders.
2. `https://your-domain.com/api/health` → `{"success":true,...}` JSON.
3. `https://your-domain.com/login` → sign in as `admin`.
4. Add a participant with a photo; confirm it appears under **Participants** and in **Results**,
   and that the file lands in `public_html/api/uploads/participants/`.
5. Open a deep link such as `/admin/participants` directly — the root `.htaccess` rewrites it
   to `index.html` (SPA routing).

## API overview

All responses use the envelope `{"success": bool, "data": ..., "message": "...", "code"?: "..."}`.
Unsafe methods require the `X-CSRF-Token` header (value from `POST /api/auth/login` or
`GET /api/auth/me`) plus the session cookie.

| Method | Endpoint                       | Auth | Purpose                                   |
| ------ | ------------------------------ | ---- | ----------------------------------------- |
| GET    | `/api/health`                  | no   | Health + DB check                         |
| POST   | `/api/auth/login`              | no   | Sign in (rate limited), returns CSRF token |
| POST   | `/api/auth/logout`             | yes  | Sign out                                  |
| GET    | `/api/auth/me`                 | yes  | Current user + CSRF token                 |
| POST   | `/api/auth/change-password`    | yes  | Change password                           |
| GET    | `/api/dashboard/stats`         | yes  | Dashboard numbers                         |
| GET    | `/api/age-groups`              | yes  | List groups with participant counts       |
| GET    | `/api/age-groups/{id}`         | yes  | Single group                              |
| POST   | `/api/age-groups`              | yes  | Create group                              |
| PUT    | `/api/age-groups/{id}`         | yes  | Update group                              |
| DELETE | `/api/age-groups/{id}`         | yes  | Delete (409 while participants exist)     |
| POST   | `/api/age-groups/reorder`      | yes  | Reorder groups                            |
| GET    | `/api/participants`            | yes  | Paginated list                            |
| GET    | `/api/participants/search`     | yes  | Debounced search (`q`, `page`, `per_page`) |
| GET    | `/api/participants/check-duplicate` | yes | Duplicate check (`name`, `age_group_id`, `prize_position`) |
| POST   | `/api/participants`            | yes  | Create (multipart; `request_id`, `force`) |
| GET    | `/api/participants/{id}`       | yes  | Detail + registration history             |
| DELETE | `/api/participants/{id}`       | yes  | Delete participant + photos               |
| GET    | `/api/results`                 | no   | Public results (`age_group_id` optional)  |

Pagination lives in `data.pagination { page, per_page, total, total_pages }`.

## Photo pipeline

1. Client-side the image is capped at 800 px and converted to WebP before upload.
2. The server re-checks the MIME type (jpeg / png / webp only), re-encodes an 800 px WebP
   (quality 80) plus a 320 px thumbnail (quality 72), and stores them under a random filename.
3. Uploads are served from `/api/uploads/...` with an `.htaccess` that disables the PHP engine
   and denies executables.

## Notes

- Duplicate names are intentional in the seed data (e.g. `Rahul Sharma` appears in three
  combinations) so the three duplicate levels can be tested immediately.
- There is no payments, CRM or multi-role system by design — this is a single-admin event tool.
