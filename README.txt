TEHNIKA v2.31

- Оправено неправилното рязане на снимките в категориите.
- Иконите вече стоят центрирани, с contain вместо crop.
- Добавен е по-мек фон и вътрешен padding, за да не се лепят по ръбовете.
- Cache-bust до v2.31.

TEHNIKA v2.30

FINAL FRONTEND CLEANUP
- All logos are clickable.
- Broken washer image reference fixed.
- Missing admin favicon fixed.
- Main logo optimized for web.
- Dynamic user/localStorage content is escaped before HTML rendering.
- Local URLs reused from browser storage are validated.
- Invisible control characters are removed from editable text.
- Raw alert dialogs replaced with in-app/admin feedback.
- Admin error monitor uses safe DOM rendering.
- target=_blank links use noopener/noreferrer.
- Referrer policy added.
- Mobile horizontal overflow guard added.
- Static bundle scanned for obvious secrets/debug code/broken links/assets.
- Service-worker cache bumped to v2.30.

See SECURITY_v2.30.md for the audit summary.
