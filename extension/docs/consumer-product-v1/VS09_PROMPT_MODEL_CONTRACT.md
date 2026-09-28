# VS-09 Prompt candidate and local template contract

Status: CPV1-09.0 / CPV1-09.1 model engineering IN_PROGRESS; no product-entrypoint or provider insertion claim.

## Authority and scope

PRODUCT_INTENT_CONTRACT section 11 and UX_CONTRACT P1/P2 own this slice. Continue in the existing sole product writer PR #99 / feat/vs08-readonly-connector; do not create a second writer while VS-08's privacy/platform gates remain deferred. This independent model neither publishes the rejected task Context reader nor issues a connector permission.

P1 shows useful frequent/fixed user prompts, searches/copies/pins/removes/edits reusable templates and retains Source trace. Editing a template never rewrites historical Input or Source. P2 append/replace, existing-draft protection, clipboard fallback and manual sending need separate actual provider-input engineering and browser evidence. P3 AI reply reading remains disabled under B-04.

## Candidate projection

The caller must provide a complete, already-authorized local Input projection with exact keys: kind=input, role=user/assistant/system/tool, id, revision, sourceId, text, sourceSentAt (known source timestamp or null), eligible (current local visibility/admission). This pure model does not obtain or validate a storage lease, provenance authority, profile permission or current generation. A later owning read transaction must construct and recheck that projection; caller-supplied eligibility is never an external permission.

The complete marker must be true before frequency is computed. Capped/paged/incomplete observations may not present frequency as complete. Each input identity counts once; repeated identical rows deduplicate, conflicting revisions/content/role/eligibility/time reject the batch with a finite error. All refs are retained, immutable and versioned; no source-ref tail or prompt body is clipped. Existing capture MAX_MESSAGE_LENGTH remains the body boundary; over-limit text rejects rather than clips. No smaller fixture or retrieval standard is introduced.

Only eligible human Input enters automated suggestions. Whitespace/non-language/numeric-only text and a finite exact set of acknowledgement/navigation utterances such as continue/OK/继续/好的 are not useful automated candidates. This is a deterministic exclusion, without models, embeddings, replies, learned thresholds or Topic routing. Explicitly fixed templates may contain a short control: that is the user's choice.

Frequency groups completely identical original text only. Search reuses VS-04 search-service normalization/lexical matching, but never rewrites or merges case, whitespace, code, negation or original Unicode. Known source times order ties; unknown creation time stays null. Pagination is explicit through total/offset/nextOffset; returned bodies and Source refs remain full.

## Template model

Create, edit, pin and remove are immutable local model transformations, not persistent domain commands in this batch. A template is user-authored working material with historical Input refs, not new Source truth. Create preserves complete supplied text and copies/freezes Source refs. Edit/pin requires the exact expected revision; a changed value increments revision, a true no-op does not. Stale versions refuse. Remove creates a revisioned template-only tombstone without retaining body text or issuing any Source purge. Removed templates cannot be edited/revived through the active edit API. Persistence and atomic writer/generation admission are subsequent work, not proved by a pure compare-and-transform function.

## Owning evidence and remaining work

The new complete owning unit file exercises controls versus substantive/AI/excluded material, exact frequency, duplicate/conflicting pages, pagination/time/reorder, finite errors and getter rejection, immutable edit/pin/remove/CAS/no-op/source trace, explicit short fixed templates, lexical normalization, a full long Unicode prompt with final negation, a complete 100000-Input projection retaining all 100000 refs, and inert archived markup with zero external requests. Existing unit runner discovers it automatically through its unchanged complete unit fallback; no workflow/test-selection change is needed.

Cloud Actions receipt for this batch is PENDING. Static parsing alone is not PASS. No local tests, provider/model/API call, production deployment, external input/clipboard write, automatic sending, new permission, storage migration or semantic runtime promotion occurred.

Continue the actual P1 bounded archive projection/persistence/UI and direct browser journeys after affected CI, keeping Input/Source truth, exclusion/purge races and edit revisions authoritative. Then implement P2 supported input/draft protection/insertion/manual-send journeys. VS-08 task Context remains OWNER_APPROVAL_PENDING; external identity, Passport issuer/consent, distributed quota, B-03/B-05 deployment and real acceptance remain NOT_VERIFIED/deferred. VS-07 semantic assets stay EXPERIMENTAL / DEFAULT_OFF / NON-BLOCKING; Semantic Lab alone owns Input → Topic.
