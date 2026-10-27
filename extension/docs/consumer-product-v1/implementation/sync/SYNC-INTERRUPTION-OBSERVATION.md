# Local Sync interruption observation — read-only slice

Base: `397d9797ddb28d0a3f54857d4df4d835c7819c2d` / 0.55.18. This independent local successor does not change the pending publication candidate, enable production Sync, or establish browser/provider acceptance.

## Delivered boundary

The existing Settings Data & recovery owner exposes a read-only Sync detail. Opening it or explicitly refreshing invokes only `PAIA_GENERATION_STATUS`. The original command owner validates the exact request and original extension Archive/Popup sender (including the existing qualified Topic fragment), rejecting content scripts, external origins, foreign extension IDs, non-top frames and incognito. It does not expose its other command methods, a lifecycle, coordinator, review, writer token or an action budget.

The worker routes this one observation before ordinary startup completion, so a failed/pending startup does not hide the explanation. Storage isolation remains required before an enabled reader touches storage. The unchanged source-owned NULL configuration returns unavailable without waiting for isolation, enumerating/opening databases, calling SDK storage, or starting recovery. The response is excluded from ordinary Filter scheduling and archive-mutation broadcasts. No caller parameter can choose a configuration, database or phase.

| Original observation | Meaning | Available operation |
| --- | --- | --- |
| unavailable | This build does not enable production Sync inspection/activation. | Read explanation; no enable/restore promise. |
| not-prepared / review-ready | No durable selection completion is established by this status. | Read explanation only. |
| prepared | The original source has an incomplete prepared receipt. | Observe again; no dispatch/cancel/restart. |
| outcome-unknown | The source records dispatch, not a verified terminal outcome. | Observe again; never resend or clear UNKNOWN. |
| finishing | A selected source still has target cleanup/control obligations. | Observe again; no cold cleanup write. |
| selected | The existing original selected + target-cleaned validator succeeded. | Explain that the existing cold opener is retained; the status is not a reload/activation permit. |
| inspection failure | The current facts could not be read/validated. | Show unavailable observation; do not infer success, absence or safe retry. |

Incomplete prepared/dispatched source receipts can be explained without opening their target or registry. Their original source marker and migration identity are checked, and the marker is reread before returning the restrictive observation. A missing target cannot hide the source's UNKNOWN obligation. This does not certify the target, the current host lifetime, the SDK outcome or resumability. Corrupt/unsupported receipts still fail; a missing source never creates a database. The existing selected+cleaned validator and opener are unchanged, not reimplemented.

The UI does not poll, reload, retry, cancel, resume, activate, reset permissions, or promise cloud synchronization. At most one physical status request remains outstanding: Close/hide/reopen invalidates its presentation, not its actual pending work. Refresh stays disabled until that original request settles; settlement never automatically issues a replacement. Only a later explicit refresh can read again. It invalidates stale responses on close/hide/reopen; language changes affect copy only. It retains the existing modal/focus owner. No private operation ID, database name or raw error is rendered.

## Explicitly unresolved: durable nonrenewable continuation

V1 markers retain original identity, raw-cut commitments and phase, but **not** a durable original allowance/deadline or cross-process ownership transfer. An SDK after-row alone cannot replace those facts. The added `observationOnly`, `originalDeadlineAvailable:false`, and `originalAllowanceAvailable:false` fields are transient response facts; they are neither persisted fields nor an admission certificate. Each independent read is observation work, never a replenished budget for the interrupted action.

Cold writes for prepared/dispatched/UNKNOWN/finishing remain denied. A future implementation must first obtain approval for its concrete persistent representation/compatibility and resource contract. No such representation or budget change is made here. The decision must specify:

1. One original operation identity, source/target/registry binding and exact original cut, linked to the original fixed allowance; no fresh operation or refreshed 4096-reference / 2 MiB / 30 s window on reopen.
2. Durable debit/reservation ordering before each physical request, including native automatic finalizers, SDK dispatch, all actual results and terminal writes. Lost acknowledgement never refunds prepaid work; unknown physical settlement cannot be represented as settled.
3. A nonrenewable cross-process deadline interpretation that does not reset a monotonic-clock origin or trust a changed wall clock. If remaining time cannot be proven, stop without a write.
4. Original owner/host exclusion and one-way consumption across process loss; no detached ready token, new caller callback, or release-then-reactivate race. A cold receipt cannot certify still-live pages/native work.
5. Atomic compatibility handling, preservation of V1 UNKNOWN/failure evidence, no automatic conversion granting missing authority, and bounded exact raw-CAS terminal reconciliation. Existing completed reopen must remain compatible.

Production outer activation/continue/restart denial, the inner production host/accounting denial, and all NULL provider/store configuration remain unchanged. This slice closes a reachable explanation/observation gap only; it does not close the whole recovery lifecycle, complete SYNC-01, or authorize real providers, browser acceptance, publication or installation.
