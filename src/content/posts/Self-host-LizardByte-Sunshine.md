---
title: "LizardByte/Sunshine: The Ultimate Self-Hosted Game Streaming Solution"
description: "Discover LizardByte/Sunshine, an open-source game streaming host that replaces proprietary services. Learn installation, features, and benefits."
published: 2025-09-11
tags: ['open-source', 'self-host', 'game-streaming', 'moonlight', 'c-plus-plus', 'linux']
category: Self-hosted
author: minhpt
---

# LizardByte/Sunshine - Detailed Review

## 1. Overview & GitHub Stats
- **URL:** [https://github.com/LizardByte/Sunshine](https://github.com/LizardByte/Sunshine)
- **Stars:** 28293

## 2. Project Description
LizardByte/Sunshine is an open-source, self-hosted game streaming server designed to work seamlessly with the Moonlight client. It enables users to stream games from their personal gaming rig to any compatible device over a local network or the internet, providing a low-latency, high-quality streaming experience without relying on third-party cloud services.

## 3. What Software Does It Replace?
Sunshine serves as a powerful alternative to proprietary game streaming services such as:
- NVIDIA GeForce Experience (GFE) and its GameStream functionality
- Steam Link (when used for remote play outside the Steam ecosystem)
- Parsec (for self-hosted setups)
- Commercial cloud gaming platforms for local streaming use cases

## 4. Core Functionality
Key features of Sunshine include:
- **Low Latency Streaming:** Optimized for real-time gameplay with minimal input lag.
- **Cross-Platform Support:** Works on Windows, Linux, and macOS as both host and client (via Moonlight).
- **Hardware Encoding:** Leverages GPU encoding (NVENC, AMF, VAAPI) for efficient performance.
- **Web Interface:** Easy configuration through an intuitive browser-based dashboard.
- **Authentication & Security:** Supports PIN-based and user/password authentication.
- **Custom Resolutions & Bitrates:** Adjust streaming quality based on network conditions.
- **Multi-Monitor Support:** Stream specific displays or all monitors simultaneously.

## 5. Pros and Cons
**Pros:**
- **Privacy & Control:** Self-hosted nature ensures data stays on your hardware.
- **Cost-Effective:** Free and open-source, avoiding subscription fees.
- **Customization:** Highly configurable to suit specific hardware and network setups.
- **Active Community:** Strong GitHub presence with regular updates and support.

**Cons:**
- **Setup Complexity:** Requires technical knowledge for initial configuration and troubleshooting.
- **Hardware Dependent:** Performance relies on the host PC's capabilities and network stability.
- **No Official Mobile Apps:** Dependent on third-party clients like Moonlight for mobile access.

## 6. Detailed Installation Guide (Self-host)
Follow these steps to install Sunshine on an Ubuntu server (22.04 LTS or later):

### Prerequisites:
- Ubuntu Linux (tested on 22.04)
- sudo privileges
- A supported GPU (NVIDIA, AMD, or Intel with VAAPI)

### Step 1: Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### Step 2: Install Dependencies
```bash
sudo apt install -y git cmake gcc g++ libavcodec-dev libavformat-dev libavutil-dev libswscale-dev libopus-dev libssl-dev
```

### Step 3: Install Sunshine
Clone the repository and build:
```bash
git clone https://github.com/LizardByte/Sunshine.git
cd Sunshine
mkdir build && cd build
cmake ..
make -j$(nproc)
sudo make install
```

### Step 4: Configure Sunshine
Edit the configuration file (located at `~/.config/sunshine/sunshine.conf`) to set up users, resolution, and bitrate preferences.

### Step 5: Run Sunshine
Start the service:
```bash
sunshine
```
Access the web interface at `https://localhost:47990` to complete setup.

### Step 6 (Optional): Set Up as a Service
Create a systemd service for auto-start:
```bash
sudo nano /etc/systemd/system/sunshine.service
```
Add:
```
[Unit]
Description=Sunshine Game Streaming
After=network.target

[Service]
Type=simple
User=your_username
ExecStart=/usr/local/bin/sunshine
Restart=always

[Install]
WantedBy=multi-user.target
```
Then enable and start:
```bash
sudo systemctl enable sunshine
sudo systemctl start sunshine
```

Your self-hosted Sunshine server is now ready! Use Moonlight on your client devices to connect and start streaming.