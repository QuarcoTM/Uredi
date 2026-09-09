# QA v2.41

- FREE BETA defaults ON; paid services OFF.
- Admin settings supports FREE BETA -> OFF, TEST mode, paid services -> ON with confirmation.
- LIVE mode forces paid services OFF while livePaymentsReady is false.
- Promotions support regular/promo price, start/end datetime, audience, purchase cap.
- Packages add credits to wallet; no automatic activation.
- Admin manual grant/remove validates non-negative wallet.
- New-ad final step keeps free publishing as default and offers optional instant promotion.
- Existing ads receive Promote action only when paid services are active.
- Checkout is test-only until real payment backend is connected.
- Service worker cache bumped to tehnika-v2.41.
