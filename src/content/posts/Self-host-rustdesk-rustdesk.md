---
title: "RustDesk: The Ultimate Open-Source Remote Desktop Solution for Self-Hosting"
description: "Discover RustDesk, the powerful open-source remote desktop application with 96k+ GitHub stars. Learn how to self-host it as a TeamViewer alternative."
published: 2025-08-26
tags: ['open-source', 'self-host', 'remote-desktop', 'rust', 'privacy']
category: Self-hosted
author: minhpt
---

# rustdesk/rustdesk - Detailed Review

## 1. Overview & GitHub Stats

- **URL:** [https://github.com/rustdesk/rustdesk](https://github.com/rustdesk/rustdesk)
- **Stars:** 96220

## 2. Project Description

RustDesk is a modern, open-source remote desktop application written in Rust that provides secure, cross-platform remote access capabilities. Designed with privacy and self-hosting in mind, it offers both a public server option and the ability to deploy your own relay server, giving users complete control over their remote desktop infrastructure.

## 3. What Software Does It Replace?

RustDesk serves as a compelling alternative to several popular remote desktop solutions:

- **TeamViewer** - Commercial remote access software
- **AnyDesk** - Proprietary remote desktop application
- **Splashtop** - Business remote access tool
- **Chrome Remote Desktop** - Google's browser-based solution
- **Windows Remote Desktop** - Microsoft's built-in solution

## 4. Core Functionality

RustDesk offers a comprehensive set of features:

- **Cross-platform Support**: Windows, macOS, Linux, Android, iOS
- **High Performance**: Optimized for low latency and high frame rates
- **End-to-End Encryption**: Secure communication with TLS 1.3
- **File Transfer**: Easy drag-and-drop file sharing
- **Voice Chat**: Built-in audio communication
- **Multi-monitor Support**: Seamless multi-display access
- **Hardware Acceleration**: GPU-accelerated rendering
- **ID/Password Access**: Simple connection setup
- **Unattended Access**: Permanent remote access capability

## 5. Pros and Cons

### Pros:
- **Open Source**: Transparent codebase with community contributions
- **Self-host Option**: Complete control over data and infrastructure
- **Cost-effective**: Free to use with optional paid hosting
- **Privacy-focused**: No data collection when self-hosted
- **Lightweight**: Minimal resource consumption
- **Active Development**: Regular updates and improvements

### Cons:
- **Setup Complexity**: Self-hosting requires technical knowledge
- **Mobile App Limitations**: Some advanced features less optimized on mobile
- **Documentation**: Could be more comprehensive for advanced setups
- **Enterprise Features**: Lacks some enterprise-grade management tools

## 6. Detailed Installation Guide (Self-host)

### Prerequisites
- Ubuntu 20.04+ server (2GB RAM minimum, 4GB recommended)
- Docker and Docker Compose installed
- Domain name with DNS configured (optional but recommended)
- Open ports: 21115-21119 (TCP), 21116 (UDP)

### Step-by-Step Installation

1. **Update System**
```bash
sudo apt update && sudo apt upgrade -y
```

2. **Install Docker**
```bash
sudo apt install docker.io docker-compose -y
sudo systemctl enable docker
sudo systemctl start docker
```

3. **Create Deployment Directory**
```bash
mkdir rustdesk-server && cd rustdesk-server
```

4. **Create Docker Compose File**
```yaml
version: '3'

networks:
  rustdesk-net:
    driver: bridge

services:
  hbbs:
    container_name: rustdesk-hbbs
    ports:
      - "21115:21115"
      - "21116:21116"
      - "21116:21116/udp"
      - "21118:21118"
    image: rustdesk/rustdesk-server:latest
    command: hbbs -r your-domain.com:21117
    volumes:
      - ./data:/root
    networks:
      - rustdesk-net
    restart: unless-stopped

  hbbr:
    container_name: rustdesk-hbbr
    ports:
      - "21117:21117"
      - "21119:21119"
    image: rustdesk/rustdesk-server:latest
    command: hbbr
    volumes:
      - ./data:/root
    networks:
      - rustdesk-net
    restart: unless-stopped
```

5. **Replace Domain**
Replace `your-domain.com` with your actual domain or server IP address.

6. **Start Services**
```bash
sudo docker-compose up -d
```

7. **Configure Firewall**
```bash
sudo ufw allow 21115:21119/tcp
sudo ufw allow 21116/udp
```

8. **Verify Installation**
Check if services are running:
```bash
sudo docker-compose ps
```

9. **Client Configuration**
Download RustDesk client and configure to use your self-hosted server by entering your server address in the ID server field.

### Additional Configuration

For enhanced security, consider:
- Setting up SSL certificates with Let's Encrypt
- Configuring reverse proxy (Nginx)
- Implementing firewall rules
- Setting up regular backups of the data directory

Your self-hosted RustDesk server is now ready! You can access it using your server's IP or domain in the RustDesk client settings.