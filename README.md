# Self-Hosted Enterprise HomeLab & Diskont POS Infrastructure

A production-grade, containerized HomeLab infrastructure built on Ubuntu Server 26.04 LTS.
This repository manages the Infrastructure-as-Code (IaC) setup, service orchestrations, network topologies, security configurations, security monitoring, and a fully automated Diskont POS system for retail operations in Serbia.

---

## Architecture & Network Topology

```text
                                ┌─────────────────────────────────────────┐
                                │             Local Network               │
                                │       (Subnet 192.168.100.0/24)         │
                                └────────────────────┬────────────────────┘
                                                     │
                                                     ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │ Ubuntu Server 26.04 LTS (Bare-Metal Laptop) - 192.168.100.92                                           │
 │                                                                                                        │
 │  ┌────────────────────────────────────────────────────────────────────────────────────────────────────┐│
 │  │ Security Hardening: Ed25519 SSH Keys | Password Auth Disabled | UFW Firewall (Strict Default Deny) ││
 │  │ fail2ban (SSH brute-force protection)                                                              ││
 │  └──────────────────────────────────────────────────┬─────────────────────────────────────────────────┘│
 │                                                     │                                                  │
 │                                                     ▼                                                  │
 │  ┌────────────────────────────────────────────────────────────────────────────────────────────────────┐│
 │  │ Docker Engine / Isolated `nginx-net` Overlay Network                                               ││
 │  │                                                                                                    ││
 │  │   ┌───────────────────────────────┐     ┌───────────────────────────────┐                          ││
 │  │   │ Nginx Proxy Manager           │────>│ Diskont POS (Retail App)      │                          ││
 │  │   │ (Ingress Controller / TLS)    │     │ (Frontend, Backend, Postgres) │                          ││
 │  │   │ Ports: 80, 443, 81            │     │ Local: pos.markoserver.local  │                          ││
 │  │   └───────────────┬───────────────┘     └───────────────────────────────┘                          ││
 │  │                   │                                                                                ││
 │  │                   ├────────────────────>┌───────────────────────────────┐                          ││
 │  │                   │                     │ Homarr Dashboard              │                          ││
 │  │                   │                     │ Internal Port: 7575           │                          ││
 │  │                   │                     └───────────────────────────────┘                          ││
 │  │                   │                                                                                ││
 │  │                   ├────────────────────>┌───────────────────────────────┐                          ││
 │  │                   │                     │ Portainer CE                  │                          ││
 │  │                   │                     │ Port: 9000                    │                          ││
 │  │                   │                     └───────────────────────────────┘                          ││
 │  │                   │                                                                                ││
 │  │                   ├────────────────────>┌───────────────────────────────┐                          ││
 │  │                   │                     │ Uptime Kuma                   │                          ││
 │  │                   │                     │ Internal Port: 3001           │                          ││
 │  │                   │                     └───────────────────────────────┘                          ││
 │  │                   │                                                                                ││
 │  │                   └────────────────────>┌───────────────────────────────────────┐                  ││
 │  │                                         │ Wazuh SIEM (Manager, Indexer,         │                  ││
 │  │                                         │  Dashboard) - wazuh.markoserver.local │                  ││
 │  │                                         └───────────────────────────────────────┘                  ││
 │  └────────────────────────────────────────────────────────────────────────────────────────────────────┘│
 │                                                      │                                                 │
 │  ┌───────────────────────────────────────────────────▼──────────────────────────────────────────────┐  │
 │  │ Wazuh Agent (host-level): FIM, rootcheck, Syscollector, Vulnerability Detection                  │  │
 │  │ Automated Monitoring & Maintenance (Cron & Healthchecks.io Heartbeat)                            │  │
 │  └──────────────────────────────────────────────────────────────────────────────────────────────────┘  │
 └────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Deployed Services & Containers Overview

| Service | Container Name(s) | Internal Port | External Local Domain | Purpose |
|---|---|---|---|---|
| Nginx Proxy Manager | `npm-app`, `npm-db` | 80, 443, 81 | npm.markoserver.local | Ingress reverse proxy & TLS management |
| Diskont POS | `diskont-pos-frontend`, `diskont-pos-backend`, `diskont-pos-db` | 3000 (FE), 5050 (BE), 5432 (DB) | pos.markoserver.local | Point of Sale system for Serbian beverage stores |
| Homarr | `homarr` | 7575 | dashboard.markoserver.local | Unified homelab dashboard & status widgets |
| Portainer CE | `portainer` | 9000 | portainer.markoserver.local | Docker container management UI |
| Uptime Kuma | `uptime-kuma` | 3001 | status.markoserver.local | Service uptime & HTTP heartbeat monitoring |
| Wazuh SIEM | `wazuh-wazuh.manager-1`, `wazuh-wazuh.indexer-1`, `wazuh-wazuh.dashboard-1` | 1514/1515 (agent), 55000 (API), 9200 (indexer), 5601 (dashboard, proxied) | wazuh.markoserver.local | Security monitoring, FIM, vulnerability detection, SIEM |

## Diskont POS Application Architecture

Tailored specifically for beverage discount stores in Serbia, with complex packaging, deposit handling, and fiscalization needs:

- **Serbian eFiscalization Support**: Native thermal print layout (`@media print`) and verification QR code rendering using `qrcode.react`, with standard Serbian tax categories (Đ - 20% VAT, E - Exempt/Deposits).
- **Crate & Bottle Deposit Logic (Kaucije)**: Dual-direction handling for returnable packaging (crates, glass bottles) with automatic cart adjustment for deposit payouts or charges.
- **Dual Unit & Pack Pricing**: Real-time unit vs. bulk pack calculation (e.g., individual bottle pricing vs. 20x crate or 6x PET package prices).
- **Hardware Barcode Scanner Support**: Barcode reader integration with string trimming, keyboard focus traps (F8), and memory fallback search for instant scan response.
- **Keyboard Hotkeys**: High-speed cashier controls (F2 Cash Payment, F4 Card Payment, F8 Focus Barcode Field, Esc Clear Cart/Close Modal).
- **Serbian Localized UI & Sorting**: Full Serbian interface with products sorted by ID (Šifra), barcodes, and category filters (Pivo, Bezalkoholno, Žestina, Vino i Cider, Ambalaža i Kaucija).

## Security & OS Hardening

- **OS Distribution**: Ubuntu Server 26.04 LTS (headless, power-management configured for lid-closed operation).
- **Static Networking**: Fixed local IP allocation via Netplan (192.168.100.92/24).
- **SSH Hardening**: Password authentication disabled (`PasswordAuthentication no`), root login forbidden (`PermitRootLogin no`), strictly enforced Ed25519 elliptic-curve keypair authentication.
- **Firewall (UFW)**: Strict "Default Deny Incoming / Allow Outgoing" policy. Only required proxy/application ports are exposed.
- **Brute-force protection**: `fail2ban` active on the `sshd` jail.
- **TLS everywhere**: internal `*.markoserver.local` services served over HTTPS via a self-signed wildcard certificate through Nginx Proxy Manager.
- **External Monitoring**: Integrated with Healthchecks.io via automated cron job. Sends silent pings every 60 seconds; triggers instant alerts if the server loses power or network connection.

## Security Monitoring & Vulnerability Management

- **SIEM**: Wazuh 4.14.7 (manager, indexer, dashboard) monitoring the host — File Integrity Monitoring on `/etc`, SSH config, and repo paths; rootcheck; Syscollector; Vulnerability Detection module correlating installed packages against CVE feeds. Dashboard reachable at `wazuh.markoserver.local`.
- **CI vulnerability scanning**: Trivy scans the `diskont-pos` frontend and backend images on every push touching `diskont-pos/**` (`.github/workflows/security-scan.yml`). Findings triaged (fix/accept/defer) and tracked in `security/RUNBOOK.md`.
- **Secrets management**: Database and Wazuh service credentials live in git-ignored `.env` files, referenced via Docker Compose `${VAR}` interpolation — no plaintext secrets in version control.
- **Known limitation**: SCA (CIS compliance scanning) is currently non-functional on this host — no official CIS benchmark yet exists for Ubuntu 26.04. Documented as an accepted gap, not silently ignored. See `security/RUNBOOK.md` for details.

## Dynamic CI/CD Deployment Pipeline

The workflow in `.github/workflows/main.yml` automatically triggers on `git push` to `main` (via a GitHub Actions self-hosted runner on `markoserver`):

```yaml
# Pipeline logic flow
1. git fetch origin main
2. git checkout -f main && git reset --hard <pushed-commit-sha>
3. CHANGED_FILES=$(git diff --name-only <before-sha> <after-sha>)
4. Loop through subdirectories -> If changes detected -> docker compose up -d --build
```

- **Smart Diff Detection**: Rebuilds only the services whose directory files changed between the commit before the push and the commit the push landed on.
- **Zero Overhead**: If a commit only affects `diskont-pos`, services like `dashboard`, `npm`, `portainer`, or `wazuh` are skipped entirely.
- **Branch Protection**: All changes must pass CI validation ("Validate Diskont POS") before merging into `main`.
- **Separate security scan workflow**: `.github/workflows/security-scan.yml` runs Trivy against `diskont-pos` images independently of the deploy pipeline, on pushes and PRs touching that path.

## Repository Structure

```text
markoserver-homelab-infrastructure/
├── .github/
│   └── workflows/
│       ├── ci.yml               # CI build validator for PRs
│       ├── main.yml             # Smart directory-diff deploy workflow for main branch
│       └── security-scan.yml    # Trivy vulnerability scanning for diskont-pos images
├── dashboard/
│   └── docker-compose.yml       # Homarr dashboard stack configuration
├── diskont-pos/
│   ├── docker-compose.yml       # Complete POS stack (frontend, backend, postgres)
│   ├── .env                     # DB credentials (git-ignored)
│   ├── backend/
│   │   ├── init.sql             # DB schema & initial seed data
│   │   ├── seed.js              # Database seed execution script
│   │   ├── server.js            # Express REST API & POS business logic
│   │   └── Dockerfile
│   └── frontend/
│       ├── src/
│       │   ├── App.jsx          # Main POS UI, hotkeys & category filters
│       │   ├── FiscalReceipt.jsx# Serbian eFiscal receipt modal
│       │   └── index.css        # Tailwind styles & print directives
│       └── Dockerfile
├── monitoring/
│   └── docker-compose.yml       # Uptime Kuma stack configuration
├── npm/
│   └── docker-compose.yml       # Nginx Proxy Manager stack configuration
├── portainer/
│   └── docker-compose.yml       # Portainer CE stack configuration
├── security/
│   └── RUNBOOK.md               # Security operations runbook: monitoring, findings, IR procedures
├── wazuh/
│   ├── docker-compose.yml       # Wazuh manager/indexer/dashboard stack
│   ├── .env                     # Wazuh service credentials (git-ignored)
│   ├── generate-indexer-certs.yml
│   └── config/                  # Wazuh manager/indexer/dashboard configuration
├── .gitignore                   # Excludes database volumes, node_modules, and secrets
└── README.md                    # System architecture documentation
```

## Getting Started & Deployment

### Prerequisites

- Ubuntu Server 26.04 LTS with Docker Engine v24.0+ and Docker Compose V2.
- Shared Docker bridge network: `docker network create nginx-net`.

### Deployment Steps

**1. Clone Repository:**

```bash
git clone git@github.com:markosavicle/markoserver-homelab-infrastructure.git ~/docker
cd ~/docker
```

**2. Deploy Core Infrastructure:**

```bash
# Deploy Proxy
cd ~/docker/npm && docker compose up -d

# Deploy Dashboard & Container Management
cd ~/docker/dashboard && docker compose up -d
cd ~/docker/portainer && docker compose up -d
cd ~/docker/monitoring && docker compose up -d
```

**3. Deploy Wazuh SIEM:**

```bash
cd ~/docker/wazuh
# create .env with INDEXER_PASSWORD, API_PASSWORD, DASHBOARD_PASSWORD before first run
docker compose -f generate-indexer-certs.yml run --rm generator
docker compose up -d
```

**4. Deploy & Seed Diskont POS:**

```bash
cd ~/docker/diskont-pos
# create .env with DB_PASSWORD before first run
docker compose up -d --build

# Seed catalog with Serbian drinks & packaging deposit data
docker exec -it diskont-pos-backend npm run seed
```

**5. Verify Running Containers:**

```bash
docker ps
```

## License

This project is open-source and available under the MIT License.

