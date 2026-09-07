TEHNIKA v2.11

PASSWORD FLOW
- Profile no longer uses "send password reset link" as the normal password-change method.
- Logged-in change password flow is:
  old password -> new password -> confirm new password.
- "Забравена парола?" stays available before login and from the explicit link.
- forgot-password.html sends an email-reset request UI.

OTHER ACCEPTED FEATURES
- Exact model / product-code search support and exact-match priority.
- Rules-based chat warning for card data, PIN/CVV/SMS codes and suspicious external links.
- Removed listings show the moderation reason and allow "Поискай преглед".
- Moderation admin has a sample appeal row.
- Profile has "Изтегли моите данни" and protected "Изтрий акаунта" controls.
- Professional seller profile has a separate legal/trader-data block.
- Admin Maintenance mode prepared: browsing remains available, posting/new messaging is disabled.
- Admin backup/restore checklist prepared.

BACKEND NOTES
The following are frontend-ready but become real with Supabase/backend:
- verifying the old password and changing auth password;
- sending the actual reset email;
- exporting real account data;
- irreversible account deletion;
- server-side moderation appeal workflow;
- server-side chat safety enforcement / audit as legally appropriate;
- real maintenance enforcement;
- real automated backups and tested restore procedures.
