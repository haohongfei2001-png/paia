# v0.6.2 Light Filter Coverage Improvement

## Evidence boundary

User-reported daily v0.6.1.1 baseline: active=126, evaluated=126, filter=0, uncertain=125, failed=0, filter rate=0%, task=idle. No private body, title, URL, source/message identity or content hash was acquired. The actual uncertain reason distribution is unavailable: the deployed build has no reason counter, restricted extension pages are not accessed, and this stage forbids daily deployment. Do not infer that all 125 were metadata_unknown, and do not report any synthetic distribution as real.

This stage implements the anonymous measurement capability and evaluates isolated synthetic fixtures. Real nonzero, perceptible reading improvement remains a separate acceptance condition after an approved internal rollout. No target percentage is used to relax safety.

## Policy and preserved boundaries

policyVersion=2, classifierVersion=deterministic-light-2, filterVersion=1, reasonTaxonomyVersion=2. Physical IndexedDB remains v4; control schema6 and all Source/Input/deletion/Revision/import semantics remain unchanged. Before re-evaluation, a completed old policy saves an anonymous previousUncertainReasonCounts snapshot (fixed reason enum counts, old policy number, available/not_captured state). It advances with the migration cursor, survives restart and does not retain any source/body identity. A legacy generic uncertain reason maps to other rather than inventing a finer explanation. New installs show not_captured, not a claimed zero baseline. Old decisions then become pending through the existing resumable version migration and are genuinely re-evaluated; old metadata_unknown decisions are never simply relabeled as a more precise cause.

Missing historical attachment/reference presence is not a blanket veto for whole-input pure-control productions. legacy_unknown may qualify when there is no positive user-edit evidence or keep intent; metadata is not promoted to verified. Missing/invalid authorship still abstains. Known attachment/reference, user edits, restored input and keep overrides remain protected. Malformed presence is tracked as presenceInvalid in filter metadata and remains visible, including in cached-decision validation.

Capture, presence collection, original Source storage, editable text, time evidence, removal suppression, tombstones, revisions, History Completion and Thought behavior are unchanged. Only filter decision/cache metadata and diagnostic/UI presentation change. No runtime semantic provider, model, network, permission or native bridge is installed.

## Whole-input grammar

Anchored productions cover pure_continue, pure_start, pure_retry and pure_regenerate. Chinese examples include continue, next-step, start, retry and regenerate forms explicitly approved by the user; optional polite prefix and a single ordinary modal particle are supported. Simple English whole-command counterparts allow ASCII case variation and bounded terminal punctuation.

Only outer ordinary spaces normalize. Unicode lookalike letters, control characters, questions, quotes, newlines, structured references and unsupported expressions are not normalized into accepted controls. A character check precedes case-insensitive English matching. There is no substring/length-based filtering. Any unconsumed text prevents the full production from matching.

Preservation checks detect known attachments/references, authored intent, correction, constraints, decisions/preferences, questions, explicit creative/quoted content, reference-sensitive wording and ambiguous acknowledgments before filter admission. Unrecognized expressions remain visible. The classifier spike contract additionally rejects model filter admission outside the deterministic verified boundary, so a confidence-one model cannot grant an exception for an unrecognized poem or other uncertain input.

## Reason taxonomy

Settings returns reasonCounts for all checked active inputs and uncertainReasonCounts for the uncertain subset. Keys come only from fixed enums; unknown/corrupt stored reason strings aggregate under other and never become UI labels. Both maps contain numbers only, alongside reasonTaxonomyVersion=2. The prior-policy uncertain count map is shown separately and stays unchanged after recovery and current-policy evaluation. It reflects the actual upgrade moment, which may differ from the user-reported earlier 126-input snapshot. Existing checked/pending/protected/failed count semantics remain intact.

| reasonCode | Operational meaning |
|---|---|
| metadata_unknown | Missing/invalid editing evidence or malformed presence format; does not mean all historical attachment absence is unsafe |
| context_insufficient | Recognized fragment lacks enough context |
| ambiguous_ack | Acknowledgment, confirmation or possible choice; explicit keep |
| reference_possible | Reference-sensitive wording; explicit keep |
| substantive_content | A protected informational expression or additional clause; explicit keep |
| unsupported_expression | Unsupported characters, script or expression form |
| rule_no_match | No complete pure-control production matched |
| other | Invalid input or unknown stored reason |

pure_continue/start/retry/regenerate, user_protected and reference_or_attachment are additional all-decision reasons. Because acknowledgments/references/protected clauses now return keep, their uncertain-subset counts can be zero while all-decision counts are positive. These labels explain preservation paths, not thought value or importance. They are deterministic approximations, not semantic annotations of a user's archive.

## Isolated semantic experiment

The native experiment uses Apple's pretrained sentence embeddings with small synthetic class prototypes for pure_control/substantive/ambiguous, in English and Chinese. The API is documented in [Apple NLEmbedding](https://developer.apple.com/documentation/naturallanguage/nlembedding). Availability is checked locally; no model download, private data, extension database, credential, or external classifier call is used.

The experiment emits label and confidence, where confidence is an explicitly uncalibrated cosine-softmax score. Top-1 classification is not filter authorization. The strict boundary and threshold are evaluated separately. No precision guarantee is inferred from a numerical confidence or from zero admitted predictions.

The spike is in experiments/pure-control-embedding.swift and scripts/run-semantic-spike.mjs. Its binary, raw synthetic inputs and predictions remain under ignored work/. Only aggregate measurement/report receipts are retained as deliverables. Native macOS code is not a Chrome JavaScript provider; no nativeMessaging permission or bridge is added. Framework model weight size is unknown and must not be conflated with the small experiment executable.

## Evaluation and rollout decision

Retain all existing test cases, updating only expectations directly superseded by the approved metadata/grammar policy. Add a fixed high-risk corpus, grammar/metadata variants, malformed and Unicode lookalike inputs, a confidence-one adversary, anonymous counter consistency and policy upgrade checks.

The synthetic corpus is deliberately structured and includes generated variants; precision and coverage describe this corpus only. The model prototype's unguarded classifications are measured separately from accepted decisions. Final counts, costs and failure results are in outputs/v0.6.2-acceptance.md.

Recommendation: a separately approved controlled internal deployment can collect actual reason counts and reading impact. Do not claim the product's real-coverage goal achieved at this isolated stage. No semantic classifier or Thought Library Organizer proceeds from this work.
