# AI-COST-02 — dormant pure Qwen usage parser author receipt

## Current descriptor-bound corrective freeze

Latest runtime/test commit `4b8311f31c4931372a1c03c24b182439ef1e612a`,
tree `7100e1aa617b4678473aabde0458bf3391f77689`. Independent review identified
an actual bound defect in initial78c bytes: an object with17000 own keys returned
TRANSPORT_BOUND only *after*17000 getOwnPropertyDescriptor inspections. Root's
original probe and failure remain `extension/work/qwen-parser-independent-bounds.mjs`
and `/tmp/qwen-parser-independent-bounds-actual-before.log`. A prior wrong-cwd
MODULE_NOT_FOUND run was harness failure, not that actual negative.

Known key/array size checks now precede descriptor reads; array length is included
in the key budget, and allowed descriptors are read individually. The same
independent probe rerun by the author passed with0 response-descriptor inspections,
`/tmp/qwen-parser-independent-bounds-actual-after.log`. The new owning spy covers
both oversized objects and dense arrays. Whole owning file53/53 PASS, zero
failed/skipped/cancelled,67.201542ms,
`/tmp/qwen-usage-parser-bounded-final-owning.log`. Review of this corrective freeze
is pending; an author rerun is not a second independent review.

Reflect.ownKeys itself necessarily allocates the supplied name list. This fix
does not claim an absolute memory bound on hostile/already decoded JS input or
bounded execution of arbitrary Proxy traps. The unchanged decoder/authority
limitations continue to apply. Initial161 complete related passes and package/
development audits below were run at78c bytes; they are preserved as historical
evidence, not relabelled as a161-case rerun at4b8311f3. Root requested the same
independent probe and complete owning file for this narrow fix; no full/browser
suite was repeated. All other owners and the corpus remain unchanged.

Current SHA256: runtime
`9cb271753c702fea883ec74154dd0c403f0fbe519ee355ed6c1e85513635e612`;
owning test `e36ef7d51fcf0469dc0f2dc29ff3dadb09541b45d821b05d1b8517b15b7844fd`.
Initial runtime bytes also remain in `/tmp/qwen-usage-parser-descriptor-bound-before.js`.

## Initial author freeze — retained

Design base `6d1b4747b0a6263fd2ecb6a2fbd51990e585732d`, independently approved
by the coordinator. Code freeze `78c558867946da9ed4bfcb3bcc49c61d5c707156`,
tree `8f8b059e14a0a8870cc90daef74bd8978187e738`. Local author candidate only;
independent runtime review, integration and all real qualification remain pending.
No remote model call, account/key access, financial activation or deployment.

## Scope and unchanged owners

Adds only `core/ai-usage/qwen-usage-parser.js` and its owning test; updates this
batch's two design/audit documents. Existing normalizeUsage, financial helpers,
Foundation, private Assist, Organize/cache, worker/UI, shared stores, CI, manifest,
version and dependencies are unchanged. No production import/call registration.
The new whole owning file falls into the existing default unit category; no
test-routing or assertion/timeout modifications were made.

The parser validates a minimal exact internal *shape* binding, not route/registry
authenticity. It supplies no request builder, SDK, HTTP client, SSE decoder,
qualification registry, signature verification, service storage or scheduling.
All output keeps financialAuthority:false, dispatchAllowed:false,
qualification:NOT_ESTABLISHED and domainValidity:NOT_EVALUATED. The reservation
label is a conservative requirement for a future financial consumer, not a claim
that this module changes actual budget occupation.

## Implemented behavior

- Strict bounded JSON data descriptor snapshot, finite depths/keys/strings/bytes,
  no getter execution, cycles/shared-object/sparse-array/unknown schema refusal.
  This bounds the validator's own work; it does not bound memory allocated before
  a caller supplies an already decoded value, or certify a hostile JS Proxy trap.
- Exact compatible usage keys and existing neutral integer/total/subset checks;
  no string coercion, unknown alias/category fallback or duplicate reasoning bill.
  Qualified-zero absence rules remain synthetic private binding facts; missing
  cache counts are never guessed zero. Thinking/no-explicit-cache conflicts fail.
- Normal response identity/one choice/finish checks and decoded streaming
  OPEN→FINISHED→USAGE→DONE. Provider ID and model stay stable, final usage is unique
  with empty choices, and the exact `{kind:'done'}` marker is unique and last.
  The marker and explicit completion flags must come from a future decoder; these
  values alone do not prove their real wire origin. Duplicate JSON keys and real
  SSE/UTF-8/HTTP framing are that decoder's separately qualified responsibilities.
- Missing final usage, missing terminal/transport completion, cancellation or
  HTTP failure retains UNKNOWN; malformed/conflicting data fails without release.
  `length`/tool stop with valid usage can be billable KNOWN while domain validity
  remains unassessed. No response body, reasoning or arbitrary thrown error field
  is returned/logged. Internal failure codes use private WeakSet branding.
- Valid observed over-cap counts remain exact with USAGE_OVER_CAP; no clipping,
  refund, replacement request or new financial entitlement. Future service/route
  stopping and actual bill reconciliation are not implemented by this pure flag.

## Author validation at frozen runtime/test bytes

Eight complete owning/regression files:

`node --test extension/tests/qwen-usage-parser.test.mjs extension/tests/ai-cost-02-*.test.mjs extension/tests/cpv1-ai-cost-01-foundation.test.mjs`

161/161 PASS, zero failed/skipped/cancelled,1612.570041ms;
`/tmp/qwen-usage-parser-final-related.log`. The new whole owning file has52 cases:
all37 original raw-shape fixtures plus15 boundary cases, including actual
allowlisted-model switching, reflection-error redaction, bound/missing/null/token
partitions, exact DONE ordering, over-cap retention, privacy and input immutability.
The synthetic corpus is unchanged from the approved design; its owning fixture
adapter adds typed decoded DONE from its terminal flag, not a real SSE decoder.

Static package audit:13542 guardrails/406 resources PASS,
`/tmp/qwen-usage-parser-final-package.log`. Development privacy/permission/network
audit PASS, `/tmp/qwen-usage-parser-final-development.log`. Design-corpus integrity
checks PASS separately, `/tmp/qwen-usage-parser-final-corpus-integrity.log`; its
historical rawParserImplemented:false describes that non-parser harness, not this
owning result. No browser/full-suite/release/hosted or live qualification is claimed.

Exact SHA256:

| File | SHA256 |
|---|---|
| core/ai-usage/qwen-usage-parser.js | `818e83bce628b704612585003b85a6143b239252995a25b4079ad2168884aea9` |
| tests/qwen-usage-parser.test.mjs | `ade395960df520c628534238ab91a2536e4e93a948ce89f3c6df4ddefb764940` |
| tests/fixtures/qwen-usage-contract-v1.json | `70e1b32f462ecf759394eccd774350ea1d96785e475b8b6cc396ce5ffe8f1b4b` |

## Retained failed drafts and exact limits of their evidence

1. Before implementation the owning file failed to load the absent module:
   `/tmp/qwen-usage-parser-missing-module-before.log`. This is not37 executed
   failing cases or a shipped-product regression. Initial actual37 corpus cases
   then passed, `/tmp/qwen-usage-parser-corpus-first.log`.
2. Added actual two-model allowlist regression reproduced37 PASS/1 FAIL:
   `/tmp/qwen-usage-parser-model-stability-before.log`. The initial draft accepted
   switching between two individually allowlisted model IDs in one stream.
   Stable stream model enforcement fixed it;38/38 passed in
   `/tmp/qwen-usage-parser-model-stability-after.log`. No frozen historical SHA
   was recorded for that initial draft; do not relabel final bytes as its failure.
3. Added unexpected reflective exception case reproduced50 PASS/1 FAIL:
   `/tmp/qwen-usage-parser-error-redaction-before.log`. Unbranded thrown.reason
   could escape in output. Exact before runtime SHA256
   `888bb41c2b2767e15f29cb5f5e38894a0fafb48e0d798bb2f49ebaec0f76599a`
   and bytes remain in `/tmp/qwen-usage-parser-error-redaction-before.js`, with
   test/base binding in the adjacent .json file. Private failure branding fixed
   it;51/51 passed, `/tmp/qwen-usage-parser-error-redaction-after.log`.
   Synthetic JS reflection injection is an API robustness test, not a real Qwen
   response/user-data disclosure or proof that hostile traps execute boundedly.
4. Initial DONE-position selection had51 PASS/1 FAIL because its JS fixture reused
   the same frame object twice; the strict decoded JSON-tree guard correctly
   rejected aliasing earlier with USAGE_INVALID. Each frame is now independently
   cloned to represent actual decoded JSON; the original strict order oracle is
   unchanged. Logs `/tmp/qwen-usage-parser-done-marker.log` and
   `/tmp/qwen-usage-parser-done-marker-fixed.log` retain both states (52/52 final).

No failure was hidden by altered timeout, lower assertion, skipped case, provider
retry or financial release. Intermediate109-pass related evidence predates later
fixes and is not the final161-case selection. No integration should occur before
the independent parser review; full AI-COST-02 remains incomplete.
