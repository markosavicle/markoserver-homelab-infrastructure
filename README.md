# Self-Hosted Enterprise HomeLab & Diskont POS Infrastructure

A production-grade, containerized HomeLab infrastructure built on Ubuntu Server 24.04 LTS.
This repository manages the Infrastructure-as-Code (IaC) setup, service orchestrations, network topologies, security configurations, and a fully automated Diskont POS system for retail operations in Serbia.

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
 │ Ubuntu Server 24.04 LTS (Bare-Metal Laptop) - 192.168.100.92                                           │
 │                                                                                                        │
 │  ┌────────────────────────────────────────────────────────────────────────────────────────────────────┐│
 │  │ Security Hardening: Ed25519 SSH Keys | Password Auth Disabled | UFW Firewall (Strict Default Deny) ││
 │  └──────────────────────────────────────────────────┬─────────────────────────────────────────────────┘│
 │                                                     │                                                  │
 │                                                     ▼                                                  │
 │  ┌────────────────────────────────────────────────────────────────────────────────────────────────────┐│
 │  │ Docker Engine / Isolated `nginx-net` Overlay Network                                               ││
 │  │                                                                                                    ││
 │  │   ┌───────────────────────────────┐     ┌───────────────────────────────┐                          ││
 │  │   │ Nginx Proxy Manager           │────>│ Diskont POS (Retail App)      │                          ││
 │  │   │ (Ingress Controller / Proxy)  │     │ (Frontend, Backend, Postgres) │                          ││
 │  │   │ Ports: 80, 443, 81            │     │ Local: pos.markoserver.local  │                          ││
 │  │   └───────────────┬───────────────┘     └───────────────────────────────┘                          ││
 │  │                   │                                                                                ││
 │  │                   │                     ┌───────────────────────────────┐                          ││
 │  │                   ├────────────────────>│ Homarr Dashboard              │                          ││
 │  │                   │                     │ (Unified Management UI)       │                          ││
 │  │                   │                     │ Internal Port: 7575           │                          ││
 │  │                   │                     └───────────────────────────────┘                          ││
 │  │                   │                                                                                ││
 │  │                   │                     ┌───────────────────────────────┐                          ││
 │  │                   ├────────────────────>│ Portainer CE                  │                          ││
 │  │                   │                     │ (Container Management)        │                          ││
 │  │                   │                     │ Port: 9000                    │                          ││
 │  │                   │                     └───────────────────────────────┘                          ││
 │  │                   │                                                                                ││
 │  │                   │                     ┌───────────────────────────────┐                          ││
 │  │                   └────────────────────>│ Uptime Kuma                   │                          ││
 │  │                                         │ (Monitoring & Status Page)    │                          ││
 │  │                                         │ Internal Port: 3001           │                          ││
 │  │                                         └───────────────────────────────┘                          ││
 │  └────────────────────────────────────────────────────────────────────────────────────────────────────┘│
 │                                                      │                                                 │
 │  ┌───────────────────────────────────────────────────▼──────────────────────────────────────────────┐  │
 │  │ Automated Monitoring & Maintenance (Cron & Healthchecks.io Heartbeat)                            │  │
 │  └──────────────────────────────────────────────────────────────────────────────────────────────────┘  │
 └────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Deployed Services & Containers Overview

| Service | Container Name(s) | Internal Port | External Local Domain | Purpose |
|---|---|---|---|---|
| Nginx Proxy Manager | `npm-app`, `npm-db` | 80, 443, 81 | npm.markoserver.local | Ingress reverse proxy & SSL management |
| Diskont POS | `diskont-pos-frontend`, `diskont-pos-backend`, `diskont-pos-db` | 3000 (FE), 5050 (BE), 5432 (DB) | pos.markoserver.local | Point of Sale system for Serbian beverage stores |
| Homarr | `homarr` | 7575 | dashboard.markoserver.local | Unified homelab dashboard & status widgets |
| Portainer CE | `portainer` | 9000 | portainer.markoserver.local | Docker container management UI |
| Uptime Kuma | `uptime-kuma` | 3001 | status.markoserver.local | Service uptime & HTTP heartbeat monitoring |

##  Diskont POS Application Architecture

Tailored specifically for beverage discount stores in Serbia, with complex packaging, deposit handling, and fiscalization needs:

- **Serbian eFiscalization Support**: Native thermal print layout (`@media print`) and verification QR code rendering using `qrcode.react`, with standard Serbian tax categories (Đ - 20% VAT, E - Exempt/Deposits).
- **Crate & Bottle Deposit Logic (Kaucije)**: Dual-direction handling for returnable packaging (crates, glass bottles) with automatic cart adjustment for deposit payouts or charges.
- **Dual Unit & Pack Pricing**: Real-time unit vs. bulk pack calculation (e.g., individual bottle pricing vs. 20x crate or 6x PET package prices).
- **Hardware Barcode Scanner Support**: Barcode reader integration with string trimming, keyboard focus traps (F8), and memory fallback search for instant scan response.
- **Keyboard Hotkeys**: High-speed cashier controls (F2 Cash Payment, F4 Card Payment, F8 Focus Barcode Field, Esc Clear Cart/Close Modal).
- **Serbian Localized UI & Sorting**: Full Serbian interface with products sorted by ID (Šifra), barcodes, and category filters (Pivo, Bezalkoholno, Žestina, Vino i Cider, Ambalaža i Kaucija).

##  Security & OS Hardening

- **OS Distribution**: Ubuntu Server 24.04 LTS (headless, power-management configured for lid-closed operation).
- **Static Networking**: Fixed local IP allocation via Netplan (192.168.100.92/24).
- **SSH Hardening**: Password authentication disabled (`PasswordAuthentication no`), root login forbidden (`PermitRootLogin no`), strictly enforced Ed25519 elliptic-curve keypair authentication.
- **Firewall (UFW)**: Strict "Default Deny Incoming / Allow Outgoing" policy. Only required proxy/application ports are exposed.
- **External Monitoring**: Integrated with Healthchecks.io via automated cron job. Sends silent pings every 60 seconds; triggers instant alerts if the server loses power or network connection.

##  Dynamic CI/CD Deployment Pipeline

The workflow in `.github/workflows/main.yml` automatically triggers on `git push` to `main` (via a GitHub Actions self-hosted runner on `markoserver`):

```yaml
# Pipeline logic flow
1. git fetch origin main
2. CHANGED_FILES=$(git diff --name-only HEAD origin/main)
3. git pull origin main
4. Loop through subdirectories -> If changes detected -> docker compose up -d --build
```

- **Smart Diff Detection**: Rebuilds only the services whose directory files have changed between local `HEAD` and remote `origin/main`.
- **Zero Overhead**: If a commit only affects `diskont-pos`, services like `dashboard`, `npm`, or `portainer` are skipped entirely.
- **Branch Protection**: All changes must pass CI validation on `dev` before being merged into `main`.

##  Repository Structure

```text
markoserver-homelab-infrastructure/
├── .github/
│   └── workflows/
│       ├── ci.yml               # CI build validator for PRs
│       └── main.yml             # Smart directory-diff deploy workflow for main branch
├── dashboard/
│   └── docker-compose.yml       # Homarr dashboard stack configuration
├── diskont-pos/
│   ├── docker-compose.yml       # Complete POS stack (frontend, backend, postgres)
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
├── .gitignore                   # Excludes database volumes, node_modules, and secrets
└── README.md                    # System architecture documentation
```

##  Getting Started & Deployment

### Prerequisites

- Ubuntu Server 24.04 LTS with Docker Engine v24.0+ and Docker Compose V2.
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

**3. Deploy & Seed Diskont POS:**

```bash
cd ~/docker/diskont-pos
docker compose up -d --build

# Seed catalog with Serbian drinks & packaging deposit data
docker exec -it diskont-pos-backend npm run seed
```

**4. Verify Running Containers:**

```bash
docker ps
```

##  License

This project is open-source and available under the MIT License.
