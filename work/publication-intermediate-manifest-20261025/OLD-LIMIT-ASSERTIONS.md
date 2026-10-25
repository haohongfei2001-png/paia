# Three old LIMIT expectations affected by the outbound improvement

The unchanged three-file run is 159/162; original source and complete log retained.

1. `source-union-publication-continuation.test.mjs:124` writes the same original outbox row after every real synthetic POST. This causes original observations to re-evaluate full cuts; it does not change the causal content. Proposed exact follow-up: expect confirmed, preserve rewrites>0, compare all canonical rows. A separate deterministic original-publication-ticket exhaustion control will verify the unchanged 4096 and 2 MiB limits before a further POST or confirmation save. This must consume the actual private token passed to the original discovery method; no fake token or runtime switch.
2. Line171 restores the original disposable stage after prepare and observes the original cleanup method. Proposed follow-up: expect confirmed, preserve `calls===0` and exact original stage rows. The content remains proven; `publish` must still never obtain prepare cleanup authority. Lower cost is not proof of cleanup and the stage must remain present.
3. Line179 ancestor case appends three original capture messages. Proposed follow-up: ancestor confirms, all original historical rows/counters/Source times and preserved stage/sourceCut remain exact; add cold new-installation complete restoration. The local_0 variant still refuses at the old limit, so its refusal assertion stays. Do not alter scale, history or quota.

These are proposed test-only semantic updates after parent file ownership confirmation, not production budget changes. Root and independent reviewer receive the exact original context before modification.
