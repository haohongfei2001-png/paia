# PAIA soft-blue P — adopted brand assets

Adopted on 2026-10-21. The owner approved replacing the existing logos and icons,
while keeping the floating controls and the website ending unchanged.

The mark uses `#6284CD`. Its path is identical to the reviewed candidate.
The SVG title and description now describe its adopted status. Candidate and
production source digests are recorded separately in `manifest.json`.

## Asset roles

| Source | Use |
| --- | --- |
| `source/app-icon.svg` | Opaque white application tile; original 1024-square canvas |
| `source/symbol.svg` | Transparent mark with original canvas for the main UI and website brand lockup |
| `source/ui-symbol.svg` | Same path with `viewBox="128 128 768 768"` for compact toolbar and favicon use |
| `source/app-icon-maskable.svg` | Same mark scaled 0.8 about the center on white, inside the maskable safe circle |

The four `extension/icons/icon*.png` paths remain installation/application icons.
The four `extension/icons/action*.png` files are compact transparent toolbar
symbols. Archive and popup favicons use `action32.png`. The two existing UI
`paia-logo-*.png` paths use the standard transparent symbol, preserving the
reviewed 48 px / 40 px brand-container proportions.

All PNGs are exact approved bytes where already available, or direct exports
from the same vector geometry. The authority manifest binds sources to runtime
targets. `extension/scripts/build_brand_icons.py --check` validates every source
and all ten extension targets without writing. Without `--check`, it restores
the exact approved PNG bytes only after all sources and mappings pass.

## Explicitly preserved

- Extension floating orb, capsule and board code, geometry, behavior and all
  `extension/ui/assets/prompt-r3/` images.
- Website floating-control artwork and demonstrations.
- Homepage closing-story subtree, artwork, text, links and styles.
- Every website footer subtree and its styles.
- `assets/website/brand/paia-logo-v1.webp` and `paia-icon-v1.png`.
- The previous `design/brand/mailbox-final-20261018/` authority package.

Website header and preview references use separate new filenames so retained
story artwork is not changed through a shared asset. Generated English,
Chinese and legacy English alias pages must be rebuilt with `website/build.py`.

This is an asset-only adoption. It changes no archive data, permissions,
capture, AI processing, Sync or floating-control behavior. The extension patch
version is advanced according to `extension/DEVELOPMENT_WORKFLOW.md`; a source
integration does not prove that an already installed unpacked copy has reloaded.
