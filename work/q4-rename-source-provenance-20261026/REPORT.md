# 0.55.15 — preserve independent signed maintenance semantics

## Regression and narrow repair
Published 0.55.14 main `5dcabcab23545583da0afe22e965ecf47f1e6c0f` (tree `e42b02a025e51e26dedaa66e396b07e930039fd5`; local equivalent `f906c92ec863be8a55d3c5f04f4361f244f6a943`) failed Maintenance in CI run **40274994569**, job **121415747751**. Four unchanged cases at `services/ai-gateway/tests/maintenance-source-response-path.test.mjs:159–162` failed:

- `signed existing human topic UPDATE preserves the exact selected human interpretation`
- `signed existing human topic UPDATE defers when its exact structural unit is omitted`
- `signed existing human section UPDATE preserves the exact selected human interpretation`
- `signed existing human section UPDATE defers when its exact structural unit is omitted`

The positive cases returned OUTCOME_UNKNOWN with no facets instead of COMMITTED; the omission cases lacked the expected Context DEFER facet. These failures remain historical failures, not retries relabeled as passes.

The published service-client projection unconditionally enabled fresh human Topic/Section reconciliation for independent issuers. That selected a singleton structural batch rather than the fixture's original mixed structural/Context selection. Code inspection traced the earliest mismatch to the signed response transform's existing nonempty-other-unit assertion, whose exception the fixture routes to request destruction. CI directly records the resulting UNKNOWN/empty facets, not that caught intermediate exception.

The two-file repair reads the existing private Commands configuration record and original Filter source lineage. Only an exact current source configuration, with unchanged descriptors and a valid original source owner, receives the fresh rename flags. Copies, modified wrappers, retired configurations and public deny-only requirement tags cannot acquire that projection. Independent issuers retain their explicitly configured reconciliation values. No new grant, public registration or eager circular-import call is introduced. Existing restore flags, default NULL configuration, 4096-reference /2 MiB /30-second limits, selected Context semantics and UNKNOWN protections remain unchanged.

## One authorized local execution
Tested source commit: `9018e17b7c098ee9c6cf4d8d18de84b153f8c6da`. Exactly **7 PASS /0 FAIL**, exit **0**, 14884.005781 ms, in one selected invocation. The original four signed assertions are unchanged. Two existing genuine-source rename preparation cases retain prepare1/read2/release1, reach the intentional unavailable-profile boundary with profile1/transport0/dispatch0, and leave semantics and ACKs unchanged. One new provenance case covers original Commands/Filter identity and copy, modified-wrapper, public-tag, retired-config and independent-value rejection/preservation.

Run from the repository root:

```
node --test --test-concurrency=1 --test-reporter=tap --test-name-pattern='^(?:signed existing human topic UPDATE preserves the exact selected human interpretation|signed existing human topic UPDATE defers when its exact structural unit is omitted|signed existing human section UPDATE preserves the exact selected human interpretation|signed existing human section UPDATE defers when its exact structural unit is omitted|MAIN Q4 original topic rename preparation|MAIN Q4 original section rename preparation|Q4 rename capabilities require exact current Commands and Filter source provenance)$' services/ai-gateway/tests/maintenance-source-response-path.test.mjs extension/tests/main-q4-original-consumer-binding.test.mjs extension/tests/q4-rename-source-capability-provenance.test.mjs
```

`selected-once.tap` and `selected-once.exit` are the unmodified execution receipts. `SOURCE-MANIFEST.json` binds both changed runtime files, the new test, the two unchanged owning test files, version metadata and receipts. Local Node was **v24.19.0**, with pre-existing **pg 8.23.1** dependencies linked locally; no package was installed. This differs from the Node 22 CI target. The signed flow uses the existing local fixture, not a live provider.

Only version metadata and these evidence files were added after the selected run; tested runtime/tests were not changed or rerun. No workflow retry, new browser/CI/provider execution, budget increase or assertion weakening occurred. This is narrow local regression evidence, not exact-main CI qualification, installation, service activation or completion of the seven plans. Publication remains subject to approval and the existing automatic checks.
