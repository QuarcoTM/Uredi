TEHNIKA v2.29

ARCHIVED CHAT
- Removed the misleading demo text "Разговорът е приключен."
- Archive does NOT close a conversation.
- An archived conversation can still be opened and used.
- A small banner explains the archived state.
- Sending a new message from an archived chat automatically moves it back to "Активни".
- A truly blocked/closed conversation is a different state and disables sending.

RAPID REFRESH / BROKEN UNSTYLED PAGE
- Fixed the service-worker fallback bug.
- Previously, if CSS/JS failed during several rapid refreshes, sw.js could return index.html for that asset request.
- Safari then received HTML where CSS/JS was expected, causing the unstyled page and giant SVG icons.
- Static same-origin assets now use cache-first + background refresh.
- HTML navigation uses network-first + cached-page fallback.
- CSS/JS/images can never fall back to HTML.
