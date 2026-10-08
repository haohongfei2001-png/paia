# Original single-Input protection notification qualification

Base: 4ff675d6e957047664e323b17d5b4031b2702f31 (main 1d50 tree). Main Full 37765744689 browser4 failed the existing VS-04 unfinished-IME Source test. Artifact 11546455982 `reader-purge-ime/failure-state.json` shows Original opening, then `ARCHIVE_CHANGED` with `FILTER_PROTECT`, then modal close. CAPTURE, initial filter and SET_ENABLED notifications had already occurred. Raw evidence remains at ROOT/work/topic022-main-browser4-failure.log and /tmp/vs04-hosted-failure-state.json. Capture pause did not prevent the user's later edit-protection notification.

`protectUserInput` retains filter intent; it does not edit immutable Source. The UI now attempts qualification only for FILTER_PROTECT while the actual Original owner displays one complete Input. It uses the existing trusted Original page API and compares the exact target, complete records (identity, bytes and metadata), coverage, availability and title. Only an identical result advances the copy generation while retaining existing nodes. Missing/changed/partial/read-failed results close. Conversation/paginated scopes do not gain this exception. Every other invalidating cause, including purge/removal/restore, retains immediate modal close. Active-owner and protection serial checks prevent pending reads from reopening a closed dialog or closing a replacement.

Independent reviews: settings_review and root, no blocking finding. Final units: 22/22 across complete original-protection-refresh, d5-original-presentation and dvn-original-sequence files (/tmp/vs04-protection-related-unit.log). Coverage includes identity/body/scope changes, partial/unavailable results, pending first read, consecutive notifications, closed/replaced owners, and copy using only the newly qualified generation. Existing complete Reader native: 8/8 PASS in 62.7 seconds (/tmp/vs04-protection-full-native.log); source and assertions unchanged, including the original 60-second IME case. No hosted rerun or installed-version acceptance is claimed.

Runtime/native SHA256 at the completed run:

- ui/original-surface.js: 6e5588ff7a84f4ef822415778b7bab9663fc1ff64610c10af59cd5d8e764bfaf
- ui/archive.js: 6d14a63fcbf4c51a862128c840b5e96eab9d8925b26db2ed17310c77554bd56b
- tests/cpv1-02-4-reader-chrome-e2e.test.mjs: c525771ad573f5f6c0e506d041438532017d283113d9ced4392ba80dafd4f91e

This is an Original read-only continuity correction, not blanket filter-event immunity, permission expansion, new capture, provider connectivity or a Source write.
