# Uredi — development workflow

The production website is **https://uredizadoma.bg**. Do not deploy this branch to production automatically.

## Branches

- `main`: previously committed reference; do not assume that it is the live hosting snapshot.
- `development`: isolated development and testing. Merge only reviewed changes after staging checks.

## Source of truth (7 November 2026)

The latest hosting snapshot supplied by the owner was `7.11.26.zip`. It includes production user-uploaded listing photos, old backup ZIPs, and diagnostic scripts. **Never upload the unfiltered archive to this public repository.** Sensitive configuration lives outside the web root at `/home/uredizad/uredi-config.php` and must never be committed.

This branch currently contains the old code inherited from `main`; a new, sanitized snapshot must be imported before functional development. Do not claim the branch matches production until that import has been confirmed.

## Environments

- Production: existing Jump.BG hosting and live database; leave unchanged until release approved.
- Staging: a separate test domain/subdomain, isolated credentials, and an isolated database; no emails or push notifications to real users, no production payments.
- GitHub Pages: static UI previews only. It does **not** run PHP, `.htaccess` routing, server sessions, or the production API.

## Release checks

1. Inspect diff, verify no secrets or personal uploads.
2. Lint HTML, CSS, JS, PHP; check links, image URLs, accessibility, mobile layout.
3. Test login, registration, password reset, admin 2FA, ads CRUD, photos, chat, favorites, filters and promotions against staging data.
4. Test the fallback/restore plan and take backups of code + database before deployment.
5. After user approval, deploy only the reviewed changed files to production and perform smoke tests.

## Brand refresh scope

Keep the existing marketplace features, endpoints and listing data. Redesign the homepage and responsive layout, using actual listing data. Do not include the illustrative mockup's fake products, prices, or images in production.
