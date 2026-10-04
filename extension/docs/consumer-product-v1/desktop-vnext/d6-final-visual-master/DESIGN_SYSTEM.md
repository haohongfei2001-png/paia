# D6.1 literal visual system

All values are proposed D6 design decisions, not measured performance claims. Stored vectors resolve their own exact coordinates. These roles must agree with the artboards before owner approval.

## Palette

| Role | Light | Dark |
|---|---|---|
| Canvas | #FFFFFF | #171D28 |
| Primary rail | #FAFBFD | #121823 |
| Primary text | #17233C | #E8EDF7 |
| Secondary text | #63728A | #B0BDD0 |
| Metadata | #68778E | #A5B4CB |
| Divider | #E6EBF2 | #303B4C |
| Quiet control surface | #F4F6FA | #202939 |
| Selected row | #EAF1FF | #263B5B |
| Link/focus/selection ink | #235DD3 | #94BAFF |
| Native text selection | #DDEAFF | #314D79 |
| Brand/AI-new accent | #A34F46 | #E2A295 |
| Warning ink/surface | #785A20 / #FAF5E9 | #E4C387 / #332C20 |
| Danger ink/surface | #B03549 / #FCF0F2 | #F4A2B1 / #38242D |
| Acknowledged success | #28694F | #96D7B9 |

Brand accent is not a destructive action or selected decision. Decisions use labeled neutral/blue selected controls; danger remains separate. Do not encode meaning only through color. Decorative separators need not masquerade as interactive control outlines.

## Typography

Reference rendering: Noto Sans CJK SC for UI/prose and Noto Serif CJK SC for CJK titles; Georgia when available for Latin title glyphs. No font files are included and no network font is requested.

Shipping role stack: UI/prose `Noto Sans CJK SC, PingFang SC, Microsoft YaHei, system-ui, sans-serif`; title `Georgia, Songti SC, Noto Serif CJK SC, SimSun, serif`; code `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`. Record actual used fonts for comparison; native-platform glyph differences do not authorize a different layout or a sans title substitution.

| Role | Size / leading | Weight |
|---|---|---|
| Main title |28 /38 desktop;24 /35 compact |500 serif |
| Topic-row title |23 /32 |500 serif |
| Year heading |24 /33 |500 serif |
| Section title |17–18 /26 |500–600 sans |
| Reading text |16 /29 |400 sans |
| UI/navigation |13–14 /21 |400;selected500 |
| Metadata |12 /20 |400 |
| Button |13 /20 |500 |
| Code |13 /21 |400 mono |

Long titles wrap rather than disappear; full title remains in the Reader and accessible labels. Never change stored text to achieve wrapping. Normal Reader text is800px maximum, Topic content936px maximum, Context880px, Compare960px. Existing saved reading preferences override default body width/size and are not deleted.

## Geometry

1440+: rail184; Archive navigator312; main uses the remainder. Reader left inset44, max text800, right margin at least44. Root/Topic heading inset44; content cap936. Context and Compare are centered within the workspace at880/960 caps. Header title baseline52, subtitle80. Reader first time-caption baseline150; first prose baseline181. One lightweight sort and overflow sit on the title line. No extra72px generic toolbar band above the Reader title.

1280–1439: rail184, navigator280.1024–1279: rail160, navigator240.768–1023: rail64, navigator becomes a temporary sheet; content uses36–44px gutters where width permits. Below768 use stacked navigation and20px gutters. See RESPONSIVE for reachability and state preservation.

Spacing:4/8/12/16/20/24/32/40/44/48/56/64. Divider1px. Selected rows6px radius; input/search7–8px; button6px; modal10px. Prose/evidence never become elevated cards. Elevation is reserved for selection toolbar/menu/modal. Production shadow target `0 4px 18px rgba(23,35,60,.10)` for menus; `0 18px 60px rgba(23,35,60,.18)` for modals. Static vector edges remain flat to keep exact text and geometry readable.

## Shared components

PrimaryNav: fixed exact mark+wordmark; three labeled destinations; selected blue row; Settings bottom. Navigator: one explicit Reader search, meaningful project title, consistent two-line Conversation rows, quiet Source changes. ReaderHeader: title, quiet dates, single sort, overflow. ReaderInput: native exact body, quiet actual time, whitespace separation. SelectionToolbar: anchored transient actions only. Menu/Original/History: explicit target, one modal, clean read-only text, no IDs/provider/model/token inspector.

TopicRow: quoted cue, quiet actual span/recency. YearSection: true count and visible count where needed, complete reveal. CandidateChange: canonical field, exact Current/evidence and AI-new or structure label; decisions remain staged. ContextMaterial: human-selected versus intentional supplement origin; final output edits do not write back. Recovery/Warning: local state, truthful outcome, primary recovery action and no false saved/sent label.

All controls require visible focus and native semantics in D7. Minimum target32 desktop,44 narrow/coarse. Keep16–18px glyphs inside those targets. SVG artboards depict appearance, not a keyboard implementation.

The drawings show the36px visible button face (38px search). Narrow/coarse native hit targets extend to44px without changing16–18px glyphs: use a transparent non-overlapping outer hit area. Never implement a36px coarse hit target because the image face is36px. Focus surrounds the actual target; full tab order and semantics require production validation.
