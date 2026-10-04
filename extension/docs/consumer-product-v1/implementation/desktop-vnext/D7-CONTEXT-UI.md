# D7 — AI Context full-page appearance

Status: FROZEN_CANDIDATE / native verification pending.
Base: `3a127c2d69f9d33cc0e7ae90d7d1c5e3ac0e5408` (PR152).

The bounded UI-only slice uses inspected D6.2 C00–C11 actual masters, C01 at
768/320px and C04 dark. It presents the centered 880px journey, serif heading,
material rows, output passages, notices, parts and footer. C00/C11 retain their
separate left-aligned empty/incomplete layout. The old Context functionality
remains void and is not reactivated by any of these visual states.

## Scope and safety boundary

- The ordinary AI Context primary entry uses the same display-only presenter
  with an empty model. It never invents a purpose, material, output or progress.
  Its header and body clearly state that functionality is unavailable.
- All snapshot states identify themselves as preview, not generated, not saved
  and not sent. C09 displays a copy-feedback example and explicitly says nothing
  was copied. Ready is never a success claim. No supplied snapshot is user data.
- Existing five-step navigation only selects in-memory display panels. Missing
  C00/C05–C07/C09–C11 states use the existing appearance API, without a new route,
  product state machine or gallery. No runtime master asset is imported.
- Every business action remains disabled and has no behavior handler, including
  direct event dispatch. Read-only text and disabled selection/search controls
  have no retrieval, assembly, authorization, model, clipboard or export owner.
- Output text is exact supplied text, not a fallback assembled from purpose or
  materials. Blocked presentation only accepts a separately supplied safe
  snapshot; it never falls back to the ordinary output. Missing facts stay absent.
- app-shell.css extends only its existing D6.2 three-space selectors to memory;
  app-shell.js adds memory to the existing compact primary menu list. The shared
  layout callback, fixed Archive Back slot and all data/route owners stay intact.
- Source, Working Input and human Thought data, existing old Context guardrails,
  stored 17px/680px preferences, permissions and provider behavior are preserved.
  No credential, paid service, security, schema or public-release change.

## Evidence and declared differences

Actual C00–C11, C01 compact and C04 dark pixels were inspected before edits.
The existing whole-page source/release script retains all 47 prior rows and adds
seven missing C states plus native C01 320px light, for 55 rows per variant.
Normal primary entry and compact re-entry get separate actual screenshots.
It uses actual approved D6.2 SVG bytes as reference, replacing the old D5 Context
prototype reference. Derivative widths/themes remain explicitly identified.

Deliberate differences: unavailable actions are visibly disabled; preview and
not-generated/not-saved copy is added; synthetic fixture content and real saved
prose preferences differ from illustrative material. No matching content or
completed operation is fabricated to improve pixel similarity. The existing
explicit snapshot API borrows the Thought workspace and its selected rail item;
ordinary memory-route screenshots separately establish real Context navigation.

Local 32 owning tests and 59 privacy cases PASS; package/release guards PASS.
The attempted adapter group has 21 PASS and 27 browser before-hook failures;
no adapter PASS is claimed locally. Full unit finished at 1,783 PASS / 1 FAIL:
the unchanged 10,000-input fake-IDB benchmark exceeded its 120-second limit.
This negative evidence is retained without changing the threshold or retrying.
Hosted full-unit, adapter and native results remain pending. The presentation unit harness refuses access to
extension APIs, network, storage, IndexedDB and clipboard. Hosted tests retain
Source/Thought equality, zero external/provider requests and add local-storage
equality around direct-dispatched preview actions. Native local Chrome remains
unavailable under the existing socket restriction; no access bypass is attempted.
Hosted exact-head source/release pixels and independent review are required
before adoption. Final D7 owner visual acceptance, full functionality, physical
IME/device evidence and consumer release remain separate.
