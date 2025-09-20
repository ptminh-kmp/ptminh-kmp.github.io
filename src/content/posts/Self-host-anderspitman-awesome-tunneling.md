---
title: "Anderspitman/awesome-tunneling: The Ultimate Self-Hosted Tunneling Resource"
description: "Explore anderspitman/awesome-tunneling, a curated list of ngrok and Cloudflare Tunnel alternatives for secure, self-hosted tunneling solutions."
published: 2025-09-20
tags: ['open-source', 'self-host', 'tunneling', 'networking', 'devops']
category: Self-hosted
author: minhpt
---

# anderspitman/awesome-tunneling - Detailed Review

## 1. Overview & GitHub Stats
- **URL:** [https://github.com/anderspitman/awesome-tunneling](https://github.com/anderspitman/awesome-tunneling)
- **Stars:** 18613

## 2. Project Description
Anderspitman/awesome-tunneling is a meticulously curated list of tunneling software and services, emphasizing self-hosted alternatives to popular commercial solutions like ngrok and Cloudflare Tunnel. It serves as a comprehensive resource for developers, sysadmins, and DevOps professionals seeking to establish secure, private network tunnels without relying on third-party services. The repository categorizes tools based on features, protocols, and ease of use, making it an invaluable reference for anyone involved in networking, remote access, or service exposure.

## 3. What Software Does It Replace?
This project provides alternatives to several widely-used tunneling and reverse proxy services, including:
- **ngrok**
- **Cloudflare Tunnel**
- **PageKite**
- **LocalTunnel**
- **Serveo**
- **Teleconsole**
- **Beeceptor** (for HTTP mocking)
- Various other proprietary or SaaS-based tunneling solutions.

## 4. Core Functionality
The awesome-tunneling repository itself is not a software application but a categorized list of tools. Key features of the listed software typically include:
- Secure TCP/UDP/HTTP tunneling.
- Support for self-hosting to maintain data privacy.
- Reverse proxy capabilities.
- SSL/TLS termination.
- Dynamic DNS and subdomain management.
- Cross-platform compatibility (Linux, Windows, macOS).
- Integration with Docker, Kubernetes, and other orchestration tools.
- Authentication and access control mechanisms.

## 5. Pros and Cons
**Pros:**
- Comprehensive and well-organized list of tools.
- Focus on open-source and self-hosted solutions enhances privacy and control.
- Regularly updated with new projects and improvements.
- Includes comparisons, making it easier to choose the right tool.
- Community-driven, with contributions from experts in the field.

**Cons:**
- As a list rather than a single tool, users must evaluate and deploy each solution individually.
- Some listed projects may have steep learning curves or limited documentation.
- Requires self-maintenance of the chosen tunneling software, including updates and security patches.

## 6. Detailed Installation Guide (Self-host)
Since anderspitman/awesome-tunneling is a list of tools, here’s a general guide for self-hosting a popular tunneling software from the list, such as **frp** (Fast Reverse Proxy), on an Ubuntu server:

### Prerequisites:
- Ubuntu 22.04 LTS server.
- sudo privileges.
- Basic knowledge of Linux command line.

### Step 1: Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### Step 2: Download frp
Visit the [frp GitHub releases page](https://github.com/fatedier/frp/releases) to find the latest version. For example, to download v0.52.3 for AMD64:
```bash
wget https://github.com/fatedier/frp/releases/download/v0.52.3/frp_0.52.3_linux_amd64.tar.gz
tar -xzf frp_0.52.3_linux_amd64.tar.gz
cd frp_0.52.3_linux_amd64
```

### Step 3: Configure frp Server
Edit the server configuration file (`frps.ini`):
```bash
nano frps.ini
```
Example configuration:
```ini
[common]
bind_port = 7000
dashboard_port = 7500
dashboard_user = admin
dashboard_pwd = your_secure_password
token = your_secret_token
```

### Step 4: Run frp Server
Start the frp server:
```bash
./frps -c frps.ini
```
For running as a service, create a systemd service file:
```bash
sudo nano /etc/systemd/system/frps.service
```
Add:
```ini
[Unit]
Description=Frp Server Service
After=network.target

[Service]
Type=simple
User=nobody
Restart=on-failure
RestartSec=5s
ExecStart=/path/to/frps -c /path/to/frps.ini

[Install]
WantedBy=multi-user.target
```
Then enable and start the service:
```bash
sudo systemctl enable frps
sudo systemctl start frps
```

### Step 5: Configure Firewall
Allow necessary ports (e.g., 7000, 7500):
```bash
sudo ufw allow 7000/tcp
sudo ufw allow 7500/tcp
sudo ufw reload
```

### Step 6: Access Dashboard
Open your browser and navigate to `http://your_server_ip:7500`, using the credentials set in `frps.ini`.

This setup provides a self-hosted tunneling solution similar to ngrok, allowing you to expose local services securely. For other tools listed in awesome-tunneling, refer to their respective documentation for installation and configuration.