TEHNIKA v2.15

MOBILE / NAVIGATION
- Keeps the v2.14 mobile notification-bell visibility fix.
- Adds unread-count badge to the bottom "Чат" tab.
- Corrects active bottom-navigation state, including Favorites.

NOTIFICATIONS
- Filters: Всички / Съобщения / Цени / Обяви / Система.
- "Маркирай всички като прочетени".
- Bell unread count updates with read state.

SEARCH
- Empty focused search field can show up to 5 recent searches.
- Recent searches are stored locally and can be removed individually or cleared.
- No filter state is written to URL beyond the normal search query.

TRUST
- Small "i" next to "Потвърден търговец".
- Opens a compact explanation of what the status means and what it does not guarantee.

CLEANER ACTIONS
- "Моите обяви" uses 3-dot action menus instead of a permanent row of buttons.
- Chat uses a 3-dot menu for Archive / Block / Report.
- Conversations have Active / Archived views.

COOKIES
- cookies.html now contains a preference center:
  Necessary / Analytics / Marketing.
- The profile hub points directly to cookie/privacy preferences.

ACCESSIBILITY PASS
- Skip-to-content link.
- Strong focus-visible states.
- Better aria labels and landmarks.
- Larger touch targets on mobile.
- Dialog/menu semantics and Escape-to-close.
- Reduced-motion support.
- Important state is not communicated by color alone.

STATIC PROTOTYPE NOTES
Unread counts, archives, cookie choices and recent searches use localStorage.
Real synchronization across devices will be connected in the Supabase/backend phase.
