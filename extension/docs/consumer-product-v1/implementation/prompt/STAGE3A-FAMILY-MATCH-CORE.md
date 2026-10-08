# Stage 3A-2 — bounded local Family matching core checkpoint

Base: `e58953a80295337abfbdc0fe754eb7136bb8ca8d`. Scope follows `PROMPT_REUSE_STAGE_3A.md`; this is a preparatory pure-function batch, not completed Stage 3A-2 or a user-available release.

## Implementation boundary

`core/next-family-matcher.js` exports `matchNextFamily(snapshot, view)`. The existing production Direct/Choice detector runs first and preserves its result even with a cold Family view. The new branch accepts only a complete, available projection DTO with a safe integer generation, at most 64 Families, 2,048 Unicode characters per text and 65,536 aggregate UTF-8 text bytes. Invalid, duplicate, incomplete or oversized views are refused rather than truncated. Eligible Families must be visible and useful, pinned, edited or retained.

Matching supports a deliberately restricted bilingual action/object grammar: explain, simplify, summarize, compare, check logic, check edge cases and list actionable steps. An explicit reply request must match exactly one eligible Family's action, literal object, language and quantity. Unsupported conditions, deictic/private references, unsafe requests and ambiguity defer. NFKC normalization is used for safety/comparison only; original Family text, identity, generation and original UTF-16 evidence offsets survive unchanged. Frequency cannot override hard compatibility or resolve ambiguity.

Owner tests use the actual `projectPromptFamilies` output, including a full 64-item positive view and aggregate-byte rejection. No UI, service, background dispatch, schema, CI, version or external API changed. The function performs no IO. Its output is not read or insertion authority: a future owner must resolve current Family eligibility/text/generation and recheck reply, consent and document identity before use. No warm-view service or integration was added; existing full-library snapshot behavior was not placed on the reply path.

## Verification of this candidate

Complete related files: `cpv1-12-next-family-match`, `cpv1-12-next-detector`, `cpv1-12-next-lifecycle`, `cpv1-12-next-security`, `prompt-next-reopen-boundary`, and `cpv1-09-prompt-family` under `tests/`, each with `.test.mjs` suffix. Local command `node --test` with those six complete files: **193/193 PASS**, zero skipped/cancelled/failed, 102.585 ms. Evidence: coordinator workspace `work/prompt-family-related-final.log`.

`python3 scripts/check_package.py`: **11,849 guardrails / 355 runtime resources PASS** (`work/prompt-family-package.log`). This is static package validation, not browser acceptance; the final subsequent change only added an owner test.

Independent reviewer ran the actual core with separately authored adversarial data: **30/30 PASS (28 DEFER, two bilingual positive controls)**, plus cold-view Direct/Choice priority checks. This includes fullwidth private/deictic terms and omitted once/until conditions. Five lifecycle scenarios are explicitly **NOT_RUN** because the pure matcher cannot prove current owner authority. Independent files remain in coordinator `work/stage3a2-independent-{cases.json,runner.mjs,results.json}`. Reviewer found no blocking issue in the final normalization delta.

Candidate SHA-256:

- `core/next-family-matcher.js`: `7d2ff75aae09bdde9465386d911adfa57e770ae83585897014860ea109901d71`
- `tests/cpv1-12-next-family-match.test.mjs`: `211186b98cc770a1a329741e0b9f1b4ce1946c29adde547f985f2e6cc3c26cdb`

## Retained failures and remaining gates

The first owner-test attempt failed to parse because of an extra closing parenthesis; `work/prompt-family-owning.log` preserves it. Corrected evidence is separate. An intermediate patch used an incorrect working directory and did not apply; `work/prompt-family-related.log` is prior-candidate evidence and is not the final result above. No assertions or budgets were reduced to address these authoring failures.

This bounded synthetic suite and independent review do **not** satisfy the canonical independent 80-case Family corpus or 95% relevance goal. Broader grammar/quality, bounded projection ownership, Family resolve/assert-current lifecycle, live insertion and browser integration remain pending. No remote model, Stage 3B, real provider, paid call or private corpus was used. No native browser run was needed or claimed for this unused pure core. Main integration, CI certification and installed availability remain pending.
