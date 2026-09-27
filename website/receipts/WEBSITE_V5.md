# Website v5 — Context in motion

Status: IMPLEMENTED_CANDIDATE / HTTP_AND_LIVE_VERIFICATION_PENDING.
Owner authorization: modify the public website only if independent of active
product development; otherwise deliver design only. No new service, account,
permission, AI call, or data-collection authorization is implied.

## Isolation

Start main: `e43b8748701cd7c71eba4da1576478bdcfce2d47`.
Website writer: PR89 / `website/context-motion-v5`.
Product writer: PR88 / VS07 retrieval evaluation. Its changed-file inventory is
extension experiments/scripts/tests/docs and its own lab workflow; none of the
website-owned runtime paths overlap. Website and extension CI paths/concurrency
are separate. No extension, native-host, product STATUS, schema, capture,
permissions, private archive, signing/distribution or extension CI changes.
Reconcile main again before integration. Never rebase or edit the product writer.

## Design and actual behavior

The prior v4 composition is a baseline, not a constraint to keep rejected imagery.
A real production-domain screenshot was acquired in run36296142097, not inferred
from the earlier generated design image.

- Keep the text-first opening. Native scrolling now stages four source arrivals,
  draws their connecting paths, and resolves a layered context object last.
  Scroll is reversible, never captured. The runway is900px at desktop widths;
  small screens use normal flow and finite entry transitions. No idle loop.
- Replace coast/plant/architectural imagery with a source-to-context composition.
  No unrelated atmosphere photo, handwritten slogan, testimonial or fake film.
- Redraw the document/search, connected-node and pen/reuse marks as independent
  optical SVGs. External provider marks remain byte-identical original assets.
- Remove the redundant homepage four-step strip. Three brief capabilities lead
  directly into a dark product stage, rather than two consecutive feature grids.
- The product stage uses actual explicit selection. Selected paths light up and
  the selected label moves toward its corresponding context item; excluding an
  input removes both the path and text. Empty selection stays empty. Copy copies
  precisely the selected strings; it does not send to AI or silently add context.
  Late copy completion cannot label changed context as copied.
- The standalone existing demo retains immutable source/working text separation,
  stale-preview blocking, safe text, exact export and copy. No runtime rewrite.
- Use the same optical/typographic rules for the16paired page types. How-it-works
  and use-case examples are spaced source/working/context compositions; blog and
  informational destinations retain real route/content semantics. Policy and beta
  consent substance remains intact. No invented semantic retrieval capability.

## Motion/accessibility contract

Only finite animation from real entrance or a user action. No WebGL, animation
framework, remote font, image hotlink, timer-gated CTA, particle loop or fake AI
progress. Native scrolling/links remain usable. OS reduced motion and an explicit
desktop pause cancel in-flight animation and resolve the complete static layout.
Pausing preserves the current document scene. No hidden artwork receives focus.
No-JS has three server-rendered selected inputs in its context preview; inert
selection controls are clearly disabled, never dead interactive-looking actions.

## Evidence progression

Local affected smoke is exact-source DOM rendering, NOT HTTP/deployment proof;
the container browser policy blocks local HTTP navigation. Real HTTP route,
responsive, keyboard, mutation, source-mark, copy, empty-state and motion checks
must pass in the isolated website runner and the normal exact-head website CI.
Use `website/review_motion.py --output /tmp/website-v5-visual` to capture actual
HTTP native-scroll frames/GIF and responsive views. Screenshots must be visually
inspected; passing assertions are not an aesthetic score or owner approval.

After merge, the existing exact-main website+strict domain byte/browser readback
must pass. No claimed live deployment until that evidence exists. Keep the
extension writer and its evidence separate. Do not trigger a receipt-only CI loop.
