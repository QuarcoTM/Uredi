# QA v2.48

Passed:
- JS syntax: app-v248.js, monetization-v246.js, sw.js.
- 0 broken local HTML src/href references.
- Profile visible label is "Промотиране на обяви".
- Dedicated page has available activation, active promotion, purchase-entry and history regions.
- Purchase button is controlled by paidAvailable(), so it stays hidden during FREE BETA.
- TOP/VIP active counts are calculated from actual listing promotion state.
- Available counts are read from the real local prototype wallet / bonus state, not hard-coded demo numbers.
