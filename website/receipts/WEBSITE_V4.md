# Website v4 — selected reference implementation

Status: IMPLEMENTED / HTTP_BROWSER_PASS / PDF_EXPORT_PASS / PRODUCTION_READBACK_PENDING.

## Scope and authority

Owner requested implementation of the last supplied PAIA full-homepage image and a complete website PDF. Earlier explicit requirements remain: text-only opening followed by native-scroll input collection, sparse purposeful copy, precise source marks and three custom benefit icons, calm advanced AI-product positioning, generous normal proportions. This is a website-only batch; no extension runtime, private archive, account or permission changes.

Baseline remote main: `75dafc2a698560098c88ce06269230c475ff73b3`.
Single website writer: PR #85 / `website/scroll-context-v4`.
Pre-integration main: `95bb250f330a9ace79a873e0fe2906f7e4c446cc`; its one intervening commit changes extension evidence docs only. Preserve it at merge.

The rejected prior 90-artboard package is historical, not the current visual implementation authority. Entry point: root `WEBSITE_DESIGN.md`, then `website/README.md`.

## Implemented

Native, reversible desktop scroll brings in source cards progressively, with the PAIA context card last; reduced-motion, small screens and no-JS retain visible content without a scroll trap. Source cards and mini product surface are HTML, with separate SVG marks and custom vector benefit icons. The homepage mini application has real selection, empty selection, search and keyboard tabs. The full local demo preserves edit/original separation, filters, stale-context invalidation, copy and export.

16 canonical page types: home, how-it-works, use-cases, demo, about, blog, three complete articles, data principles, beta, status, privacy, terms, thanks and 404. English root and paired Chinese routes are complete; legacy English aliases are retained (48 HTML routes). Privacy/terms substance and existing beta-forwarding destination/explicit consent remain unchanged. No test submits the form.

ChatGPT capture scope and private-beta state are explicit. Claude/Gemini hero cards are labelled planned. Website examples are fictional, browser-local and disconnected from an archive or AI provider. No imaginary film, testimonial, login, universal provider integration or autonomous personality inference.

## Actual evidence

Successful implementation/export workflow: [36268710544](https://github.com/haohongfei2001-png/paia/actions/runs/36268710544).
Input head: `52d48cd7aae1ebffd187b78fce89ef70747145cc`.
Verified generated implementation committed by workflow: `b923dde36344b7e4e235fbcc7b739b6eaa4e6590`.
Artifact: `website-v4-proof` / 10915215247, SHA256 `59ad3910556bfd9f2977954e92acf31f8c2042f59d2ee79c01830c025bba7693`.

Real Chromium over local HTTP: 2966 assertions, zero failures. Includes 48 routes at 1440/768/390/320 widths, narrow 200% text, exact generation, locale/canonical/internal links, assets/fonts, keyboard navigation, scroll start/mid/end/reverse, reduced-motion, no-JS, mini-app selection/search/tabs, full-demo original immutability, safe text, stale invalidation, exact clipboard/download and beta consent without transmission. These are website tests, not extension or physical-device certification.

Downloaded workflow outputs were re-opened independently. Full English and Chinese PDFs each have 21 bookmarked pages: 16 full native route captures plus three full-demo states and two extra product-panel states. All 42 native pages contain extractable text; replacement-glyph count is zero. Four additional motion frames and an animated GIF were captured from actual browser scroll, not image generation. Whole-route PDF pages are not rasterized screenshots. Only the motion PDF is raster keyframes.

Native-PDF contact sheets for both languages and all motion frames were visually inspected, plus full-size hero/product/mobile and Chinese form/text samples. A second PDF renderer (Poppler) rendered the home PDFs. No blank pages, clipped canonical routes or missing source icons were observed in this review. This is not an exhaustive accessibility, cross-browser or aesthetic certification.

Delivered file digests:
- `PAIA-Website-EN.pdf`: `b421540791755f811e7c8d4009d8efadde1f598753aa556412f6ddbd3e397041`.
- `PAIA-Website-ZH.pdf`: `f6c56a9b0a501e8f78e84f577dfda1fd1a12d96a1baeb70016d1402301163a96`.

## PDF repair record

A first export exposed fractional Chromium pagination (one route had a fractional footer on a second page). Eight additional CSS pixels preserve all content at scale 1 without dropping overflow pages. A second export completed the English file but the old native PDF renderer crashed during document teardown. The corrected exporter copies/crops extra-state pages without cross-document form grafting and uses pinned PyMuPDF 1.26.7. The successful run exported both languages, all motion evidence and passed before allowing any generated-source commit. Failed export runs are not PASS evidence.

## Reproduction and limitations

Install `website/pdf-requirements.txt`, install Chromium with Playwright, then run `python website/export_pdf.py --output /tmp/paia-pdf`. Serve/read the real repository website; do not substitute artboards. The full-site PDFs use the reduced-motion final composition so no content is hidden; the four-keyframe PDF/GIF separately explain the normal animated opening. PDFs cannot reproduce interaction.

The architectural image is the exact text-free crop from the owner's supplied generated reference, not a high-resolution original photograph. Coast/light are fixed sourced substitutions; do not claim pixel-identical original assets. Actual aesthetic approval remains with the owner.

Temporary transfer files and the authoring workflow are removed in the integration commit. Production deployment/readback is a separate final check: inspect the exact merged-head PAIA Website workflow `live` job and its `live-review.json`. Until it passes, do not claim the reviewed bytes are online. Closure is recorded in PR #85 without triggering another unnecessary website build for a receipt-only loop.
