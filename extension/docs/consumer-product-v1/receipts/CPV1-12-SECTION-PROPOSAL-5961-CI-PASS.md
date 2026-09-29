# CPV1-12 reviewed Topic section proposal candidate receipt

- Sole product Draft [#99](https://github.com/haohongfei2001-png/paia/pull/99).
- Exact tested code head: `5961e60bef62973ef9abda9494adcff80a1565a4`.
- Remote main at verification: `9cd74665a46fcf0bb77865afaf2aaf3b2cad2c40`.
- [Candidate Gate 36601666145](https://github.com/haohongfei2001-png/paia/actions/runs/36601666145): completed SUCCESS on exact head.
- Unit smoke: 1332 pass/0 fail/0 skipped, including 11 owning CPV1-12 cases.
- Existing affected hosted Chrome journeys: 17 pass/0 fail/0 skipped. No dedicated AI review UI/browser journey is claimed.
- Contracts/privacy, release guard (273 files), aggregate: SUCCESS. Hosted Mac extension diagnostic, VS-04 scale probe and full Certification skipped.

The detached typed contract now includes `section.create` (scope `topic.sections`) alongside `topic.rename` and `entry.place`. It binds the target Topic ID, metadata/base revision, organization revision, title, rationale and current evidence. No rank, arbitrary store command, send, delete, reply read or paid retry is accepted. The trusted review service shows the proposed section in its diff, requires exact digest and injected human/policy authorization, rechecks evidence/revisions, then calls the native section command with both revisions checked inside one write transaction. The returned receipt includes the created section ID. A concurrent human Topic rename at the native write boundary rejects the proposal with no section added. Existing native callers remain compatible with the optional extra CAS parameter.

Status: `ENGINEERING_CANDIDATE / DEFAULT_OFF / NOT_ACTIVATED / NOT_CERTIFIED`. There is no external AI direct storage path, provider/worker registration, new Context/Passport permission, automatic send or permanent delete. A trusted product review UI, external provider containment, full security/live/device acceptance and merge are not proved. CPV1-12.3 stays deferred while B-04 remains unresolved. Earlier [typed review](CPV1-12-TYPED-REVIEW-CANDIDATE-aa00fcc8.md) and [stale/race](CPV1-12-STALE-FILTER-RACE-91021e5c-CI-PASS.md) receipts remain immutable.
