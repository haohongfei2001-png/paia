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
