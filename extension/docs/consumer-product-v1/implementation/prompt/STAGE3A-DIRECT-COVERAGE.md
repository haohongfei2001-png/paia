# Stage3A finite direct coverage and documentation-object correction

Base: `dd42a1698f0ae659e66287ff4ca256977ae0fae6`; isolated branch
`codex/prompt-direct-coverage-20261008`. Only next-action-detector, the new
exclusive unit file and this receipt change. No matcher, background, UI/content,
existing native test, CI, permission, storage or provider changes.

PROMPT_REUSE_STAGE_3A §§5/6/8/12 require a current bounded literal request,
exact text and visible prerequisites, safe alternatives and precision-first finite
rules. `Reply "ready"` is the same explicit literal request as `Reply with
"ready"`; the new finite English form permits omitted `with` in both parsing
and request-conflict counting. The existing safe-literal allowlist, conditions,
case-preserving extraction, risk/negation/material/resource/quoted-code gates and
whole-request anchoring are unchanged.

Bare object nouns `API 文档` / `API documentation` are not quotation evidence.
The contextual rule now requires an explicit finite documentation attribution
marker (Chinese 中/里/写道/说明/要求/指出/colon, English colon or
says/states/instructs/requires/recommends/requests/tells/indicates). Existing
example, quotation, manual/tutorial, third-party, terminal and code fences remain.
A normal object merely returns NO_EXPLICIT_NEXT_ACTION from this detector;
only the separate matcher may then assess its full finite action/object rules.
No safety veto is bypassed by the matcher.

## Frozen independent corpus interpretation

Original 80 labels remain unchanged at SHA256
`557da142e0544283fa4ddd7e83141c14b37453990697260a63554620f6fd9e51`.
Six initially missed Direct/Choice labels were audited individually:

- `Reply "ready".`: finite explicit direct request, fixed here.
- `When the download finishes, reply "downloaded".`: unsupported new condition
  and literal; intentionally still DEFER, not broadened just to satisfy this set.
- Inline Chinese A/B with descriptors: outside the current finite multi-line
  letter-choice grammar; still DEFER, no unbounded parser added.
- Bare `Choose A or B`, bare Chinese yes/no and bare English yes/no: absent option
  meanings or question referent. Under §6 these should DEFER. The frozen expected
  labels were overly strong; they remain recorded rather than edited for green.

The original result is retained. New root-local result:
`work/stage3a2-direct-coverage-quality80-results.json`, generated with a separate
runner pointing to this working tree. Type/Family agreement 60/80; accepted Family
relevance 17/17; compatible Family coverage 17/32; adversarial DEFER 40/40;
Direct/Choice expected type 3/8. Displayed type/Family-identity precision 20/20
is not exact Direct payload/condition or native insertion certification. Nine
critical destructive/credential/external-permission cases remain zero accepts.
This batch does not include another author's Family verb case normalization.

## Verification

```sh
node --test extension/tests/prompt-direct-coverage.test.mjs extension/tests/cpv1-12-next-detector.test.mjs extension/tests/cpv1-12-next-security.test.mjs extension/tests/cpv1-12-next-lifecycle.test.mjs extension/tests/cpv1-12-next-family-match.test.mjs
```

182/182 PASS, zero fail/skip/cancel, 80.69125 ms. The 29 new tests check exact
literal/case and retained condition, negative request conflict, quote/example,
code, sensitive/hidden-tail/material/unsupported literal, unresolved choice,
finite bilingual documentation objects and explicit attribution/conditional
frames. Actual original detector/security/lifecycle/matcher files ran whole.

Package guard 11873 PASS across 356 resources. No browser/network/model ran.
`work-direct-coverage-before.log` and `work-direct-coverage-before-full.log`
retain pre-fix negative failures. `work-direct-coverage-after.log` is the first
narrow Chinese-object pass; `work-direct-coverage-final.log` and
`work-direct-coverage-package.log` bind the final bilingual correction.
Root independent review passed, including the dedicated whole file (29/29).
Combined native/source-release/hosted gates are pending;
this is not full Stage3A or real-site quality closure.
