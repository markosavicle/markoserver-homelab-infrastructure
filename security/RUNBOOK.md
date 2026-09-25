# Security Operations Runbook — markoserver Homelab

Last updated: 2026-09-06
Owner: Marko Savic

---

## 1. What's Monitored

### SIEM: Wazuh 4.14.7
- **Manager, Indexer, Dashboard** deployed via Docker Compose (`wazuh/docker-compose.yml`), reachable at `https://wazuh.markoserver.local` (self-signed wildcard TLS cert via Nginx Proxy Manager).
- **Agent** installed natively on the host (not containerized), communicating with the manager over `127.0.0.1:1514/1515` since both run on the same physical machine — no agent traffic is exposed beyond localhost.

### Active modules (host agent)
| Module | Status | Coverage |
|---|---|---|
| File Integrity Monitoring (FIM) | Active | Real-time watch on `/etc`, `/etc/ssh/sshd_config`, and this repo's working directory; full scans on `/etc`, `/usr/bin`, `/usr/sbin`, `/bin`, `/sbin`, `/boot` every 12h |
| Rootcheck | Active | Rootkit/hidden-process/suspicious-file scan, every 12h |
| Syscollector | Active | Hourly inventory of packages, users, network, processes — feeds Vulnerability Detection |
| Vulnerability Detection | Active | Correlates Syscollector package inventory against CVE feeds; enabled by default in 4.14.x |
| SCA (compliance scanning) | **Disabled — known gap, see §4** | No matching CIS benchmark for the host's actual OS version |

### CI security gate
- **Trivy** scans `diskont-pos` frontend and backend Docker images on every push/PR touching `diskont-pos/**` (`.github/workflows/security-scan.yml`), running on the self-hosted GitHub Actions runner.
- Currently configured with `exit-code: '0'` (report-only, does not fail the build) while the team calibrates noise levels. Plan to flip to `exit-code: '1'` for CRITICAL findings once dependency-vs-build-tooling triage (§3) is finalized.

### Brute-force protection
- `fail2ban` active on the `sshd` jail, monitoring `_SYSTEMD_UNIT=ssh.service`.

---

## 2. Real Findings From This Deployment Pass

### 2.1 FIM alert — verified working (test alert)
Deliberately modified `/etc/security-test-file` (`chmod 777`) to confirm end-to-end alerting. Result: alert fired within ~1 minute, correctly classified as `rule.id: 5402`, MITRE ATT&CK `T1548.003` (Privilege Escalation / Defense Evasion), mapped to GDPR IV_32.2, HIPAA 164.312.b, PCI DSS 10.2.5/10.2.2, NIST 800-53 AU.14/AC.7/AC.6. Confirms FIM → alerting → MITRE/compliance-mapping pipeline is functional end-to-end.

### 2.2 Trivy scan — diskont-pos-frontend:scan
**Summary**: ~50 total findings across OS packages, Node.js dependencies, and a bundled Go binary. Triage below.

| Finding category | Example | Disposition | Rationale |
|---|---|---|---|
| Alpine base OS packages (`libssl3`, `libcrypto3`) — 2 CVEs | CVE-2026-14456, CVE-2026-45447 | **Fix** (planned) | Real runtime dependency; remediated by tracking current Alpine base image rather than a stale pinned digest |
| npm's own bundled CLI dependencies (`tar`, `brace-expansion`, `cross-spawn`, `glob`, `minimatch`, `ip-address`, `pacote`, `sigstore` — ~40 CVEs incl. 1 CRITICAL) | CVE-2026-59873 (tar, CRITICAL) | **Accept** | Shipped as part of `node:20-alpine`'s bundled `npm`; not invoked at runtime in a `npm run dev` serving container — no reachable attack path in current architecture |
| `vite` (project dependency) | CVE-2026-53571 (`server.fs.deny` bypass) | **Accept, revisit** | Windows-specific path-handling bug; container runs Linux. Will bump on next routine dependency update. |
| `esbuild` + bundled Go stdlib (25 CVEs incl. 2 CRITICAL) | CVE-2024-24790, CVE-2025-68121 | **Accept, architectural decision** | Build-tool binary present because the container currently runs Vite's dev server (`npm run dev`), which requires the full toolchain at runtime. A production multi-stage build (compile once, serve via nginx, discard build tooling) would eliminate this entire category, but was deliberately deferred since the frontend is under active daily development and the live-reload workflow has real value. Revisit when the app reaches a more stable/less-actively-developed phase. |

**Key judgment call**: the majority of findings (build tooling, not runtime application code) do not represent a real, reachable risk in the current architecture. Rather than chasing individual CVE patches in code that never executes in production, the actual fix is architectural (multi-stage build) — deliberately scheduled as future work rather than done reactively under time pressure.

### 2.3 Secrets found hardcoded in version control
- `diskont-pos/backend/seed.js`: fallback password `'DiskontPosPassword123!'` used if `DB_PASSWORD` env var was ever unset — silently degraded to a weak, now-public password rather than failing loudly.
- `diskont-pos/docker-compose.yml`: same password hardcoded in plaintext (×2).
- `wazuh/docker-compose.yml`: `INDEXER_PASSWORD`, `API_PASSWORD`, `DASHBOARD_PASSWORD` hardcoded in plaintext.

**Remediation**: all four moved to git-ignored `.env` files, referenced via `${VAR}` interpolation in Compose. `seed.js` now throws on startup if `DB_PASSWORD` is unset, rather than silently falling back.

### 2.4 CI/CD pipeline logic bug (found and fixed)
The `main.yml` deploy workflow's "smart diff" logic compared `git diff HEAD origin/main` — but `HEAD` was already `origin/main` at that point in the script (either because `actions/checkout` had already moved it, or because a human's interactive `git` session on the same server shared the working directory with the automated job). Effectively, **the diff always returned empty**, meaning the "only rebuild what changed" logic had likely never worked correctly, though services still appeared to deploy via the unconditional `git pull`.

**Root cause**: the deploy job operated directly on the same working directory as manual interactive git usage, with no `actions/checkout` isolation.

**Fix**: replaced the flawed diff with `github.event.before`/`github.sha` (GitHub's authoritative pre/post-push commit references), and made the working-directory sync unconditional and explicit (`git checkout -f main && git reset --hard <sha>`), independent of whatever branch a human happened to have checked out interactively.

**Verified via controlled test**: pushed a change touching only `wazuh/`, confirmed the Action log showed the correct file in the diff and rebuilt only the Wazuh stack, correctly skipping the other five services.

### 2.5 Infrastructure incident: Wi-Fi ARP disruption from Docker network churn
Creating a new Docker bridge network (during initial Wazuh cert generation) caused a transient ARP-table invalidation that took down the Wi-Fi route to the LAN gateway, resulting in total SSH lockout requiring physical console access to diagnose and recover.

**Root cause** (confirmed via `journalctl`/`dmesg` correlation): bridge creation triggers a kernel netlink route-change broadcast; on this host's Wi-Fi driver, the existing ARP entry for the gateway did not self-heal, unlike what would be expected on a wired interface.

**Mitigation applied**: none structural yet (Ethernet is available but not yet connected as primary). **Documented residual risk**: this can recur on any future Docker network create/recreate while running on Wi-Fi.

**Recommended follow-up** (not yet done): connect the host via Ethernet as the primary network path; add a cron-based self-heal watchdog that bounces the Wi-Fi interface if the gateway becomes unreachable.

### 2.6 Documentation drift
README described the host as Ubuntu 24.04 LTS; actual installed OS is Ubuntu 26.04 LTS. Corrected across all 4 references. Root cause unknown (likely an in-place upgrade at some point that was never reflected in documentation) — a reminder that infrastructure docs need periodic verification against actual system state, not just updates when something changes.

---

## 3. Known Limitation: SCA Compliance Scanning

**Status**: Non-functional, by deliberate decision — not a bug.

**Finding**: Neither the bundled CIS Ubuntu 22.04 nor a manually-added CIS Ubuntu 24.04 SCA policy matched this host, because it actually runs Ubuntu 26.04 ("Resolute Raccoon") — discovered while debugging repeated `Skipping policy: 'Check Ubuntu version.'` log entries. No official CIS benchmark yet exists for 26.04 (confirmed via community GitHub issue history; 24.04 support itself only shipped in Wazuh 4.12, months after that release).

**Decision**: rather than force-fit the 24.04 policy against an OS it was never validated against (risking false positives/negatives on checks written for a different release), SCA is left disabled-by-omission for this host. All other Wazuh modules are unaffected and fully active.

**Re-evaluate when**: CIS/Wazuh publish an official Ubuntu 26.04 benchmark, or the SCA module supports version-fallback matching.

---

## 4. Automated vs. Manual (Current State)

| Area | Automated | Manual |
|---|---|---|
| Vulnerability scanning (CI) | Yes — Trivy on every relevant push | — |
| Vulnerability scanning (host) | Yes — Wazuh Vulnerability Detection, hourly Syscollector | — |
| FIM alerting | Yes — real-time on watched paths | — |
| Patch application | — | Manual — no automated patching pipeline yet. **Known next step.** |
| Secrets rotation | — | Manual — `.env` files are correctly excluded from git, but rotation itself (e.g. after this runbook becomes public/shared) is a manual action not yet scheduled |
| Deploy on push | Yes — self-hosted CI/CD, fixed diff logic (§2.4) | — |
| SIEM alert triage | — | Manual review of Wazuh dashboard; no alert-routing/paging configured yet |

---

## 5. Incident Response Sketch — Unexpected SSH Login Alert

If Wazuh's FIM/PAM rules fire an alert for an SSH login from an unrecognized source:

1. **Confirm it's real, not a false positive**: check `last -n 20` and `sudo journalctl -u ssh --since "1 hour ago"` directly on the host — cross-reference source IP against known/expected access (home IP, VPN, etc.).
2. **Isolate if genuinely unauthorized**: `sudo ufw deny from <source-ip>` immediately; since UFW is already default-deny-incoming, this adds an explicit block rather than relying on absence of a rule.
3. **Rotate credentials**: since this host uses Ed25519 key-only auth (no password auth), rotate the affected key pair — remove the compromised public key from `~/.ssh/authorized_keys`, generate and deploy a new key pair, confirm old key no longer authenticates.
4. **Review FIM diff**: check the Wazuh dashboard's Threat Hunting view for any file changes correlated with the login window — especially `/etc/ssh/sshd_config`, `/etc/passwd`, `/etc/sudoers`, and this repo's working directory (which holds live credentials in `.env` files, even though git-ignored).
5. **Document**: log the incident (timestamp, source IP, actions taken, whether confirmed malicious or false positive) in this runbook's changelog for future reference.

---

## Changelog
- 2026-09-06: Initial runbook. Wazuh SIEM deployed, Trivy CI scanning added, secrets moved to `.env`, CI/CD diff-logic bug fixed, OS version documentation corrected, SCA gap documented.
