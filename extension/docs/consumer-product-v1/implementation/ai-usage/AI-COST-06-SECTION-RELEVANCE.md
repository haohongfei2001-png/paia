# AI-COST-06: bounded Section-label lexical refinement

## Status and authority

This is an independent, local relevance-predicate slice following the frozen automatic Assist 281 checkpoint. That immutable checkpoint remains preserved. After the owner froze its separate 66-path integration, this new candidate narrowly connected the batch predicate within the active original selector. It changes no permission, session, provider or R3 surface. The two original-source omissions now pass through that real source path; the earlier RED bytes remain preserved.

AI_USAGE_ARCHITECTURE section 8 requires bounded relevant independently permitted Context and retains the current completed-reply, exact cache/currentness and no-full-profile boundaries. AI_USAGE_PLAN's AI-COST-06 remains the owning plan. The owner approved a conservative deterministic local refinement on 2026-10-18, using only the existing independently granted reply and Section-label discovery fields. This is not approval to scan Item bodies, add retrieval providers, grant new fields, or claim general semantic retrieval.

The preceding 281 slice already implements manual Info/Now Section-only discovery and exact full-phrase matching, followed by a separate selected-Item body/qualification grant. It would be incorrect to describe all manual Info/Now selection as missing.

## Pure API and deterministic contract

`matchAssistSectionLabels(reply, labels)` accepts one already-granted current reply string and at most the original Context-read page's 20 already-granted label strings. It accepts no store, Item IDs, body fields, authorization callbacks or caller-supplied matching function. It performs no database/network operations and retains no input text after returning. Its immutable output contains only each array index, MATCH/DEFER, a fixed reason, and bounded local-work accounting. An index never proves Item identity, revision or permission.

- NFKC, whitespace collapse, trim and locale-independent lowercase are deterministic. Accents are preserved; canonically equivalent composed/decomposed accents match, but `café` is not silently equated to `cafe`.
- A normal label stays a whole phrase. Spaces, conjunctions, commas and slashes do not manufacture independent Topics. `War and Peace`, `Research and Development`, `rock and roll`, `New York`, `AC/DC`, and Chinese conjunctions remain intact.
- Only the documented explicit `;`, `|`, `、` separator format, including fullwidth forms normalized by NFKC, permits complete component phrases. `Fitness; Sleep` can match `sleep`; `健康、睡眠` can match the complete `睡眠` anchor. Empty components make that label DEFER. Repeated identical components do not multiply work.
- Non-CJK letters, combining marks, numbers and underscores adjacent to a match prevent a partial-token match. CJK matches use the whole supplied component, never inferred fragments, synonyms or word segmentation. Mixed-script identifiers are conservatively refused. This is not a universal linguistic tokenizer.
- Empty/nonlexical labels, one-character CJK, fewer than three non-CJK letters, the source-defined generic-label list and a finite documented ambiguous-word list defer. A more-specific intact phrase such as `Java programming` can match; standalone `Java` does not establish the intended sense. Unknown polysemy remains a limitation.
- Negation, questions and quotations can still concern the named topic. MATCH expresses lexical relevance only. It supplies no truth/confidence, no instruction to adopt an assertion, and no permission to broaden processing.
- Same-name labels retain separate indices. There is no name-based merge, ranking or arbitrary first-match Item selection.

The input bounds reuse reply 4096 characters/8192 bytes, original Section 80 UTF-16 units, and page 20. Both raw and normalized values must fit; Unicode expansion never gets truncated. The conservative comparison-work ceiling derives from those original bounds. Oversized, malformed or accessor-based input rejects the entire batch, without returning an accepted prefix. There is deliberately no `complete` profile/retrieval claim.

These local computation bounds do not replace the original request-wide branded read/hash ledger. A later source caller must charge every actual independent Section read in that same ledger, including final rechecks. Calling this pure function cannot reset a grant, renew the selected-body receipt, refresh a sent baseline or bypass any original fence.

## Original-owner integration seam

The existing `discover` function collects the already-authorized label strings only after the exact Section-only grant and while checking its original currentness on every row. It runs one bounded batch and maps MATCH indices back to the exact metadata candidates. Synchronous original currentness is checked immediately before/after matching and again before asking for the Item body grant. The original admission/graph snapshot check before discovery, selected-set comparison at final checks, independent selected-Item processing grant, body/revision/Now/protection/Source lineage checks, and shared cumulative budget remain intact. Nothing from an unselected body enters this predicate or the remote payload.

Do not integrate by accepting callback-selected IDs, treating external-read enablement as processing, refreshing selected Item revisions, inferring a new current-reply binding, or placing the new predicate before discovery authorization.

## Evidence

Original actual source owners reproduce two omissions: a manual Info Item and a manual Now Item with Section `Fitness; Sleep`, queried by an independently granted current reply `What should I change about sleep?`. Original Section discovery runs successfully, but the actual outgoing bounded Context array is empty (expected 1, actual 0). The specimen uses ContextCardsService, AssistReplyLease and LocalAssistSession, not a replacement matcher callback. The identical original-source specimen was rerun after the narrow source connection and passed 2/2. Those are separate real source GREENs, not a relabeling based on pure-module tests.

- Actual two-case RED log SHA256: `d178d5f4597831a619886f62c91d8913f8f14567d466377dd96b27c841c87c65`.
- Actual source specimen SHA256: `85991816d3b3b3860d81967111c874d243554b069bd2ed8d49b8319f46a04a67`.
- Original unchanged 281 selector SHA256: `9d0b8505f46b8bfba486945b099e911c5cbff8779998e610e10c00389c3b7210`.

The new pure module's targeted tests pass 84/84, zero failures/skips/cancellations, in 147.151369 ms. They cover mixed case, NFKC, accents, negation/questions/quotes, short and generic labels, known ambiguous senses, CJK/Latin boundaries, list-versus-conjunction ambiguity, duplicate labels, all 20 candidates, overbound/getter/Unicode refusal, deterministic accounting and immutable text-free output. The first 84-case run had one test arithmetic mistake (the five-character string `讨论睡眠。` was counted as six); the actual initial 83/84 log is preserved. The test now derives the count from that exact string; no matcher/runtime boundary changed to obtain the pass.

Command: `node --test --test-reporter=tap extension/tests/ai-assist-section-relevance.test.mjs`.

- Module SHA256: `d6b404be92cfd994fe6667921eae83c5856eb6cd0f0eff6e54116df2d82eb534`.
- Test SHA256: `1aa3f98474ec95787aee7333e7df4c158e688ba70d851ef539f0b2ea9c3beabe`.
- 84-pass log SHA256: `6d0d546f2ab75287e3fd10b780569af1bd0041a3112871c8e05ddffc52da8e0d`.
- Preserved initial 83/84 log SHA256: `5a230f93f19f971f86de029a8e9699b81eb3f6e299b68e27661b2379a3e2d6dd`.

## Remaining scope

The production source integration and its original-grant/final-fence tests are present in this candidate; the complete isolated combination passes as recorded below; limited independent review and exact saved-head integration remain required. Ordinary conjunction labels, unlabeled facts, genuine paraphrases, unknown ambiguous senses, and automatic facts lacking the original bounded Source/Topic seed remain unsupported. Neither this predicate nor a lexical hit closes general relevance quality, full Assist completeness, the existing native CI gate, live-provider qualification or human R3 acceptance.

## Source connection verification

The additional 21 original-source cases pass 21/21, zero failures/skips/cancellations, in 1229.757739 ms. They use actual ContextCardsService, the original private automatic AssistReplyLease, automatic_assist admission, LocalAssistSession and its original joined result transaction. Provider output is a local synthetic fixture; this is not live-provider or browser evidence.

Positive cases include both Info/Now, fullwidth/CJK component labels, distinct same-name Items, and retained results after unrelated body edits. Precision/permission negatives cover ordinary conjunctions and known polysemy, partial-token mismatches, separate default-denied discovery/body capabilities, newly relevant components, selected-label ABA and an Item mutation after the original result ACK. The latter is rolled back with no published result.

Seven phase-boundary cases independently verify expiry/revocation during the authorized label read, synchronous matching, the following microtask before a new body grant, and an awaited body-grant resolution. They preserve zero Item-body touches and zero dispatch. The first six also make zero new body-grant calls; the seventh has the one already-started resolution and still reads no Item body. None creates an AI job. No timer is used as the sole freshness boundary.

The first source-test attempt passed 20/21; its last fixture incorrectly tried a nonexistent Foundation.writeTransaction hook and never reached the intended race. The final test uses the actual original Store.foundationWrite and original organizerWorkItems ACK. That initial fixture failure is retained and is not called a product RED.

- Identical original omission specimen, 2/2 GREEN log SHA256: `1a879170d35be0338a651c90cf4083f8295c0942f05445fa01c5e64d47b56962`.
- Source tests SHA256: `f1196a72407651196fedff4bc1e3e9cf7272b8404e38177954545c713a407171`.
- Source 21/21 log SHA256: `29f23f37257861a40acb79117f8a7d8523cb5400129044d137615d2f60e9a1b3`.
- New original-selector SHA256: `3606fb0b855c65f2569b088a9cc9eff5d44685c0672d916d8afb991321fca216`.

The preceding pure-module-only snapshot remains a separate three-file artifact with manifest SHA256 `a77eb1838170d91b4299f0ec6d8e124910a8c7c2a5ad1df667d50560ec7d8ce7`; its documentation correctly says integration was pending at that earlier point.

## Final isolated combined verification

The complete isolated tree is based on the parent's exact 2026-10-18 22:16 integrated snapshot (including its current original shared qualification, the frozen 281 Assist slice and coordinated worker), with only this slice's five owned paths overlaid. It is not the concurrently changing active workspace and does not omit the relevant original runtime closure. The parent snapshot lacks unrelated historical files; the measured copied tree contains 2064 files.

The final unchanged-parameter combined run passed **386/386**, zero failures/cancellations/skips, in **15460.00661 ms**: the full preceding 281 plus 84 pure-predicate and 21 actual source cases. All 2064 files have identical before/after SHA256 inventories. No assertion, concurrency parameter, test timeout, skip or runtime bound was relaxed. The receipt was completed after execution and is the sole documentation-only difference in the five-file delivery versus that tested copy.

- Final 386 log SHA256: `62533fc998f1f8067ce766c344d1f2cd0d7362dded9eba927e7f3146224ba80b`.
- Complete before inventory SHA256: `a83fb11499efbfa44aaec116fa56fa430ab0c6b288dffa72a9e8e8fc132d8259`.
- Zero-drift/terminal record SHA256: `afad44b829e4e3197ae2f8ab8097e18c94dd97cdc4e49b5b2f8865031de358f0`.

The preceding isolated attempt stopped emitting output at the selector file boundary with no terminal summary and was interrupted with exit130. It is preserved as inconclusive/interrupted, not a pass (log SHA256 `b7a452bf4cf3ee4f1886059867060876d22d456551bb235c7491f19f596e5150`). The identical isolated private-session file separately passed 51/51 in 4413.915323 ms (log SHA256 `14cd67e47ee34ed63505ae609ec0751b4963f84ea343ae73170cf16df90e9fca`). An earlier active-workspace combined run also passed 386/386 but lacked a shared-tree stability inventory and is not the final coherent evidence. The intermittent combined-run stall has not been assigned a proven cause; the unchanged exact rerun above supplies the actual final terminal result without erasing it.

```sh
node --test --test-reporter=tap \
 extension/tests/ai-assist-section-relevance.test.mjs \
 extension/tests/ai-assist-section-relevance-source.test.mjs \
 extension/tests/ai-assist-automatic-consent.test.mjs \
 extension/tests/ai-assist-automatic-local.test.mjs \
 extension/tests/ai-assist-automatic-surface.test.mjs \
 extension/tests/ai-assist-automatic-worker.test.mjs \
 extension/tests/ai-assist-private-session.test.mjs \
 extension/tests/ai-cost-06-assist-intent.test.mjs \
 extension/tests/ai-assist-context-selector.test.mjs \
 services/ai-gateway/tests/assist-automatic-path.test.mjs \
 services/ai-gateway/tests/assist-client-path.test.mjs \
 services/ai-gateway/tests/assist-client-boundaries.test.mjs \
 services/ai-gateway/tests/assist-client-recovery.test.mjs \
 services/ai-gateway/tests/assist-client-content-ack.test.mjs
```
