# Fixed live transport composition — 2026-10-25

Only the original worker-source coordinator, Capture repair owner and Prompt insertion receipt owner compose. Exact private factory/store/API identity is required. All intake gates close before aggregate drain; one original 30-second outer deadline covers acquisition and fences. No task cancellation, cleared pending ledger, historical absence, editor/host freeze, global activation or new public RPC is claimed. Late acquisition is released exactly once; an old failed state cannot clear a new attempt. Service-worker retains its existing Capture owner and creates the composition but no production command consumes it yet.

Independent owner reviews are attached. Worker activity self-drain remains separately bound to the original accepted dispatch and does not certify owner success.

## Validation, separately recorded
- Initial new owner file: 4 passed / 1 cancelled. Mocking every timer also suspended fake IndexedDB initialization. Original test and log preserved.
- Diagnostic timeout-only attempt: cancelled before initialization; preserved. No runtime change was made for this fixture failure.
- Narrow timer fixture correction (only original long deadline timers, short database scheduling remains real): 5/5; transport-second.log. The first RPC assertion still used non-production names, so this result alone is not meaningful RPC-gate evidence.
- Eight whole owning files on final runtime: 192/193, exit 1, TAP 46467.091375 ms. The sole failure expected an internal error directly from the public dispatcher. Runtime/source vectors and exact command preserved in transport-integrated-input.json; no production mapping change.
- Corrected real PAIA_GENERATION_* requests: default configuration is disabled, original command owner rejects GENERATION_SELECTION_UNAVAILABLE and public dispatcher maps to STORAGE_FAILED. Targeted 1/1 passes (transport-rpc-final.log). This does not certify the enabled editor gate; the existing editor/consumer tests cover that separately.

All evidence is Node22.23.3/macOS local synthetic work. No native/browser, provider, cloud CI or global/product acceptance. Do not combine the above into a single all-green aggregate.
