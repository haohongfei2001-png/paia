# Observed Ubuntu24 APT fragments

These unmodified configuration snippets are public distribution/source files, not captured private host configuration. Their bytes and SHA256 match the sanitized observation from PR313 run39788048944, attempt1, image20261012.334.1, Ubuntu24.04 / APT2.8.3. See provenance.json for each fixed installed path, official source, byte length and observed fingerprint.

- 01autoremove: upstream Debian APT2.8.1 `debian/apt.conf.autoremove`, also byte-identical to Ubuntu APT2.8.3 source. APT is GPL-2.0-or-later; upstream `COPYING` and `debian/copyright` apply.
- 20apt-esm-hook.conf: Canonical ubuntu-pro-client commitedd557122037276e5dc8ec803b5e48fd6c6fc62c, `apt-hook/20apt-esm-hook.conf`; upstream `COPYING` / `debian/copyright` apply.
- 20snapd.conf: Canonical snapd commit38078ae775e4c41807f60e17b24d1af6f0c26801, `data/apt/20snapd.conf`; upstream `COPYING` / package copyright apply.
- 50appstream: official Ubuntu appstream1.0.2-1build6 package, original `/etc/apt/apt.conf.d/50appstream`; package copyright applies.
- 50command-not-found: official Ubuntu command-not-found23.04.0build1 package, original file; package copyright applies.
- 99needrestart: official Ubuntu needrestart3.6-7ubuntu4.5 package, original file; package copyright applies.

The helper does not execute fixture hooks. Tests only parse these bytes. The two exact-hash exceptions concern apt-CLI-only hooks; no generic Binary/include exception is permitted. Mutations, renaming and additional command overrides remain rejected. Actual updated-helper native configuration, signature enforcement, font download/install and cache/browser qualification are NOT_RUN here.
