# Self-Hosted Enterprise HomeLab Infrastructure

A production-grade, containerized HomeLab infrastructure built on Ubuntu Server 26.04 LTS. This repository manages the strictly Infrastructure-as-Code (IaC) setup, service orchestrations, network topologies, security configurations, and SIEM monitoring. 

*Note: Application workloads (Diskont POS, Booking SaaS, HighStakes) have been extracted into their own independent repositories and deployment pipelines.*

## Architecture & Network Topology

- **OS:** Ubuntu Server 26.04 LTS (192.168.100.92)
- **Security:** Ed25519 SSH Keys | Password Auth Disabled | UFW Strict Default Deny | fail2ban
- **Docker Network:** Isolated `nginx-net` Overlay Network

### Deployed Infrastructure Services

| Service | Container | Port | Purpose |
|---|---|---|---|
| **Nginx Proxy Manager** | `npm-app`, `npm-db` | 80, 443, 81 | Ingress reverse proxy & TLS management |
| **Homarr** | `homarr` | 7575 | Unified homelab dashboard |
| **Portainer CE** | `portainer` | 9000 | Docker container management UI |
| **Uptime Kuma** | `uptime-kuma` | 3001 | Service uptime & HTTP heartbeat monitoring |
| **Wazuh SIEM** | `wazuh.manager`, `indexer`, `dashboard` | 1514, 9200, 5601 | Security monitoring, FIM, vulnerability detection |

## Security & OS Hardening
- **Static Networking:** Fixed local IP allocation via Netplan.
- **TLS Everywhere:** Internal services served over HTTPS via a self-signed wildcard certificate.
- **External Monitoring:** Integrated with Healthchecks.io via automated cron job.

## Dynamic CI/CD Deployment Pipeline
The `.github/workflows/main.yml` automatically triggers on `git push` to `main`. It uses a smart diff detection script on the self-hosted runner to rebuild only the infrastructure containers (e.g., `npm`, `wazuh`) whose configuration files changed, ignoring untouched services.
