# TOPIC-05.6 Section-aware writing local batch

Base `1d50b2c4` (0.22). Local candidate, not merged, released, installed, CI-admitted or complete TOPIC-05.6. No version/CI/worker/schema change.

## Existing owner increment

Successful qualified Section navigation records only its Topic/Section identity plus current route and presentation intent. Header writing passes that explicit identity through the existing TopicActions composer. Scroll position never selects a writing destination. No explicit Section uses the existing stable default; Root writing can remain unassigned.

CONTINUE_THINKING accepts optional sectionId only with topicId. Within its existing createEntry transaction, the current Topic/layout and exact active nonredirected Section are rechecked before creation; the existing placement writer performs the placement. Explicit stale/removed/wrong-Topic destinations reject without fallback or partial Entry/receipt/history creation. A rename preserves identity. Existing successful receipts return before later destination lookup, so uncertain retries cannot duplicate the committed Entry.

The sole composer retains its draft/IME/pending owner. Leaving the original Topic in its existing picker permanently clears that captured Section and updates the destination text. Unknown ACK retries the full original payload including Section even if draft/selection changes; the acknowledged request cannot close a newer destination/draft. Existing presentation-only workspace remains a preview; this batch does not activate or replace it. The production modal remains the writing owner. Continued-prose presentation and any further approved 05.6 UI work are not claimed complete.

## Evidence

- Genuine pre-change actual store negative: explicit Section rejected INVALID_REQUEST; `/tmp/topic-writing-before.log`.
- Final four whole unit files: 74/74 PASS, 0 skip/cancel; `/tmp/topic-writing-related-final.log`. New owner file has 14 cases (earlier progress incorrectly described its then-13 cases as 14; this receipt uses final actual count).
- Actual tests cover named/default/unassigned destination, missing/removed/redirected/wrong Topic, rename, same receipt after removal, user-created/current-time independent body, original Source immutability, after-placement storage rollback, actual composer IME/draft preservation, cross-Topic text and destination, same-body unknown ACK Topic roundtrip, and route-bound controller selection.
- Independent root_finish review passed before native, with 13/13 then-current new owner cases. Added storage rollback unit later uses the real repository STORAGE_FAILED normalization; its first fixture expected the raw injected exception and failed, retained `/tmp/topic-writing-storage-fixture-before.log`. Full store rollback assertions remain unchanged.
- Final complete native file source/release: 2/2 PASS, 10.42s; `/tmp/topic-writing-native-final.log`. Each uses real Root named Section link -> qualified heading -> header writing -> actual Section rename while draft exists -> real worker commit followed by one controlled lost ACK -> exact retry, single Entry and correct placement. Original Source rows remain identical.
- Cold reload of the existing same-URL Topic route has no Section identity: a new header write uses default while the previously saved Entry stays in its named Section. Separately, the existing strict Topic/Section fragment is loaded and reloaded, then the real header write saves to that explicitly qualified Section.
- Package guard: 11821 checks / 355 resources PASS. Explicit headless source/release, isolated temporary release directory, synthetic local data and no model/provider dispatch. No live account or screenshot-matrix acceptance claimed.

## Preserved failures and fixture corrections

`/tmp/topic-writing-native-first.log`: source reached rename/save/retry successfully but failed the test's unsupported assumption that same-URL cold reload retained a Section fragment; release's initial Root link was absent after direct fixture seeding without a UI notification. `/tmp/topic-writing-native-diagnostic.log` proves the source URL is plain archive.html and its Reader restored valid saved prose. The fixture now reloads the real shell after its canonical seeding, and distinguishes default same-URL reload from the separately tested supported explicit fragment. No timeout increase or runtime workaround. Corrected second full run 2/2 at `/tmp/topic-writing-native-second.log`; final expanded fragment run remains 2/2 above.

Native controlled ACK loss is injected only after the real worker's successful response; it does not fake persistence. Removed/redirected destination and storage failure boundaries are real-store unit evidence, not claimed native UI deletion journeys. No Source reverse-write, second composer, automatic classification requirement or new public route.

## Final tested bytes

- `core/topic-actions.js`: `bea47b9decd04bcabce7feb941e91963334dc23022993460a193d0207a165ec0`
- `ui/topic-actions.js`: `f1ddd29dfc3f4fe2ad7c63e7154ea711e0836e29642f30c1e8d4d08697db46f4`
- `ui/topic-workspace.js`: `9f92322d4d2e9ae6948c86d7fd29b3fbfe9462908fc4ba5397e25cc8cb563c65`
- `tests/topic-section-writing.test.mjs`: `f539f01d3e9289664c6ad3c8828f45b3e52727f1718c831c887ea3746a7aed51`
- `tests/topic-section-writing-chrome-e2e.test.mjs`: `6d54b01045040e7bd3e5a0febc2538fbd5f945dd96eebee75d7be972badbc970`
