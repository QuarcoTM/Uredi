TEHNIKA v2.27

MESSAGES / ARCHIVE FIX
- "Активни" now shows only active conversations.
- "Архивирани" now shows only archived conversations.
- The previous bug was caused by .conversation { display:flex } overriding the HTML hidden attribute.
- The fix now uses both hidden + explicit display state, so old conversations cannot remain visible in the wrong tab.
- The selected tab is remembered locally.
- Conversations archived from the 3-dot menu stay archived after refresh in this static prototype.
- Archiving switches to the Archived tab immediately.
- Undo moves the conversation back to Active.
- Empty states were added for both tabs.

Real archive state will later be stored in Supabase instead of localStorage.
