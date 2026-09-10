# Production security notes

The static prototype includes client-side validation, CSP, noindex on private/admin pages, safer URL handling, 2FA/session UI and hosting header recipes.

Before real accounts/payments are enabled, the backend must enforce: authentication and authorization on every private/admin route, password hashing (Argon2id/bcrypt), server-side rate limits, CSRF protection where cookie sessions are used, secure HttpOnly/SameSite cookies, email verification tokens with expiry, server-side file validation/storage rules, audit logging, 2FA secret storage, session revocation, backups and restore tests.

Never rely on localStorage or hidden frontend controls for access control.
