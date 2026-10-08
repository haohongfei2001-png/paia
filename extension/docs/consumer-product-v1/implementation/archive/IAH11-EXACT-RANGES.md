# IAH-1.1 original-safe Unicode ranges — bounded implementation

Base36da97a preserves selected Input-first presentation and exact CI admission.
The prior UI lowercased text then applied transformed offsets directly to original
UTF-16 prose. New negative tests exposed six failures, including İx/x out-of-range,
full-width and composed/decomposed forms, and ligatures. Keep the before log.

All three existing interfaces reuse core/search-service normalizeSearch, with a
single grapheme-to-original range adapter. Full-string matching preserves casing
context; mapped ranges cover original graphemes, overlapping expansion matches
coalesce, and unmappable lengths fail safely. Reading uses CSS Range only. No
canonical Input rewrite, new corpus, ranking, router or data schema is added.

Independent coordinator review passed. Seven complete related unit files35/35
pass. The existing whole source/release native file2/2 passes in17.5s, with actual
result keyboard activation into Reader and CSS Range evidence for İx/x, full-width
ＱＺ/qz and decomposed é/é. Both editable DOM text and the complete GET_INPUT DTO
remain byte-for-byte/equivalent unchanged before/after every arrival. Existing
selection, narrow/dark, title-only and zero-network checks remain. Native evidence
is in work/iah11-results/{source,release}-unicode.json; failure and final unit/native
logs remain local. No assertion or timeout was reduced or extended.

This closes the demonstrated Unicode offset defect only. Off-screen deep windows,
revision/eligibility revalidation, narrow filtered reveal, fresh primary Archive,
origin-aware Back and full IAH-04/05/06 acceptance still need their own evidence.
It is not an installed/current-live or final version claim. Reconcile Settings
and coherent product identity before formal integration.
