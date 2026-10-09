# SET2-04 fixed About public destinations — 2026-10-09

One read-only HTTPS check at2026-10-09T04:50:43.997243Z, exact main `e21b5543eaa9db9bf8e4b19dddfdfd0ee6b26ec2` and candidate `de591f3f0bb9219e827c94d02382ab95b0b95561`. The existing settings-about owner and all six public files are byte-identical between those snapshots. No runtime/site content, account, deployment or mail action changed.

All six exact existing destinations returned200, text/html UTF-8, no redirect; each response matches exact-main repository bytes and its requested locale. Root verified the complete six-result metadata; `/tmp/set2-about-public-destinations-20261009.json`, SHA-256 `c04e9909f84ac831c21be93e1d9e4facae17577ed363205d00c16739c5356d48`.

| Existing destination path on https://inputarchive.com | Locale | Bytes | Exact source/live SHA-256 |
| --- | --- | --- | --- |
| privacy-policy.html | en |6524|94cabe27802fc03a9e0395e4924c0a542392452c735e7948cfb4d208b236df8e|
| terms.html | en |5575|d2847b85628b355774602981cddcb9a053ac5ff9d1602b8bd0455b145881cc3b|
| how-it-works.html | en |7608|36f11e09fb2c84c2f8079c15a13f575cdb2ac09171a82f2e51968f8c93de6d8f|
| zh/privacy-policy.html | zh-CN |6332|e1f087267264cb8663dfff2cc6a6dec860691b15318642f24e41bd285b1b44a3|
| zh/terms.html | zh-CN |5510|5f882d5238c3f5dee87e458cd7c0f412015d9b1d14ec8427fd9622850c3fbb08|
| zh/how-it-works.html | zh-CN |7424|a2774912989e4a05b07d09a5ec4bfa067bcb379a00f5c57972a37b7185993b32|

This closes only current published target reachability/locale/byte checks for the already established About links. It is not visual/legal correctness, screen-reader/OS input, live Context/Prompt, distribution update/installation, supported-system or completeSET2 acceptance. Feedback mailto was not opened and no message was sent. HTTP responses contained only existing public PAIA pages; no user/archive/profile/credential data was read or sent. No repeated same-SHA CI/deploy was used. Future reuse requires these owner/file/destination dependencies to remain unchanged; this observation is not automatically a later live check.
