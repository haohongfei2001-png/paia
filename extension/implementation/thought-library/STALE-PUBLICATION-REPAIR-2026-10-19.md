# Refuse stale Topic reading publication

## Original evidence

Exact main `e0516f06b2f12b15bf8ca8680d4e58e8ca6a1427`, tree `32d958861d0cec31b1a8cdef0b13d01080528c05`, failed [Full 39204340989](https://github.com/haohongfei2001-png/paia/actions/runs/39204340989) at Browser 7 job `117903814099`. The one failed leaf was the original UX-R3 Reader → whole Input → two Topics → independent edit → restore responsive matrix, `ux-r3-thought-chrome-e2e.test.mjs:40:162`.

The original stale-label wait and exact independent-body assertion had passed. The later `.entry-stale` click timed out. [Artifact 12165119669](https://github.com/haohongfei2001-png/paia/actions/runs/39204340989/artifacts/12165119669), zip SHA256 `a185cfbb871fce99406d6cbd7934e700fb6c67806ae83a9b75a38161662f34af`, shows the exact independent Thought and archive-update action in `topic-light-1440.png`; the next `topic-light-1024.png` and subsequent responsive screenshots show no Thought, only two pending-continuation messages. The diagnostic retains Topic B with no open dialog or error text. The original job log SHA256 is `19c81412c159d9a6712b41a9142d26e591d74f6f2ca3a1ed66637fe1c7a123ed`.

## Proven production-owner defect

`ContinuousTopicReader.invalidate()` retires body authority and clears page metadata and Sections. An empty invalidated reader could nevertheless return true from `hydrateWindow()`. `TopicController.renderTopicReader()` did not reject that stale state; `topicPageFromReader()` could fall back to the previously admitted Topic without a qualified Section kind, allowing an empty legacy publication to replace the admitted Thought. A second refusal of the original bounded initialization retry reaches this state. Invalidation across the metadata, generation-check or handoff await could likewise publish a retired snapshot.

This is a deterministically reproduced defect consistent with the failed screenshots. The original run did not record its reader/RPC state. The unique trigger and source of that run's refusal remain unproven; its failed result is retained.

## Narrow repair

Only the existing `renderTopicReader()` runtime owner changes. Its route, window, view, Root cue, publication and draft guards remain. An owned stale reader now refuses publication before hydration and at the existing asynchronous publication boundaries. Newly detected stale refusal uses the original tracked-entry cleanup, rechecks ownership, and reaches the existing read-failure/retry UI. The original bounded retry does not gain a third automatic request.

A genuinely qualified empty Section remains valid. Dirty IME drafts are retained; original `LibraryEntryEditor.checkTracked` still clears purged Source text and removes retired Entries. A stale earlier route, serial or reader cannot publish into a newer owner. No stale indicator, native assertion, timeout, generation fence, provider/privacy rule, workflow or dependency is relaxed.

## Local verification

The original TopicController was verified against exact main Git blob `6600a6d0ed81f592b4a0a9275189453dd72da0cc`; original ContinuousTopicReader against `5bdbc9e8eb3a116ebea6176b72026c9ad6bb3366`. The native browser oracle remains unchanged at Git blob `e1456e09b12ed391efa4f6979c6394092cd40f4a`.

The deterministic controls execute actual `TopicController`, `ContinuousTopicReader` and tracked-entry cleanup; transport, DOM paint and animation timing are synthetic.

- Original runtime: 12 controls, 4 passed and 8 real failures, zero cancellations/skips, 171.947455 ms.
- Repaired runtime: the same 12 controls all passed, zero failures/cancellations/skips, 184.008360 ms.
- Related actual-owner group: 114/114 passed, zero failures/cancellations/skips, 1944.781821 ms; includes the 12 new controls.

Run from `extension/`:

```sh
node --test tests/topic-stale-publication.test.mjs tests/topic-ai-paint-ownership.test.mjs tests/topic-section-pending-publication.test.mjs tests/topic-selected-section.test.mjs tests/topic-ai-reading-reflow.test.mjs tests/topic-ai-section-prose.test.mjs tests/topic-ai-section-ime-handoff.test.mjs tests/topic-ai-section-draft-handoff.test.mjs
```

Frozen evidence SHA256:

- Original RED log: `adb60a2a24d3822c7419277be9e5fc8814e59706994ed6389eb4f525edd3052f`
- Fixed 12-control log: `a29ff94171a01588ebb90b022489e9fc6b08af613c30c49a39f59484d9a1c0ef`
- Related 114-control log: `6ab575ca3da5382c9b065b37166805811b0e7042752f00f966112c261120ca7c`
- Repaired `ui/topic-workspace.js`: `1b1cc33417467c250f828b5a71be8982c8172282911fc4802eb6ba366536eec7`
- New `tests/topic-stale-publication.test.mjs`: `5f0618945881d99cb5168dd7bc580a2ba15be7ede8ca42db0949044aa5f40334`

No browser was executed for this local repair. Original native source/release verification, changed-head complete gates and subsequent exact-main certification remain required. This receipt does not establish installation, live-provider quality, or whole-programme completion. Product version is coordinated with the eventual coherent integration.
