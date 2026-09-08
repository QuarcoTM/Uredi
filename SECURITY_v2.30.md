# v2.30 cleanup / security audit

- Broken internal links: 0
- Broken local image references: 0
- Non-clickable logo images: 0
- HTML pages without favicon: 0
- Obvious secret-pattern hits in static package: 0
- Debug-code hits: 0
- Package-manager manifests: 0

## Completed
- All visible logo images are clickable.
- Missing washer image reference repaired.
- Admin sold archive favicon added.
- Main logo resized/optimized for web use.
- Dynamic HTML from localStorage/filter inputs is escaped before rendering.
- Same-origin URLs derived from localStorage are validated before reuse.
- User-editable text fields strip invisible control characters.
- Raw JavaScript alert dialogs replaced with app/admin feedback.
- Admin Health error list now renders with textContent rather than interpolated HTML.
- target=_blank links receive noopener/noreferrer.
- strict-origin-when-cross-origin referrer policy added.
- Mobile horizontal-overflow guard added.
- Service-worker cache bumped to v2.30.

## Backend-only security still required after Supabase
- Supabase Auth and verified-email enforcement.
- Row Level Security on every user-owned table.
- Server-side validation and authorization.
- Rate limiting / abuse protection / real CAPTCHA.
- Secure session revocation and account security.
- Secrets only in environment/server configuration; never public JS.
- Production HTTP security headers at the hosting layer.
- Final dependency and backend vulnerability scan.

## Image optimization
- assets/img/logo.png: 765.2 KB → 91.7 KB (384×384)
- assets/img/pwa-512.png: 186.5 KB → 169.6 KB (512×512)
- assets/img/pwa-192.png: 20.3 KB → 19.2 KB (192×192)
- assets/img/home-appliances.png: 139.0 KB → 132.4 KB (420×420)
- assets/img/favicon.png: 5.2 KB → 5.1 KB (96×96)
