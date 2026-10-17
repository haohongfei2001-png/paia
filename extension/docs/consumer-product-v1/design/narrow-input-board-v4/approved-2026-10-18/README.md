# PAIA floating input — approved B 句瓣

Design delivered2026-10-17; approved2026-10-18 (Asia/Shanghai). Contract: [PAIA-FLOAT-UI-1.1](../../../NARROW_INPUT_BOARD_V4_SPEC.md). Only B is the production target. A/C/D remain exploration, not user-selectable themes.

## Open the design

- [Interactive prototype](PAIA_输入锚定_交互原型.html): download and open this self-contained HTML; use the default B interaction view. Light/dark, three states, inserted feedback, growing composer and narrow/short viewport demonstrations are included.
- [Independent review](PAIA_独立设计评审.html): complete reasoning and limitations, with embedded screenshots.
- [Exact visual tokens](assets/PAIA_视觉参数.json), [light SVG](assets/PAIA_句瓣_浅色.svg), [dark SVG](assets/PAIA_句瓣_深色.svg).
- [Offline browser record](assets/PAIA_浏览器验证记录.json) and [source/published hash manifest](manifest.json).

Main B/token authority uses a19px capsule mark; the comparison miniature uses18px. Do not implement the design studio, synthetic host/data, global CSS or textarea writer as product features. This bundle does not implement the extension.

## Screenshots

All nine captures are1363×936px browser screenshots; normal components retain their real CSS dimensions inside the page.

| Capture | Meaning |
|---|---|
| [Light entry](screenshots/PAIA_浅色_入口.jpg) | Default40px SVG /44px target above the composer |
| [Light capsule](screenshots/PAIA_浅色_胶囊.jpg) |272×44px one-expression shortcut |
| [Light board](screenshots/PAIA_浅色_浮板.jpg) |336×312px six-row information surface |
| [Dark entry / long content](screenshots/PAIA_深色_入口_长内容.jpg) | Small static mark in a dense dark conversation |
| [Dark capsule / long expression](screenshots/PAIA_深色_胶囊_长句.jpg) | One-line ellipsis affects display only |
| [Dark board / long content](screenshots/PAIA_深色_浮板_长内容.jpg) | Neutral information surface, restrained contrast |
| [Growing composer](screenshots/PAIA_浅色_输入框增高.jpg) | Whole board moves upward and preserves the anchor gap |
| [Directions A/B](screenshots/PAIA_方向对比_AB.jpg) | Comparison history; B selected |
| [Directions C/D](screenshots/PAIA_方向对比_CD.jpg) | Rejected comparison history |

The two HTML public copies change only one private-source link target each to the public product-intent contract. All visual/interaction bytes and embedded images otherwise remain unchanged; SVG/JSON/JPEG assets are byte-identical. The manifest records both identities. The older baseline in the design files is provenance, not current main.

The host is a synthetic ChatGPT-like scenario.16 recorded Chrome checks and the mixed24-minute inspection do not establish installed compatibility, real p95/120Hz, live IME or sustained human comfort. Review limitations remain open for production acceptance.
