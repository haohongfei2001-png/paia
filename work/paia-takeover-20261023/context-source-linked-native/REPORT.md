# Finite Context lineage and Source-linked native qualification

## Candidate and exact scope

Runtime base `1cb7a37d`, test-only candidate `6fb6fc58f5d406e8b747d59a467fc6d7bcbcb9b6`.
Both owning files only append to their original prefixes: CTX4 163334 bytes and
native Sync grouped checkpoint 5587 bytes. The final Sync event observation
correction is an uncommitted test-only delta during its recorded final invocation;
its exact bytes are retained as `sync-final.mjs` and bound by execution hashes.
No production runtime, shared harness, timeout, launcher/security arguments or
existing assertions were changed for this qualification.

## Results, kept separate

| Invocation | Result | TAP ms | Meaning |
| --- | --- | --- | --- |
| Initial finite combined | 20/22, exit 1 | 40841.554291 | Context 18 leaves + 2 parents passed; two Sync cases failed before positive cold restore |
| Sync diagnostic | 0/2, exit 1 | see original TAP | Explicit original rejection/phase capture; no change to assertions |
| Sync source event trace | 0/1, exit 1 | see original TAP | Native trusted abort and exact rollback observed while immediate boolean oracle was still false |
| Sync early-listener diagnostic | 0/2, exit 1 | see original TAP | Early native listener records abort, but assertion still preceded its listener settlement |
| Sync corrected exact event await | 2/2, exit 0 | 10686.279917 | All three native activation rollback points and full cold B/edit/C positive journey passed |

Final Sync wall time 10713.954542006832 ms. Initial combined wall time
40867.07154200121 ms. All raw outcomes, commands and exact diagnostic source
snapshots remain present. These are **not one combined 22/22 run**. Context was
not rerun after its successful 18 leaves and two parent summaries.

Each invocation recorded Node 22.23.3, Python 3.12.14, Playwright 1.63.0,
Chrome 156.0.8078.47 and macOS 27 arm64, original headless offline harness.
HEAD stayed `6fb6fc58`; complete tracked runtime/UI/background/scripts/harness/
native-sync/owning-test SHA256 vectors were identical before and after each run.
The vectors differ *between* diagnostic runs only by the explicitly edited Sync
owning test. No real provider, credential, network, cloud or large seed was used.

## Context native coverage

For each Source/release variant, the real original OrganizerStore/native IDB,
ContextMaintenanceService, human ContextCardsService and LocalMaintenanceSession
produce an original automatic Now Item with expired temporal metadata, human
edit, and (where selected) original delete/restore. Body-only and complete
body+note lineages each cover edit success, restore success, late backup-stage
drift, and native ACK abort followed by the same paid-response replay. An extra
body+note case denies only note selection through the independent processing
grant before provider dispatch.

The original source-owned response adapter parses the synthetic provider DTO.
Only Context receives `NO_CHANGE` ACK; Topic remains pending. Human Context body,
section and temporal metadata are byte-equivalent, effective-result count stays
zero, replay does not add provider calls or durable writes. Late temporal/note
drift after backup generation and explicit ACK abort retain all native stores
exactly at the failing transaction's prestate. This verifies original terminal
fences without making an asynchronous test mutation permanent.

## Sync native coverage and observation correction

The original single-Source bootstrap plus user Source-linked create/edit builds
a grouped checkpoint. Sender A's repository is explicitly closed before cold B;
this is a repository boundary, not a worker/process shutdown. Fresh native B
restores original body, note, Input references, protections, provenance,
dependency and history. Its local keyed token differs from A. Repeating activation
changes no store. B edits the body with the original owner, builds another
checkpoint, closes its repository, and fresh native C preserves that continuation.

At each original checkpoint (`applied-group`, `before-activation`,
`after-activation`), the failure stays inside the original strict native write
transaction. The test waits for **that exact IDBTransaction's native event
Promise**, checks trusted abort with no complete, then compares all stores to
pre-activation state and retains the validated staged checkpoint.

The initial failure was the new observation oracle: repository Promise settlement
could resume before a later DOM listener updated the test flags. The trace
recorded open -> trusted abort with `rollbackExact: true`; the condition had been
computed before the awaited diagnostic snapshot yielded to that listener. The
final correction waits for the native event itself; it adds no sleep, poll,
transaction retry, altered error mapping or production synchronization.

## Limits

Not entire owning files, native performance, large-seed capacity, Linux/cloud,
service-wide native requalification, physical device/visual acceptance or real
provider/account qualification. Context note-only and Source-linked remove/restore
were integrated runtime but are not claimed covered by these finite cases; their
separate Node receipts remain distinct. In-memory immutable transport is synthetic,
with the original worker network guards reporting zero external attempts.
