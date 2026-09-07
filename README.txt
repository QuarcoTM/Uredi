TEHNIKA v2.18

CHAT FIXES
- If a conversation is open and the user refreshes the page, the same chat remains open.
- Back/Forward restoration also keeps the open chat state.
- A fresh visit to the Chat tab still starts from the conversation list.
- The selected conversation id is stored only in sessionStorage for this prototype.

ONLINE STATUS
- Removed the old duplicate green presence marker.
- Maria now has exactly one green dot, attached bottom-right to her avatar.
- The open chat can still show the text "Онлайн сега", but without a second green dot.

QUICK PRESET MESSAGES
- Existing conversations with message history forcibly remove/hide all old quick/preset message controls.
- The legacy quick-message JS handler was removed.
- Preset messages can later be shown only for a genuinely new empty conversation when the backend is connected.

CACHE
- Service-worker cache version bumped so old chat markup/styles/scripts do not linger.
