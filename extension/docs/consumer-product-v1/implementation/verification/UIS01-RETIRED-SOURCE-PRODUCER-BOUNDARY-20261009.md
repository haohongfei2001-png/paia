# UIS-01 retired export privacy boundary — finite repair candidate

Base `c6e7df0db6d324a8b42cdd1011537decfe9590a6`, tree `15fe51ecd511fcd0f64014bb1c59b5b28fec6f04`. Code `3eba6ab900b3bf37d73247a770a40cd91be8e999`, tree `992b09021554a07a36cc7ceb01bb81ef0c515475`. This isolated branch changes only the original UIS-01 test and adds this owning receipt. No production/runtime/harness/Core/Settings/CI/version change. Final whole UIS-01 native execution is NOT_RUN pending independent review.

## Original current delivery failure remains FAIL

PR231 Full37907834732 Browser3/9 job113745538398 failed its UIS-01 whole test at the full-state retired-export comparison (original line99). The49-case job summary is48 PASS/1 FAIL/0 skipped. Raw log `/tmp/042-pr231-browser3-failure-raw.log`, SHA256 `11f64bf28e7ae34fd048d92300f3f9d495e0847bf01ce9244c3df2c4d9132783`. Its printed diff is truncated. Visible changes include added1→0, unsettledSources1→0, enrich→capture/duplicate1 and diagnostic timestamps; it does not conclusively establish that these were the only historical differences or the unique historical cause. Other job results and final delivery remain owned by the coordinator, not replaced by this finite diagnostic.

## Actual production route audit

The original worker `handle` requires ready/trusted Archive sender and consent; `store.status()` is an original readonly Store-queue transaction. It then invokes `assertFeatureAvailable(request)` before backupReady, retired switch/backup execution or success scheduling. `core/feature-availability.js` explicitly rejects PAIA_BACKUP_BEGIN_EXPORT, PAIA_BACKUP_EXPORT_PAGE and PAIA_MEMORY_SHARE with FEATURE_UNAVAILABLE. Rejected `handle` goes directly to the original error/sendResponse path, not its success filter/notification path. No replacement route or fake refusal was introduced.

The original `FakeChatGPT.open` allocates and returns a distinct real Page for every call. The test previously discarded both returned handles; the original content capture polls each live document every2s and may diagnose/capture/enrich independently of retired RPCs. `GET_STATE` invokes the original Store snapshot/run queue; it does not stop those still-live producers. Full-state equality therefore needs an actual absence-of-competing-producer prerequisite, while still retaining every diagnostic field in the compared snapshots.

## One controlled real native diagnostic

Node22.23.3, pinned Playwright1.63.0, isolated synthetic headless Chrome; no visible window/account/provider. Original frozen production worker SHA256 `e06a116f4907e2e232254a6a4fa7219c863d1103b41c0667ff8ffcec0ff1034d`. A NEW temporary copied extension appended body-free observation wrappers around the original Store capture/enrich/diagnose methods and exposed only trace/drain state. The wrappers call the actual original methods and record their completion/rejection, never alter input or returned result. This instrumentation is diagnostic only, not whole-test acceptance or proof that its timing equals the cloud run.

The no-retired-command control waited for an actual periodic capture completion with both exact synthetic pages live. Full original h.state changed without any retired RPC. Complete body-free changed paths were exactly diagnostics.added, diagnostics.captureHealth.unsettledSources, diagnostics.captureHealthAt, diagnostics.ingestion.duplicates, diagnostics.ingestion.kind, diagnostics.ingestionAt, diagnostics.lastScanAt, diagnostics.lastSuccessAt and diagnostics.structureAt. This demonstrates a real competing-producer failure mechanism matching the visible cloud fields; unique cloud causality remains UNKNOWN.

The closed control first proved both fixture chat IDs were durably present, then awaited native close of both exact returned Pages; both isClosed were true and the isolated context had zero ChatGPT pages. It awaited the original Store tail to stable identity, with actual pending0, then the original GET_STATE queue. Each original retired command returned FEATURE_UNAVAILABLE; the unchanged full-state deepEqual and downloads0 assertions passed. Full before/after SHA values matched. Capture/enrich/diagnose start/completion counts stayed unchanged through that boundary: complete trace28 events, capture3/3, enrich4/4, diagnose7/7, no rejection/pending. Provider/extension/unexpected network counts and harness errors were all0/empty.

| Preserved diagnostic | SHA256 |
|---|---|
| `/tmp/uis01-source-producer-diagnostic.mjs` | `9396bda370945e50714a0edd73c1bdf8019cab13871864de3837979b2fb7c2ab` |
| `/tmp/uis01-source-producer-diagnostic.log` | `5036d82a6278b0638c86216574e0b1943962c167ce5ce3e62205dec7a38aa513` |
| `/tmp/uis01-source-producer-diagnostic.json` | `172632d3f46a50e112bf402ac06852eb226af82bce073c5b0c9cd210bc03dbc2` |

## Minimal frozen test change; final whole file pending

The test now holds sourceA/sourceB from its two unchanged h.open fixtures. It retains both live pages throughout every original capture/menu/history/Settings/search journey. Only immediately before the original retired privacy baseline does it prove both exact Source IDs, await close of those two documents, assert both native isClosed and no remaining ChatGPT page, and issue one original GET_STATE queue drain. The entire original baseline/three RPC/error/full-state/download assertion line is byte-identical. Both producer handles must still be closed after that comparison.

All32 original assertion-containing source lines remain byte-identical, the original120000ms timeout and capture eventual predicate are unchanged, and final Node22 syntax plus whitespace checks pass. There is no fixed wait, deadline increase, capture preference pause, filtered diagnostics, altered baseline, replayed success or assertion reduction. Final test SHA256 `4792250cf17592b80c3256d5567988d19e096660accb0c14650459795174697b`. Freeze for Root plus independent code/evidence review before exactly the necessary original whole-file native test. This does not qualify current overall CI, merge or user delivery.

## Independently approved original whole-file run

After peer finite approval, one original complete UIS-01 file ran on unchanged clean HEAD `4308a97a7ab33b23e1304991a8e4ad9dd8fb6992`, tree `ca378a434ca787dec0edff3a65b52e6368569c39`, using verified Node22.23.3, pinned Playwright1.63.0 and PAIA_HEADLESS=1. It passed1/1,7017.978541ms case/7172.191458ms total,EXIT0,zero failed/skipped/cancelled. Every original journey/assertion executed, including complete unfiltered state equality, all3 FEATURE_UNAVAILABLE replies, downloads0, provider/extension/unexpected network0 and errors[]. The actual production and harness bytes remain identical to c6; no diagnostic wrapper was present in this whole-file run.

Immutable log `/tmp/uis01-retired-source-boundary-whole-final.log` SHA256 `a9c0e346a945dfcdeabb2e8a9f59f8139bc5f1c04f812cfe03d177454f9f75fc`; external exact execution/source result `/tmp/uis01-retired-source-boundary-whole-final.json` SHA256 `3b406e5f0cd36e75ded4ccb146188ac47a02670e91ba3861abe9cf452cd114ba`. Source SHA and original120000ms budget above are unchanged, and worktree remained clean throughout. The original cloud failure remains preserved at its original identity. This passes only the UIS repair: the newly demonstrated private-retention data-method/effect-proof P1 independently blocks PR231/current overall delivery. No push, CI/version change, merge or deployment occurred in this step.
