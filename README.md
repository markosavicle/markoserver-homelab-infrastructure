# Self-Hosted Enterprise HomeLab Infrastructure

A production-grade, containerized HomeLab infrastructure built on Ubuntu Server 24.04 LTS.
This repository manages the Infrastructure-as-Code (IaC) setup, service orchestrations,
network topologies, and security configurations.

---

## 📐 Architecture & Network Topology

                               ┌─────────────────────────────────────────┐
                               │             Local Network               │
                               │           (Subnet 192.168.100.0/24)     │
                               └────────────────────┬────────────────────┘
                                                    │
                                                    ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │ Ubuntu Server 24.04 LTS (Bare-Metal Laptop) - 192.168.100.92                                           │
 │                                                                                                        │
 │  ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐ │
 │  │ Security Hardening: Ed25519 SSH Keys | Password Auth Disabled | UFW Firewall (Strict Default Deny)│ │
 │  └──────────────────────────────────────────────────┬────────────────────────────────────────────────┘ │
 │                                                     │                                                  │
 │                                                     ▼                                                  │
 │  ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐  │
 │  │ Docker Engine / Isolated `nginx-net` Overlay Network                                             │  │
 │  │                                                                                                  │  │
 │  │   ┌───────────────────────────────┐     ┌───────────────────────────────┐                        │  │
 │  │   │ Nginx Proxy Manager           │────>│ Homarr Dashboard              │                        │  │
 │  │   │ (Ingress Controller / Proxy)  │     │ (Unified Management UI)       │                        │  │
 │  │   │ Ports: 80, 443, 81            │     │ Internal Port: 7575           │                        │  │
 │  │   └───────────────┬───────────────┘     └───────────────────────────────┘                        │  │
 │  │                   │                                                                              │  │
 │  │                   │                     ┌───────────────────────────────┐                        │  │
 │  │                   └────────────────────>│ Uptime Kuma                   │                        │  │
 │  │                                         │ (Monitoring & Status Page)    │                        │  │
 │  │                                         │ Internal Port: 3001           │                        │  │
 │  │                                         └───────────────────────────────┘                        │  │
 │  └──────────────────────────────────────────────────────────────────────────────────────────────────┘  │
 │                                                     │                                                  │
 │  ┌──────────────────────────────────────────────────▼───────────────────────────────────────────────┐  │
 │  │ Automated Monitoring & Maintenance (Cron & Healthchecks.io Heartbeat)                            │  │
 │  └──────────────────────────────────────────────────────────────────────────────────────────────────┘  │
 └────────────────────────────────────────────────────────────────────────────────────────────────────────┘

---

## Key Features & Services

### 1. Security & OS Hardening
* **OS Distribution:** Ubuntu Server 24.04 LTS (Headless, power-management configured for lid-closed operation).
* **Static Networking:** Static IP allocation via Netplan (`192.168.100.92/24`).
* **SSH Hardening:** Password authentication disabled (`PasswordAuthentication no`), Root login forbidden (`PermitRootLogin no`), strictly enforced **Ed25519** elliptic-curve keypair authentication.
* **Firewall (UFW):** Strict "Default Deny Incoming / Allow Outgoing" policy. Only required application ports are exposed.

### 2. Containerization & Orchestration
* **Docker Engine & Docker Compose V2:** Installed via official Docker repositories, with non-root daemon group management.
* **Isolated Overlay Network:** Custom Docker network (`nginx-net`) configured for secure inter-container communication without exposing raw internal ports to the host network.

### 3. Deployed Services
* **Nginx Proxy Manager:** Acts as the primary Reverse Proxy & Ingress Controller. Manages HTTP/HTTPS routing, WebSocket forwarding, and local domain resolutions (`*.markoserver.local`).
* **Homarr:** Customizable home dashboard providing unified access, status widgets, and quick management links for all deployed homelab applications.
* **Uptime Kuma:** Self-hosted monitoring dashboard tracking local network health, DNS status, and external endpoints with real-time alerts.

### 4. External Health Monitoring
* **Heartbeat / Dead Man's Switch:** Integrated with Healthchecks.io via an automated Linux `cron` job. Sends a silent HTTP ping every 60 seconds; triggers instant alerts if the server loses power or network connection.

---

## Repository Structure

~/docker/
├── .gitignore               # Strict exclusion rules for database volumes and secrets
├── README.md                # Infrastructure documentation
├── dashboard/
│   └── docker-compose.yml   # Homarr dashboard stack configuration
├── monitoring/
│   └── docker-compose.yml   # Uptime Kuma monitoring stack configuration
└── npm/
    └── docker-compose.yml   # Nginx Proxy Manager stack configuration

---

## Getting Started

### Prerequisites
* Ubuntu Server 24.04 LTS or any Debian-based distribution.
* Docker Engine v24.0+ and Docker Compose Plugin.

### Deployment Steps

1. **Clone the repository:**
   git clone git@github.com:YOUR_GITHUB_USERNAME/markoserver-homelab-infrastructure.git ~/docker
   cd ~/docker

2. **Create the shared Docker network:**
   docker network create nginx-net

3. **Deploy Nginx Proxy Manager:**
   cd ~/docker/npm
   docker compose up -d

4. **Deploy Homarr Dashboard:**
   cd ~/docker/dashboard
   docker compose up -d

5. **Deploy Uptime Kuma:**
   cd ~/docker/monitoring
   docker compose up -d

6. **Verify deployment:**
   docker ps

---

## License
This project is open-source and available under the MIT License.
