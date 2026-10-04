# Prompt Reuse surface — CPV1-09.3–09.5

Owner-authorized continuation from PR #144, merged at
`4a66b248e06348721942cefcd10e9eaa14a07cb2`. The approved product contract is
[PROMPT_REUSE_SURFACE](../../PROMPT_REUSE_SURFACE.md); no product redesign.

## Boundaries

The host isolated-world script owns only a static 40px frosted orb with a 44px
interaction target, safe viewport/composer geometry and a closed shadow root.
Personal rows and management render in a **cross-origin extension iframe**.
Shadow DOM alone is not the privacy boundary. Only `ui/prompt-surface.html` is
web-accessible, only on the existing `https://chatgpt.com/*` host. No broader host
permission or generic editor injection. The host script never queries the library.

Every iframe command is checked against extension identity, its exact URL/nonce,
positive frame ID, the browser's current non-incognito ChatGPT tab, consent and
a live top-frame nonce probe. Only explicit query/change/member/copy/insert/close
commands are admitted. Insertion binds to that frame's own current tab and uses
the unchanged provider adapter and exact selected-text/generation revalidation.
Arbitrary pages, forged URLs, stale frames and caller-supplied target tabs fail
closed. No worker-memory token cache is necessary after a worker restart.

## Persistence justification

No IndexedDB version, object store, canonical body store, Backup shape or
migration changes. Existing strictly validated Prompt preferences own all user
work. A new bounded device-only `chrome.storage.local.promptSurfaceV1` preference
holds version 1, open/closed and normalized x/y geometry for ChatGPT. It holds no
text, IDs, drafts, history or library and is excluded from portable Backup.
Missing/invalid metadata falls back to safe geometry. This is the per-site
position/open preference expressly allowed by contract §2.2/§7.2.

Existing zero-member explicit delete still frees the override/pin and capacity;
hide remains reversible. Member-bearing families expose split, never delete.
Split reads eligible historical expressions solely inside the trusted frame for
explicit correction; it writes only the existing do-not-merge preferences.

## Interaction and lifecycle

A ~336px, <=400px card uses internal scroll, quiet light/dark glass and reduced
motion. Text is the normal row content; management appears on hover/focus or
coarse-pointer interaction. Explicit new/edit/save/cancel, pin/unpin, hidden
recovery, independent delete confirmation and subset split use the domain owner.
Pointer drag and keyboard move buttons pin/reorder; complete stored manual order
includes hidden pins. No management/drag action inserts a prompt.

Opening/refresh freezes automatic order. Body-free change notifications remove
stale rows without background reorder or replacing an active editor. Cross-tab
conflicting saves use the existing revision fence and preserve the local edit.
The orb focuses an already-open card; close refuses unfinished edits. SPA changes
retain the card/edit session. Composer loss hides the surface and fails commands
closed until the provider-specific composer returns. Reload/discard restore
saved templates/position and fresh transient state; active draft/caret never
cross tabs or enter storage. No idle polling, page-text scan or reply access.

Insertion is once per selection until explicit refresh, with exact native
read-back required for success. Uncertainty disables the row without retry or
rollback. Clipboard recovery is a separate user action, revalidates current
text and only reports success after browser acknowledgement.

## Validation

The cloud source/release native Chrome suite uses synthetic ProseMirror and real
extension service-worker, IndexedDB, iframe and messaging boundaries. It covers
management and historical-body preservation; selection/Chinese IME/uncertainty;
SPA/reload/worker restart/real tab discard/multiple tabs; light/dark/320px/200%
text/keyboard/coarse/reduced motion; drag geometry and measured idle CPU; and
zero Send, Provider, draft capture, site storage or host-library disclosure.
Existing foundation insertion fixtures remain registered unchanged. Frozen D5
browser registrations retain their original positions; only the new bounded
surface file is added to its own shard. Exact candidate receipts follow after
execution. No old log substitutes for fresh tests.

## Deferred external evidence

`REAL_CHATGPT_FINAL_CERTIFICATION = DEFERRED_EXTERNAL_EVIDENCE` (DFG-CPV1-011).
There is no connected authenticated current ChatGPT session with this runtime.
No repeated anonymous probe, private session/profile extraction or developer
operation request to the owner. Synthetic PASS never means real compatibility.
CPV1-09.6 second provider is deferred: no additional minimally permissioned,
actually verifiable composer is available without account intervention.
Human visual acceptance remains an external final product gate; automated
source/release screenshots establish implementation evidence, not owner review.
No Stage 3/B-04 work, public store release or deployment is included.

## Repair and environment evidence retained

- 37207404150: source/release first-click insertion and management passed. A
  background notification could cancel an explicit refresh; serialize refresh
  admission and keep background reconciliation from superseding it.
- 37207606426: hosted Chrome's pipe connection crashed during real tab discard,
  including under a cloud virtual display. 37207713214 switched to the repository's
  existing native Chrome port connection, then exposed the replaced tab ID.
  Restore uses the actual returned tab ID. 37207881126 confirms source/release
  discard/recovery, single surface and separate draft targets. No local browser
  or user profile was opened.
- That run also exposed missing compositionend after cross-origin frame blur.
  Only a subsequent trusted non-composing native insertText event clears a stale
  composition fence; scripted events cannot. The original active-composition
  refusal and native commit/reuse tests remain, plus a forged-input negative test.
- Failed runs remain failures even when their individual screenshots are useful.
  The receipt writer now records FAIL if any earlier subtest failed. Font setup
  installs system CJK fonts for actual Chinese screenshot legibility; no remote
  fonts or font requests are added to the extension.

## Engineering candidate receipt

- Runtime candidate: `044ad4500fa182d725cd9dbc341712be8beb63bb`.
- [Fresh complete engineering gate](https://github.com/haohongfei2001-png/paia/actions/runs/37208317427).
- Source/release insertion and surface browser matrices: 40 native Chrome tests
  including parent suites; no skips. All fixture content is synthetic. Original
  foundation active-IME refusal, exact code/Unicode/selection and no-send checks
  remain, including the forged-input negative regression.
- Owning domain/service/security/layout tests: 64 PASS. Full unit: 1,739 PASS
  locally and in the current cloud run. Adapter contracts: 102 PASS; privacy: 59
  PASS; all zero failures/skips. Source guard: 11,350 checks / 291 resources;
  release guard: 10,915 checks / 284 runtime resources, RELEASE_PRODUCT_GUARD_PASS
  with 308 packaged files. Artifact `11305003369` contains both variant receipts
  and ten actual overlay screenshots.
- Runtime assets SHA-256:
  `e6551aba36f98131c854381591ba2af59985c9efeb6d27aa618307f0f9345bd5`.
  Definition: sorted paths under adapter/content/background/core/ui/icons with
  JS/HTML/CSS/PNG/SVG suffix, plus manifest.json; hash relative-path + NUL + bytes
  + NUL. Receipt/architecture documentation changes do not change this digest.
- Actual production-frame screenshots cover light/dark at 1280 and 320 CSS px,
  long internal scrolling and 200% text. CJK glyphs, native controls clearance,
  quiet frosted appearance and visible focus are checked directly in exported
  pixels. This engineering review does not impersonate final owner acceptance.
- Existing Source/Working Input/Thought authority, override capacity/delete and
  strict Backup remain unchanged. No object store, DB version, provider host or
  D7/AppShell/Reader/Thought/AI Context page implementation changes.
- Rapid management is serialized through committed refresh, including disabled
  editor fields during save. New-edit actions cannot replace an unfinished edit.
  Frame/geometry and transient edits stay tab-local; only approved preferences
  cross tabs. Neither background rank nor notifications reorder the open list.

ENGINEERING_COMPLETE: all current automatic gates above passed. The receipt-only
commit changes no runtime/test/workflow files. The architecture note changes the
packaged documentation, so the current package was rebuilt and validated locally;
its package-source fingerprint is
`d2adf45dd630fb98644aeb65da00d54fe70ef0c69986e5b658bc2117178ea2b0`.
The next engineering action is safe integration with fresh main and PR checks. The next
external closure is CPV1-09.7 real-site insertion/final visual acceptance; no
09.6 arbitrary-site implementation or Stage 3 work is implied.

## Exact-main stale-failure follow-up

PR #145 integrated as `945da10efbcb1eaefe781fcf2b5f1276efdd2979`, identical tree
`f8130ca7e6090fb058748b1cdbe52f0d327cfbe1` to reviewed head. Candidate 37208317427,
receipt-head 37208783164 and PR integration 37208797669 passed. The subsequent
exact-main browser run 37209124864 failed in source: an older background query's
MEMORY_STALE failure could clear rows rendered by a newer explicit refresh.
Only successful callbacks had the request-epoch check. The release variant passed;
the overall main run remains failed evidence.

Apply the same epoch guard to failures. A deterministic browser regression holds
one background query, completes a newer explicit refresh, then releases the old
failure and asserts the exact current row identities/status remain unchanged.
No retries, data mutation, timer budget increases or weakened assertions. Follow-up
source/release browser count becomes 42 including parent suites. All management,
IME, privacy, durable schema and external-certification boundaries remain intact.
