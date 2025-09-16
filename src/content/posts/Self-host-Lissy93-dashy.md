---
title: "Lissy93/dashy: The Ultimate Self-Hosted Personal Dashboard - Review & Setup Guide"
description: "Explore Lissy93/dashy, a powerful open-source personal dashboard with widgets, themes, and status monitoring. Perfect for self-hosting enthusiasts."
published: 2025-09-16
tags: ['open-source', 'self-host', 'dashboard', 'docker', 'javascript', 'vuejs', 'web-app']
category: Self-hosted
author: minhpt
---

# Lissy93/dashy - Detailed Review

## 1. Overview & GitHub Stats
- **URL:** [https://github.com/Lissy93/dashy](https://github.com/Lissy93/dashy)
- **Stars:** 22311

## 2. Project Description
Lissy93/dashy is a feature-rich, self-hosted personal dashboard designed to centralize your most-used web services, applications, and tools into a single, customizable interface. It offers a clean, modern UI with support for widgets, status checks, multiple themes, and an intuitive UI editor, making it an ideal solution for both personal and professional use to streamline daily workflows.

## 3. What Software Does It Replace?
Dashy can serve as an alternative to several commercial and open-source dashboard solutions, including:
- Heimdall
- Organizr
- Homer
- Commercial offerings like My Dashboard or personal start pages from browser vendors

## 4. Core Functionality
Key features of Dashy include:
- **Widget System:** Add and customize widgets for weather, notes, RSS feeds, and more.
- **Status Monitoring:** Check the uptime and status of your services and applications.
- **Theme Customization:** Choose from multiple built-in themes or create your own.
- **Icon Packs:** Extensive library of icons to personalize your dashboard.
- **UI Editor:** Drag-and-drop interface for arranging sections and components.
- **Multi-User Support:** Configure access for different users with varying permissions.
- **Search Integration:** Quickly find and access your apps and bookmarks.

## 5. Pros and Cons
**Pros:**
- Highly customizable with an extensive feature set.
- Open-source and free to use.
- Active development and strong community support.
- Easy to deploy using Docker or traditional methods.
- Responsive design works on desktop and mobile.

**Cons:**
- May have a learning curve for non-technical users.
- Self-hosting requires basic server management skills.
- Some advanced features might require configuration beyond the UI.

## 6. Detailed Installation Guide (Self-host)
Follow these steps to deploy Dashy on an Ubuntu server:

### Prerequisites:
- A server running Ubuntu 20.04 or later.
- Docker and Docker Compose installed.

### Step 1: Update System and Install Docker
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install docker.io docker-compose -y
sudo systemctl enable docker --now
```

### Step 2: Create a Directory for Dashy
```bash
mkdir ~/dashy && cd ~/dashy
```

### Step 3: Create a Docker Compose File
Create a `docker-compose.yml` file with the following content:
```yaml
version: '3.8'
services:
  dashy:
    image: lissy93/dashy
    container_name: dashy
    ports:
      - 4000:80
    volumes:
      - ./conf.yml:/app/public/conf.yml
    restart: unless-stopped
```

### Step 4: Create a Configuration File
Create a basic `conf.yml` file:
```yaml
pageInfo:
  title: My Dashboard
sections:
  - name: Welcome
    items:
      - title: GitHub
        description: Code Repository
        icon: fab fa-github
        url: https://github.com
```

### Step 5: Deploy Dashy
```bash
docker-compose up -d
```

### Step 6: Access Your Dashboard
Open your browser and navigate to `http://your-server-ip:4000`. You should see your new Dashy dashboard. Customize further by editing `conf.yml` and restarting the container with `docker-compose restart`.

For more configuration options, refer to the [official documentation](https://dashy.to/docs/).