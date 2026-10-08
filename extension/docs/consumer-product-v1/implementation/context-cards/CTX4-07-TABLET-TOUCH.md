# CTX4-07 — existing tablet touch controls

Base `6cd9e5fc`. This local follow-up reuses the existing CTX4-02 populated Home and Info owner in the original six-case `context-cards-chrome-e2e.test.mjs`; each original case retains its 180000 ms budget and prior assertions. No external connection, processing provider, access authority, journal, schema or worker activation is added.

At 768 CSS pixels, the browser emulates mobile touch and explicitly verifies `matchMedia('(pointer: coarse)')`. Each actual touch target is checked under that media state, and the browser-delivered `touchstart` must be trusted. Global/card capsules retain at least 44px height; Info's menu summary is at least 44×44px and visible. Capsule interaction only toggles the existing desired access, the separate card link opens Info, and the actual menu and Back work. Stable Item values/counts and protected Source/Input/Thought snapshots are unchanged; other desired flags are preserved and the original Info flag is restored. This is browser touch emulation, not physical tablet or system IME evidence.

## Real defect and bounded fix

The initial complete file produced 3 PASS / 3 FAIL, `/tmp/context-coarse-native.log` (110.568606 s). Both new coarse cases failed the unchanged 44px expectation. A discriminating source case recorded actual global capsule height/min-height 36px, while the four card capsules were 44px: `/tmp/context-coarse-geometry-before.log` and `07-tablet-coarse-sizes.json`. The existing `.context-access.global` selector outranked the later coarse `.context-access` selector. The only product edit adds `.context-access.global` to that existing coarse rule; fine-pointer layout and all other behavior remain unchanged. Independent CSS review approved this specificity correction.

## Preserved fixture failures

- The initial file's old CTX4-01 source case also failed while attempting to leave an erased field; its saved failure view showed a refused-save notice. This predates the new touch segment. A later single source run passed (`/tmp/context-erase-diagnostic.log`, 10.825111 s), which does not prove the original cause. Waiting for a durable recovery draft does not establish that the 750ms UI autosave has not yet committed. The narrowly stated “before first commit” fixture now pauses only that UI clock, uses real worker draft RPCs, proves zero put dispatches and zero saved Items, clears the real draft, and resumes in finally before the original Back/no-resurrection assertions. Production autosave timing is unchanged. This is a deterministic fixture precondition, not a claim that a product save defect was repaired.
- `/tmp/context-coarse-diagnostic.log` is an environment setup failure (a diagnostic command omitted the browser dependency/headless environment), not a product result.
- After the CSS correction, `/tmp/context-coarse-native-final.log` retained 4 PASS / 2 FAIL. The subsequent discriminating menu diagnostic (`/tmp/context-coarse-menu-diagnostic.log`) showed `coarse:false`, 36px and opacity 0 after entering Info. `/tmp/context-coarse-complete.log` preserved the same missing-media precondition with a strict explicit assertion. Tests now establish mobile/coarse on each actual page owner before measurement; no failed action is retried and the 44px/visibility/trusted-event assertions remain. The touch-menu screenshot avoids the general screenshot helper's mouse movement. Cross-owner emulation persistence is not claimed.

Final whole-file results, exact hashes and visual inspection are recorded below when completed. No full CTX4-07/private-reference/real-connection completion is claimed.

## Final local verification

The original complete source/release file passes **6/6**, zero failed/skipped/cancelled, **71.527488584 s**, `/tmp/context-coarse-owner-complete.log`. Original protected snapshots, connection-unavailable behavior, edit/IME/recovery/Topic/history cases remain. This binds the final UI-clock fixture and explicit per-owner emulation, not prior incomplete runs. Parse and diff checks pass.

- `ui/context-cards.css` SHA256: `7d10f19a9213870055d50fdda8afa5ccc9826d9f250d2645c27291566448580c`
- `tests/context-cards-chrome-e2e.test.mjs` SHA256: `5115dfc75b61953ec3a56d868b7bb8fc655b78d4904824644b5bc38e69774dca`

Actually inspected release screenshots (768×900, synthetic data): `work/ctx4-01/release/ctx4-02/07-tablet-coarse-info-menu.png` (SHA256 `195f6a1b999d61d80afd952eea7291921207bc3cf9afd18f2c247c5b492807bb`) and `07-tablet-coarse-home.png` (SHA256 `2a83cb48ac3ce11967288a53c208031509d38e490b3a03bea25fabd5f47ca67e`). The open menu, item text, Back and Home controls remain visible without observed clipping. Browser-native touch highlight is retained. This is no exact private-reference design comparison. Source/release numeric evidence is in each `ctx4-02/07-tablet-coarse.json` and `07-tablet-coarse-sizes.json`; image artifacts are local and are not committed.

Independent review approved the added touch scope and one-selector CSS specificity fix. Final independent fixture review approved the per-owner coarse setup and narrowly paused erase-before-first-commit UI clock; the reviewer verified the two source hashes and complete 6/6 log. This batch is not part of the already frozen 0.28 or 0.29 certification; coordinator integration remains required.
