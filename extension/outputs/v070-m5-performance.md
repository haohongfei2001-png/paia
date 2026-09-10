# M5 performance — synthetic actual Chrome

Final full-suite measurements include contention on this machine. Provider timings are deterministic fixture processing, not cloud latency. All times are milliseconds unless stated.

| Entries | Topic first 40 | next 40 | search | index rebuild (s) | Organizer commit | suggestions 40 | stale batch 100 | resume |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1000 | 25.2 | 20.5 | 6.7 | 3.17 | 23 | 7 | 68.7 | 8 |
| 10000 | 46.6 | 36.6 | 62.4 | 42.58 | 8.1 | 33.8 | 58.1 | 8.4 |

| Inputs | v5 Thought migration (s) | dependency fan-out | full stale drain (s) | purge cleanup (s) | Input edit p95 | IDB transaction p95 / max |
|---:|---:|---:|---:|---:|---:|---:|
| 1000 | 0.39 | 1001 | 1.97 | 0.45 | 2.30 | 48.40 / 66.30 |
| 10000 | 5.74 | 10001 | 38.94 | 12.35 | 2.70 | 113.50 / 609.50 |
| 100000 | 11.21 | 10001 | 33.81 | 7.18 | 7.80 | 68.50 / 364.40 |

100k Inputs: collection 139.0 ms (101 reads / no bodies); document 106.9 ms (63 reads / 20 bodies); edit 1.1 ms (4 reads / 2 writes). Earlier IA / filter upgrade stages: 44.94 / 27.21 seconds. The v5 Thought migration column is a separate stage, not total upgrade time.

V8 heap sampled peak: 17,067,932 bytes, 117 samples at 100 ms intervals, below 512 MiB gate. It is archive renderer heap, not OS RSS; transient peaks between samples and lifetime growth are not measured. Editor journal additionally stays within its ~2M JSON-character bound.

Gates: document/suggestions <3 s, archive edit <2 s, Organizer commit/resume <5 s; bounded read/write counts and transport <=256 KiB per Topic page. At both scales input selection remains 8 Inputs / 80 reads; commit 59 reads / 30 writes; generated Topic first page 810 reads / 0 writes; suggestions 40 reads / 0 writes; stale 100 uses 313 reads / 401 writes. Manual Topic first/next: 202 reads each.

100 rapid persistent note edits were executed per scale. Normal revision coalescing remained enabled; history first page has 3 rows, and total work was 3516 reads / 701 writes. Full timing/count details are in the JSON files.

Known nonblocking limits: full lexical index rebuild and pathological 10,001-dependency maintenance can take tens of seconds, although each batch is bounded and resumable. Immediate read-time and commit-time fences prevent stale or purged data exposure while cleanup is pending. No data-safety gate was relaxed to improve totals.
