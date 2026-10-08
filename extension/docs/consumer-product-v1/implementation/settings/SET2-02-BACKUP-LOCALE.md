# SET2-02 existing-backup locale presentation

Base 5f0370d5. Local implementation and evidence; independent review passed; integration pending. No new export, backup generation, schema, permissions, settings write owner or locale store.

The existing document language attribute remains the sole language source. BackupPanel observes only its change and refreshes marked product copy in its own recovery region. Static recovery mode labels, replace-risk confirmation, limits/privacy explanation, dynamic preview, progress, success and existing error messages render in English or Chinese. User data is never passed through this copy map. Updating the locale does not rebuild the preview, reset the file input, set its confirmation checkbox, change session/integrity/generation, alter mode or dispatch RPC. The prior cancellation/reselection fence remains unchanged.

Two actual owner negative cases failed before the change: English destructive confirmation and version/merge/deletion-fence errors were still Chinese (`/tmp/settings-backup-locale-before.log`). Three dedicated owner cases now cover those states and zh/en round-trip preservation of exact preview/child nodes, session ID, file object, checked confirmation and focused element with zero RPC. Four complete related files passed 34/34, no skipped/cancelled (`/tmp/settings-backup-locale-related.log`, 1.207s).

The original complete Data native file passed 1/1 top-level (source, isolated empty-library restore and isolated release), 17.187s, `/tmp/settings-backup-locale-native.log`. New source/release assertions observe real language-attribute changes to English and back, exact risk/mode text, unchanged preview child nodes/file identity/focus and zero RPC. Session and checked-confirmation identity are additionally asserted in the production-presenter unit; this native run does not claim a separate English destructive replacement was executed. All original recovery, cancellation-held-ACK, library preservation, removed-list and no-network checks remain; no timeout or assertion was relaxed. An attempted fixture edit used a wrong relative path and did not change any file; the native command then ran the stable file successfully. No repeated native run was needed.

Static package guard: 12391 checks / 374 runtime resources PASS (`/tmp/settings-backup-locale-package-final.log`); diff-check PASS. Explicit Playwright 1.63.0, headless synthetic profiles only. No real account/provider/cloud calls. Current post-run source/test SHA-256:

```
614253d71de27ef06a873e1b07a624f37fdd97b4dfb2d2aa62ab8fee64a59c5e  ui/backup.js
5846079dd703629600f97302660fddc80fd91061176a3758cb08029d7e71e494  ui/backup-copy.js
e76b598b02d0af3344ee08eeccdb5d742b407b874312452077dd845f1fad860a  ui/archive.html
4bb4d551d825509ee7f544b34deea93e35ec7a779d9de97c375ec1fadbfc1a10  tests/settings-backup-locale.test.mjs
3f625063764d19c153e241191ff1e231e49e86f9adb8980d7ac4d53d859a51e2  tests/uir-04-data-chrome-e2e.test.mjs
```

This is the existing restore UI locale slice, not full SET2 acceptance, global application localization, whole visual matrix, complete cross-device restore or installed-version certification.

Independent root review passed: product-only copy markers and language observer preserve preview/session/checkbox, issue no RPC, and keep original restore modes and risk meaning. Three complete owner files (settings-backup-locale, settings-backup-session, backup-v081) independently passed 30/30 in 1.789s, `/tmp/settings-backup-locale-root-review.log`.
