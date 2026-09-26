# Information architecture and route contract

## Navigation and conversion

Primary journey: understand PAIA → inspect the real bounded example → see relevance to an ongoing question → understand user control → request a beta invitation. Journal and story provide depth without taking over the primary CTA. The site does not invent login, pricing, app-store installation, a film or an email newsletter.

Header: Home `/`; How it works `/how-it-works.html`; Use cases `/use-cases.html`; Our story `/about.html`; Journal `/blog.html`; Get early access `/beta.html`. Active underline follows the route family. Secondary hero action “Explore an example” → `/demo.html`.

Use-case index: projects → `/use-cases/projects.html`; career → `/use-cases/career.html`; research → `/use-cases/research.html`. Each detail returns to the index and links to the same bounded public example and beta.

Journal: `/journal/context-is-a-practice.html`, `/journal/words-and-beliefs.html`, `/journal/keep-thinking.html`. Full drafted copy is in `copy/articles.json`. Author label “PAIA”; no made-up publication date, readership, founder quotation or product release evidence. The draft badge is a design-review label; publication requires explicit editorial review, after which it can be removed without changing layout.

Trust: practical data boundaries `/principles.html`; questions `/faq.html`; status `/status.html`; privacy `/privacy-policy.html`; terms `/terms.html`; photo credits `/credits.html`. Contact uses the existing publicly listed project mail address from the pinned policy, not a new collection endpoint.

Application: `/beta.html` → existing disclosed forwarding service → `/thanks.html` as an unconfirmed receipt page. A thanks URL is not evidence that the service delivered a message. Direct entry into that route must remain truthful.

Error: `/404.html` and explicit Chinese counterpart. Offer Home, then the existing example; do not replace the browser history action with an unexpected redirect.

## Locale and legacy routes

English is the root canonical language. Every route above has an equivalent `/zh/` route. Existing `/en/` deep links retain aliases to the English canonical. A locale change stays on the corresponding page; route mapping is explicit, not string substitution that loses nested paths.

Existing `/#how` remains a valid anchor to the homepage continuation section or a compatibility alias to the same story. Existing about/principles/demo/legal/beta/status filenames retain their meanings. New routes require reciprocal hreflang and sitemap entries in a later implementation, not in this design commit.

## No hollow destinations

Every visible navigation or footer text that looks like a link has a route above. “Photography credits” goes to the designed credits page. “Privacy · Terms” is two independent links with separate accessible names. Small arrows within a decorative source paper are not real controls unless the demonstration defines their action. There is no blog shell full of fake titles: the three articles are fully drafted.

## Content separation

Website narrative is public-safe fictional material. It is not a copy of the owner's private Drive documents or real AI archive. The synthetic examples do not certify production capability. The legal source text is retained from the existing public site. Current capability dates and supported-platform wording must be revalidated when implementation actually starts.
