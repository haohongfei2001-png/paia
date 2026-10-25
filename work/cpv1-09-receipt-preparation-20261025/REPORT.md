# CPV1-09 original receipt request preparation — local only

Base `d333e7998a722dc6858cf8471f389b292b5319d3`; isolated branch `codex/local-cpv1-09-receipt-preparation-20261025`. No production runtime or shared Assist harness changed.

## Exact scope

The existing native fixture now calls the real worker `PAIA_PROMPT_INSERT_PREPARE` for each new explicit test request. It checks the original selected text, takes the returned `insertionAction` unchanged, and uses that action's original operationId for `PAIA_PROMPT_INSERT`. No caller-minted insertion receipt, ACK, synthetic signature or production opt-out is introduced.

The uncertain duplicate case prepares once and retains the same request/action for both calls. The SPA stale test obtains its real prepared action before changing the URL, then sends that original action; it does not catch a failed prepare and fabricate an insertion failure. The unsupported composer case still uses a new explicit request. The real UI click already uses the original PREPARE path and is unchanged.

Exactly three reversible text changes account for the entire native-file diff. Restoring these three changes produces byte-for-byte baseline equality: all Source/release × legacy/current DOM signature cases, 180000 ms timeout, Unicode/caret/IME/native readback, uncertain/no-retry, clipboard, draft preservation, no-send/privacy/network assertions remain. These DOM signatures do not mean old/new receipt protocol constructors.

## Local checks and preserved evidence

- New pure Node request-helper controls against unchanged baseline: **0/4**, exit 1, TAP **47.776208 ms**. Full failure log and original native source retained.
- The same four controls after the minimal preparation change: **4/4**, exit 0, TAP **49.217875 ms**, no cancellation/skip/todo.
- Native file syntax-only check: exit 0; it does not import or execute the file.
- Exact three-change reverse transformation and original baseline equality: passed, recorded in static-preservation.json.

The Node controls extract only the exact request helper from the owning test source, with a synthetic RPC responder for request-shape/order checks. They prove no native effect, no real receipt authority, no real ACK and no browser correctness. They do not import the native test module. Original production request/receipt semantics were read in prompt-reuse-commands.js, prompt-insertion-worker-receipts.test.mjs and prompt-insertion-producer-receipts.test.mjs; those tests were not rerun.

## Remaining qualification

**Native Source/release execution, native IME/readback and complete owning acceptance: NOT_RUN.** This is prepared test wiring, not a claim that native browser behavior passed. No browser, build, download, package installation, cloud CI, provider, account, user data, deployment or remote push was performed. The original exhausted run allowances and 4096-reference / 2 MiB / 30-second production budgets remain unchanged. Assist native migration is a separate owner package and was not edited.
