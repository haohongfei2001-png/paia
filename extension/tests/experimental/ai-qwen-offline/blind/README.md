# Calibration blind packet formatter — offline fixture only

This separate experiment formats synthetic **actual adopted readbacks** from the approved frozen parent loader/replay. It does not regenerate output from a template: after each typed phase it reads the existing adopted projection and current Entry bodies/revisions, checks the parent receipt/projection/manifest identities, and formats that specific phase. Each 200+5 snapshot remains separate; final205 evidence cannot silently substitute for earlier phases.

No production owner, frozen calibration/review-contract or parent replay/artifact code changes. The trusted parent hashes remain fc7ee6cb code plus its exact artifacts/replay bytes; the parent still verifies the frozen12/54 owners and uses fake-indexeddb, explicit fixture provider/financial authority, no model/transport. An experiment digest is integrity metadata, not an external attestation, spending/data authority or human score.

From extension:

```sh
node --test tests/experimental/ai-qwen-offline/blind/formatter.test.mjs
node tests/experimental/ai-qwen-offline/blind/run.mjs --out=/private/tmp/paia-blind-new --topics=SYN-T01,SYN-T02,SYN-T03
node tests/experimental/ai-qwen-offline/blind/run.mjs --out=/private/tmp/paia-blind-full-new
```

The CLI requires a new directory and refuses an existing destination; files use exclusive creation with restrictive local permissions. It performs no upload, messaging or publication. Reviewers receive `public/packets.json` and its public receipt. `private/assignment-map.json`, `private/seed.json` and `private/readbacks.json` stay separate under the private directory and must not accompany a blind packet. The CLI prints counts/digest/path only, never the seed or map. Generated files stay outside Git.

Public packets omit style/model/provider/route/price/profile, job/candidate/owner IDs, seed and assignment labels. They show opaque randomized packet/group IDs, actual synthetic evidence and current owner revision, Section and active/removed coverage, actual adopted text, explicit refusal/no-output and missing-review status. Removed evidence retains its identity but its body is null. Dates/unknown times are expressly corpus reference annotations; this formatter does not claim original Source-time qualification. Source content is not censored to hide words resembling labels: semantic wording may reveal style, so label removal is **not complete blindness**.

A256-bit seed generates deterministic packet/group identities and randomized presentation order for the same immutable readbacks. Its commitment binds the formatter version, corpus/contract digests and seed. The separately stored assignment map binds public package/packet digests, private exact case/style, readback/receipt/projection/manifest digests and fixture labels; the seed file binds the same package/commitment. Full verification reconstructs the deterministic expected package from the strict actual readback snapshot and checks all three files. Self-recomputed hashes do not make a foreign case, altered source revision, duplicate or unknown identity valid.

The complete calibration schedule is102 packets,99 available fixture outputs and3 actual Topic12 removed-scope refusals. All102 reviews are missing:99 for available output and3 for refusal. Missing/refused cases cannot disappear, become empty successful text, count as reviewed or produce scores. There are34 phase groups, each with three variants; the205 Entry Topic contributes33 packets over11 phases. Counts are traceability/mechanics, not independent statistical samples or achieved quality. Explicit short scopes carry their own smaller declared denominator and cannot represent the full calibration package.

Strict verification checks exact version/kind/corpus/contract/parent identity, all expected Topic/phase/style cases, count and uniqueness, readback/receipt/projection/manifest digests, current fixture revision schedule, typed evidence/lifecycle/Section/time and actual available/refused states. Public/private crossing, wrong map/seed/version/commitment, dropped/replaced packets and unsupported attempts reject. The original no-redispatch/protection mechanics remain the parent owner's responsibility and named evidence; formatting introduces no candidate/job/provenance writes.

The independently authored held-out set is **not read or used for tuning** here. The old calibration freeze's held-out zero is historical to that package, not a new assertion about coordinator data work. This batch supplies no semantic gold, model quality, human author ratings/consent, manual human receipt validator, scoring or confidence helper. All judgments remain NOT_COLLECTED and quality NOT_RUN. Subsequent human review needs separately authorized scope; do not convert these synthetic packets into author preference evidence.
