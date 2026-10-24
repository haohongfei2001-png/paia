# Website publication policy and spatial-home integration

## Owner direction — 2026-10-24

The owner explicitly requested: “上线，每次修改都上线”. Requested PAIA website
revisions are to be integrated into the official website and published after
source/regression checks. A separate preview, offline artifact or open PR alone
is not completion. Unless the owner explicitly requests preview-only or no
publication, finish with the official URL and a verified deployment result.
Do not treat this as authorization to change unrelated product data, grants,
services, installation availability, contact transport or workflow permissions.
Do not promise background delivery. Complete deployment in the active task or
report the specific verified blocker without claiming success.

## Current release — V15, 24 October 2026

The official home now renders the complete Thought folio via spatial-folio15.js.
It uses ordinary page flow rather than the rejected three-viewport sticky scene.
The shell entry is presentation15.js?v=20261024-v15. This version-specific URL
must not be reused for future changed runtime bytes. Both locale templates and
the /en/ generated alias carry data-website-release="atelier-v15-20261024".
The historical data-atelier-version=13 denotes only the unchanged fallback.
The painted body and #thoughts report data-spatial15=ready.

The previous entry URL was reused from V13 while its response allowed caching
for 600 seconds. This made stale-runtime display possible after deployment;
public byte equality in a cold browser alone did not rule that out. Future
releases must version their actual entry dependencies, regenerate their public
HTML and test a previous-cache scenario. A manual hard refresh is not a release
strategy. Existing cached documents may still remain until HTTP revalidation;
release links can explicitly request the current page query.

The existing visual source, all real-product boundaries, other page sections,
and independent tests are unchanged by this release-delivery fix.

## Historical V14 promotion

Base main: e56fecf43be89a9c2faed82f38fa3d55bffb750c.
The /design/thought-space/ visual study is promoted into the existing official
#thoughts section on Chinese, English and /en/ homepages. It is not merely linked
as another preview. The original headline, three topic/chapter directories and
two complete input records are taken from each locale's existing homepage.

The original page source remains as the progressive no-JavaScript/network-error
fallback. The shell entry loads spatial-home.js, which performs exactly two
fixed own-origin GETs for the approved study's HTML and CSS. It sends no user
content or credentials and has a finite timeout. Fetched scripts are not run.
The isolated Shadow DOM prevents glass/color/typographic styles from changing
Context, navigation, the hero, R3, other sections or the standalone product demo.
The old Thought timer no longer competes with the native-scroll component.
There is no iframe, scroll lock, server action, account connection or real AI.

The visible component is marked data-spatial14=ready on #thoughts and body.
The historical raw HTML data-atelier-version=13 denotes the preserved fallback,
not the visible spatial implementation. Do not mistake that static shell marker
for a failed deployment; verify the painted component and actual asset bytes.

## Verification and scope

Existing build.py --check remains authoritative for all 59 generated outputs,
which are unchanged by this progressive enhancement. The original static
preservation guards remain. spatial_home_checks.py targets the actually painted
shadow content, not the hidden fallback. It checks the real section offset,
forward/reverse scrolling, stable text/node identities, precise reading state,
reduced motion, actual Context permissions and unchanged R3 insertion semantics.
Original standalone demo, IME, consent, support and publication suites remain.

The implementation uses GitHub directly when the authorized local machine is
unresponsive. No workflow permissions are escalated and no private credentials
are read or exported. Release follows normal PR and Pages checks. Actual public
readback is distinct from branch CI. Passing browser assertions does not certify
aesthetic quality, installed-extension readiness or field performance.
