# Current complete Input mirror eligibility — 2026-10-16

This compatible correction continues AI_USAGE_PLAN section 5 through the existing Thought evidence and Context Topic scope owners. It does not complete AI-COST-03, authorize providers, or resume Sync.

An original whole-Input Entry follows current Working body and binding revision after a human edit, while its historical dependency digest remains unchanged. The previous current-scope check compared that historical body digest to the new mirror, incorrectly rejecting the current mirror. Only a currently classified complete `input_original` mirror with exact primary Input, valid dependency, binding revision, body length and body equality now uses current body qualification. All selected fields still hash and consume the existing budgets. Historical provenance and dependency rows are not rewritten. Derived or detached bodies, partial provenance, context-only evidence, unknown versions and changed selected notes retain historical qualification. Source lifecycle, exclusion and final authority checks remain.

Version 0.51.1 is a compatible fix against the pending 0.51.0 candidate. It must be reconciled with fresh main before integration. This branch includes required handoff 486f7ba and count follow-up 762e429; PR289 remains unmerged while Full38854021635 reports an ANS-08 performance failure. No integration or installed-runtime claim follows from local evidence.

## Local verification

- Initial current-mirror test failed against the original freshness behavior; corrected scope and binding combination passed 117/117. The final scope file with additional unknown-version and length negatives passed 100/100.
- Related Source binding, Context access policy and backup version tests passed 32/32.
- Independent read-only review found no blocking findings; 125/125 related tests plus the two final negatives passed.
- Actual isolated headless Chrome Source/release passed 126/126 in 27,323.20375ms. New native coverage proves current mirror eligibility, unchanged historical evidence, rejection of old Context evidence with zero writes, acceptance of freshly qualified evidence and subsequent Input exclusion refusal. The first native run failed because the new NO_CHANGE fixture incorrectly included disallowed body/section fields; the corrected fixture retains the original exact refusal assertions. Existing native scenarios all remain enabled.

All data was synthetic and local. Exact-head Full CI and subsequent exact-main qualification remain required. Mixed Input/Placement session requalification is separate work: this correction must not substitute refreshed Placement snapshots or rewrite human placement after another lane's mutation.

## Integration with Entry read repair

Local merge a9e6106391ec5210cd13d345ba6b1e256736b13c incorporates PR289 repair b64b1b25 without conflicts. Combined scope/projection/purge/version tests passed133/133; actual headless Source/release Maintenance passed126/126 in27717.697416ms. Both the current mirror eligibility and original Source-purge short-circuit remain in the shared evidence owner; all selected-field hashing and final epoch checks remain. PR289 replacement Full38856045373 is running separately on its own head. No CI or main pass is inferred for this next candidate.
