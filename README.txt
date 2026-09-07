TEHNIKA v2.13

MOBILE NAVIGATION
- Removed the duplicate "Обяви" tab from the bottom navigation.
- Bottom navigation is now:
  Начало | Любими | Добави | Чат | Профил
- "Начало" uses a modern house icon instead of a search icon.
- Active tab is clearer with blue text/icon and a tiny discreet active marker.
- The Add control stays integrated in the navigation bar, not protruding.
- Tapping the already-open main tab again scrolls that page to the top.

MOBILE HEADER
- The former Favorites heart in the top header is replaced by Notifications.
- Mobile header is now intentionally:
  logo | search | notification bell
- The bell shows a compact unread-count badge only when unread notifications exist.
- Desktop header behavior remains unchanged because desktop does not use the bottom mobile navigation.

PROTOTYPE NOTE
- The unread counter is local prototype state. Supabase/backend will later provide the real unread count.
