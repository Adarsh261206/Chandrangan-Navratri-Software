# Hostinger — fast deploy (Upload your website files)

The GitHub "Deploy from GitHub" option only publishes a **static frontend**.
This app also needs the PHP API + MySQL **on the same domain**, so use
**Websites → Import website → Upload your website files** instead.

## 0. Build the package (already done)

```bash
cd frontend && npm run build
# assemble → deploy/navratrotsav-site.zip  (see below for the layout)
```

`deploy/navratrotsav-site.zip` contains everything for `public_html`:

```
index.html, assets/, favicon.svg, icons.svg
.htaccess            ← SPA routes + /api passthrough
api/                 ← the PHP backend (index.php, src/, config/, storage/, uploads/)
database/            ← schema.sql + seed.sql (blocked from the web by its own .htaccess)
```

## 1. Create the site + database

1. hPanel → **Websites → Import website → Upload your website files** → pick your domain.
2. hPanel → **Databases → MySQL Databases** → create a database + user (note name/user/password).
3. **phpMyAdmin** → select the DB → **Import** → after upload, pick
   `database/schema.sql` from inside `public_html` (it ships in the zip) → Go,
   then repeat for `database/seed.sql`.

## 2. Upload

File Manager → `public_html` → upload `deploy/navratrotsav-site.zip` → **Extract**.
(The zip's contents must land directly in `public_html` — `index.html` next to the `api/` folder.)

## 3. Configure the API

Create `public_html/api/config/config.local.php` (never edit `config.php`):

```php
<?php
return [
    'db' => [
        'host' => '127.0.0.1',
        'name' => 'u123456_navratrotsav',
        'user' => 'u123456_admin',
        'pass' => 'YOUR_DATABASE_PASSWORD',
    ],
];
```

## 4. Permissions + PHP version

- hPanel → **PHP Configuration** → PHP **8.1+** (8.2/8.3 fine).
- `chmod -R 755 public_html/api/storage public_html/api/uploads` (775 if uploads fail).

## 5. Verify

- `https://yourdomain.com/api/health` → JSON with `"ok": true`
- `https://yourdomain.com/results` → public results render
- `/login` → sign in (`admin` / `admin2`, password `Navratri@2026`)

## Why not "Deploy from GitHub"?

That flow runs only `npm run build` in `frontend/` and serves static files on a
`*.hostingersite.com` subdomain — no PHP, no MySQL, and the frontend's hardcoded
same-origin `/api` base would have nothing to call. Use it only for UI previews.
