# CPR-00 Frozen Provider Contract — ChatGPT Project Recognition

Status: **FROZEN by CPR-00 live PASS**

Frozen on: `2026-09-22`

Applies to: supported current ChatGPT Web Project conversation surface.

## Verified provider channel

CPR-00 verified one production-eligible evidence chain:

1. the current conversation route is a ChatGPT Project conversation route;
2. its Project route segment contains a canonical opaque Project identifier
   matching `g-p-<32 hex>` at the start of the segment;
3. a visible same-origin Project-home link exists for that same Project
   identifier;
4. the visible Project-home link supplies exactly one Project display-name
   candidate;
5. the current conversation identity remains independently bound to the current
   conversation route.

The live verified channel name is:

`route_plus_matching_project_home_link`

## Frozen meanings

### projectIdentity

Provider Project identity is the opaque canonical `g-p-<32 hex>` identifier
taken from the current Project conversation route.

The human-readable route slug is not Project identity and must not be stored as
one.

### projectName

Project name is the visible provider text associated with the matching
same-Project Project-home link.

Project name must not be inferred from:

- the Project route slug;
- conversation title;
- message body text;
- PAIA user-authored content;
- sidebar visual proximity alone.

### membership

Current Conversation→Project membership is established only when the current
conversation route itself carries the verified Project identity and the
same-Project Project-home evidence is present.

Membership changes relationship metadata only. It must not alter Source identity,
message identity or content bodies.

## Required negative behavior

The following are explicitly non-Project or insufficient evidence:

- ordinary `/c/<conversation>` chat;
- custom GPT `/g/g-.../c/<conversation>` routes that do not carry the verified
  `g-p-` Project identity shape;
- Project-looking text or links inside user/assistant message bodies;
- conversation-title text matching a Project name;
- sidebar proximity without route-bound Project identity;
- stale SPA nodes, mismatched route/conversation evidence or malformed identifiers.

These cases fail closed to no new Project fact.

## Lifecycle evidence proven in CPR-00

The verified channel remained stable across:

- same Project conversation before and after a true document reload;
- navigation from the Project conversation to an ordinary chat in the same tab;
- return to the original Project conversation in that same tab.

The ordinary chat produced no Project channel.

## Privacy boundary

The production observer may inspect only the body-free structural evidence needed
for this contract.

It must not use:

- user message bodies;
- assistant bodies;
- drafts/editor text;
- cookies;
- credentials;
- unrelated pages.

For Git/live certification evidence, raw Project IDs, Project names,
conversation IDs and URLs must not be emitted. Run-local salted digests, fixed
states and counts are allowed.

## CPR-01 implementation boundary

CPR-01 may implement this frozen verified channel in the ChatGPT
source-structure provider and admission path.

CPR-01 must not silently broaden the contract to unverified alternatives such as
sidebar proximity or generic header heuristics. Any additional provider channel
requires separate live evidence before it can become production-verified.

Production capability flags remain unchanged by CPR-00. They may become
`verified` only in CPR-01 after this frozen contract is implemented, validated
and admitted through the existing trust boundary.
