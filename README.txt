TEHNIKA v2.40

REAL DATA ONLY

Removed until real backend data exists:
- fake "Потвърден търговец" and "Email потвърден" claims;
- fake online / last-active / response-time statuses;
- fake member-since dates and active-listing counts;
- fake profile counts;
- fake owner statistics: views, favorites, conversations and phone taps;
- fake unread chat counters;
- fake notification counters and fake notification events;
- fake relative published-time / remaining-days counters in My Ads.

Kept:
- neutral seller type "Търговец" (not a verification claim);
- structural demo listings/chats required to test the frontend;
- real local user actions such as favorites/follow/block.

When Supabase is connected, verification, presence, unread counts, stats and
notifications return only when backed by real data.
