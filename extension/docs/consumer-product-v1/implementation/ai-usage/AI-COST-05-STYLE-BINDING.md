# AI-COST-05 — optional local Organize style binding

Base: `b425105d`, coherent 0.26 candidate. This is a subsequent local checkpoint, not part of that frozen candidate or a merged release. No worker, provider, financial authority, old Organizer runner, preference write entry, schema or CI activation is added.

## Actual owner and compatibility

`AIUsageFoundation.plan/current/resolveLocal/commitFacet` now accepts an optional, strictly validated `organizeStyle` only for AI_ORGANIZE. It contains the actual style enum, AIOS-1.0 policy version and expected preference revision/restore epoch. Missing preference uses the existing acknowledged `readAIStyle` default. Missing **job style metadata** remains the legacy unqualified path; no saved job or output is retroactively labeled balanced.

The original preference remains the only truth: the existing serialized store's `control(t).preferences`, parsed by `readAIStyle`, and the actual recovery epoch. Unknown versions/enums, recovery in progress, or changed selection are refused. Preparation and execution re-read through the existing owner. `current` checks both before and after authority/evidence awaits; a styled committer is checked again before acknowledgements and receipts commit. A committer's pending control mutation and domain writes roll back on mismatch.

This is the existing single-worker, serialized-store guarantee. Preferences reside in extension local storage; `control(t)` uses the run's refreshed control cache or pending control. It is **not** cross-storage atomic CAS against another independently instantiated store concurrently writing local storage. This limitation remains an activation prerequisite, not a second preference database.

The semantic key binds existing evidence/scope/children/contract/route/principal and the style/policy, without preference revision. Execution identity additionally binds revision and epoch: A→B→A does not revive the old job. This key is not a complete model/prompt cache or a cache reader. No generated cache, body assembly, incremental 200+5 pipeline or three-style fidelity qualification is implemented.

Styled coverage has its own semantic namespace; legacy and other-style ACKs cannot satisfy it or archive its DEFER records. The domain-evidence reader uses the same key derivation. Topic singleflight is unchanged. No legacy ACK is overwritten. Existing committed/unknown financial evidence remains governed by the original owners.

## Evidence and preserved failures

- Actual initial three owner tests failed `INVALID_REQUEST` before the new optional contract: `/tmp/ai-style-binding-before.log`.
- Authority-await pending-control counterexample initially missed rejection: `/tmp/ai-style-binding-authority-before.log`. A final current check closes it.
- Independent review identified the DEFER archival consumer still reading legacy coverage. Actual legacy ACK plus styled DEFER initially archived 1 instead of 0: `/tmp/ai-style-binding-defer-before.log`. It now uses the validated original job's namespace. Matching styled ACK archives; another style does not.
- Final 19 complete AI and Settings-style unit files: **185/185 PASS**, 2.983 seconds, no skips/cancellations, `/tmp/ai-style-binding-related-final.log`. Includes 14 new actual Foundation cases, real preference update/restore-epoch changes between prepare and write, response-before-commit invalidation, committer rollback, exact legacy compatibility and domain-evidence lookup.
- Package audit: **12424 checks / 375 runtime resources PASS**, `/tmp/ai-style-binding-package-final.log`. Static evidence only.
- Existing complete foundation native source/release: **2/2 PASS**, 14.142 seconds, `/tmp/ai-style-binding-native.log`. Both keep the original 120-second budget and every previous capture/DEFER/unknown-attempt/performance/privacy assertion. New actual IndexedDB cases verify A/B acknowledgement isolation, A→B→A stale execution refusal with equal semantic identity, and pending-control/domain/coverage/receipt rollback. Extension/external/model requests remain zero. This uses the existing synthetic local-storage adapter with real browser IDB, not production worker activation.
- Independent review passed; reviewer ran the complete 14-case owner file, `/tmp/ai-style-binding-independent-final.log`. The DEFER issue and authority-await failure above remain recorded.
- Remote provider, production financial enforcement and full AI-COST-05 acceptance are **NOT_RUN**. This batch does not claim a new user-visible generation capability.

## Tested bytes

- foundation.js: `328dcc3a63f35d51c84ae10a0c2fcac0c0527d9cd8c53b26b8fe2edf4ba7f7dd`
- organize-style-binding.js: `c5bb70a8884a804623764ef532a6d015aba42ebf2636112815cc6c41ce9b179b`
- domain-commit-evidence.js: `e55521d1c99152b418bbbfe811c016995461118e4c1c963a0ef8d2eaa9a0ea0b`
- ai-cost-05-style-binding.test.mjs: `62e68616921592cd8d270b4d49fc552687a73c38024ec459da1acb254f7d4302`

- Native whole file: `d58d2e0b2380b58df305e00e626f97836d01444e922d4123edd7ee94da5174d7`
