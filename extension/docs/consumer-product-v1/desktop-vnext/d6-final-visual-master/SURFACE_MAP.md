# Surface coverage — 39 frozen surfaces

All39 frozen IDs have a direct full-window master. Supplemental state IDs are drawing aliases only, not new product routes. Unpack the finished assets before opening the gallery or the links below. Each image is also available as a standalone SVG; the review package includes a PNG of each state.

| Frozen ID | Surface | Exact visual reference |
|---|---|---|
| A01 | Archive root | `screens/A01-1440-light.svg` |
| A02 | Reader | `screens/A02-1440-light.svg` |
| A03 | Selection | `screens/A03-1440-light.svg` |
| A04 | Direct editing/save | `screens/A04-1440-light.svg` |
| A05 | Save failure | `screens/A05-1440-light.svg` |
| A06 | Overflow | `screens/A06-1440-light.svg` |
| A07 | Original | `screens/A07-1440-light.svg` |
| A08 | History | `screens/A08-1440-light.svg` |
| A09 | Reader search | `screens/A09-1440-light.svg` |
| A10 | Source changes | `screens/A10-1440-light.svg` |
| A11 | Remove | `screens/A11-1440-light.svg` |
| A12 | Purge blocked | `screens/A12-1440-light.svg` |
| T01 | Topic root | `screens/T01-1440-light.svg` |
| T02 | Topic Content | `screens/T02-1440-light.svg` |
| T03 | Dense Topic | `screens/T03-1440-light.svg` |
| T04 | Years | `screens/T04-1440-light.svg` |
| T05 | Add Thought | `screens/T05-1440-light.svg` |
| T06 | Dense Topic root | `screens/T06-1440-light.svg` |
| O01 | Organize scope | `screens/O01-1440-light.svg` |
| O02 | Running | `screens/O02-1440-light.svg` |
| O03 | Candidate ready | `screens/O03-1440-light.svg` |
| O04 | Compare | `screens/O04-1440-light.svg` |
| O05 | Decisions | `screens/O05-1440-light.svg` |
| O06 | Stale candidate | `screens/O06-1440-light.svg` |
| O07 | Many changes | `screens/O07-1440-light.svg` |
| C01 | Task | `screens/C01-1440-light.svg` |
| C02 | Select | `screens/C02-1440-light.svg` |
| C03 | Retrieve | `screens/C03-1440-light.svg` |
| C04 | Review | `screens/C04-1440-light.svg` |
| C05 | Output edit/redact | `screens/C05-1440-light.svg` |
| C06 | Stale Context | `screens/C06-1440-light.svg` |
| C07 | Over-budget | `screens/C07-1440-light.svg` |
| C08 | Ready | `screens/C08-1440-light.svg` |
| C09 | Copied | `screens/C09-1440-light.svg` |
| C10 | Denied | `screens/C10-1440-light.svg` |
| S01 | Settings | `screens/S01-1440-light.svg` |
| S02 | Recovery | `screens/S02-1440-light.svg` |
| S03 | Capture status | `screens/S03-1440-light.svg` |
| S04 | Import/Backup | `screens/S04-1440-light.svg` |

## Additional states

A00 Archive empty; A13 unknown save acknowledgment; A14 loading; T00 empty Thought; O08 first-generation candidate with no saved Current; O09 request failure; C00 no matching supplement (selection retained); C11 incomplete coverage (release blocked); S05 failed backup validation.

Four dark references: A02/T03/O04/C04. Seven compact references: A02 at1280/1024/768/320; C01 at768/320; O04 at768. Other dark states replace only declared color tokens. Other compact states use RESPONSIVE plus identical mapped body/control ordering. A state requiring a new layout, unknown dismissal/return behavior or an unpictured special control is not “derived”; obtain a D6 amendment before implementing it.

## State rules that need no new product design

Saved appears only after the existing durable acknowledgment and uses the same local status slot as A04. Failure A05 preserves text and exposes Retry/Copy through the existing recovery path. Unknown A13 uses readback, not a fake failure or automatic duplicate write. Conflict uses A08's stacked/paired compare layout and existing explicit reconciliation, never last-write-wins. Partial reads use C11's warning and blocked downstream action. C06 stale and C10 denied differ: denial clears forbidden body. Empty retrieval C00 is not empty explicit selection.

A state drawing does not freeze synthetic dates, texts, statuses or totals into production. Full source text, actual counts and current capability state remain runtime facts.
