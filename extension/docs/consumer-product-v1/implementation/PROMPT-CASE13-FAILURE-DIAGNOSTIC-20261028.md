# Prompt case13 bounded failure diagnostics — 0.55.28 candidate

The original .55.27 Prompt foundation source Stage3 case13 failed while waiting30s for the exact ordinary multiline button. Source12 preceding scenes passed; release13 scenes, including the same case, passed. Source failure DOM, SAVE/QUERY RPC observations and screenshot were not recorded. Relevant runtime/fixture files are identical to .55.26. Root cause is UNKNOWN: neither a product regression nor an environmental flake is proved.

This test-only successor adds bounded failure evidence to that same case: up to32 synthetic ordinary-RPC metadata records,24 button labels capped256characters, status512characters and8 page errors capped500characters. It does not record raw RPC bodies, credentials, nonces or identifiers. Upon original failure only, it attempts bounded DOM and screenshot capture (up to1second each) before browser close. Existing artifact collection receives the diagnostic files.

Original exact role/name locator, inherited30s timeout,180s parent, exact multiline text, one insertion and no-Send assertions remain. Original Promise/result/error identity is retained; added observation microtasks have small timing overhead, so the patch is not claimed timing-invisible. It does not retry an RPC, insert twice, change provider behavior or turn missing evidence into a pass. Production runtime and workflows are unchanged. Four service configurations remain null. Section comparison HELD work is excluded.

Six NEW pure helper controls passed once; syntax/diff checks passed. Browser execution, old suites and changed-head CI have NOT_RUN status. Original failure log/artifact digest and missing-evidence status remain preserved. No claim of fixing the underlying source failure or full product acceptance is made. A next original CI run may pass without proving the prior cause; if it fails, its bounded evidence should support a concrete diagnosis. No automatic retry is authorized.

Three version fields are consistently0.55.28. This is an unpublished local candidate; publication and original automatic CI/Pages require version-specific approval.
