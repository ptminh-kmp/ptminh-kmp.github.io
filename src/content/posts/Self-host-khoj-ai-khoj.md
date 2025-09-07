---
title: "Khoj AI: Your Self-Hosted AI Second Brain - A Complete Review"
description: "Explore Khoj AI, an open-source, self-hosted AI assistant that acts as your second brain, offering web and document search, automation, and deep research capabilities."
published: 2025-09-07
tags: ['open-source', 'self-host', 'ai', 'llm', 'automation', 'docker', 'python', 'privacy']
category: Self-hosted
author: minhpt
---

# khoj-ai/khoj - Detailed Review

## 1. Overview & GitHub Stats
- **URL:** [https://github.com/khoj-ai/khoj](https://github.com/khoj-ai/khoj)
- **Stars:** 30783

## 2. Project Description
Khoj AI is an open-source, self-hosted AI assistant designed to function as your "second brain." It enables users to query information from the web or their personal documents, build custom AI agents, schedule automations, and perform deep research. Khoj supports integration with various local and online LLMs, including GPT, Claude, Gemini, Llama, Qwen, and Mistral, making it a versatile and privacy-focused alternative to commercial AI tools.

## 3. What Software Does It Replace?
Khoj AI serves as a powerful alternative to several commercial and proprietary AI tools, including:
- Notion AI
- Evernote with AI features
- ChatGPT Plus (for personalized, document-based queries)
- Commercial automation platforms like Zapier (for AI-driven workflows)
- Proprietary research and knowledge management tools

## 4. Core Functionality
Khoj AI offers a robust set of features:
- **Document Search:** Index and query your personal documents (PDFs, markdown, text files) for quick answers.
- **Web Search Integration:** Fetch and summarize information from the web directly.
- **Custom AI Agents:** Build and deploy tailored AI agents for specific tasks.
- **Automation Scheduling:** Set up automated tasks and workflows.
- **Multi-LLM Support:** Use a variety of LLMs, both local and cloud-based, ensuring flexibility and privacy.
- **Self-Hosted Deployment:** Full control over your data and infrastructure.

## 5. Pros and Cons
**Pros:**
- **Privacy-Focused:** Self-hosted nature ensures your data remains private.
- **Flexible LLM Support:** Compatible with multiple AI models, both open and proprietary.
- **Customization:** Highly adaptable for personal or organizational use.
- **Cost-Effective:** Free to use and deploy, avoiding subscription fees.
- **Active Community:** Strong GitHub presence with ongoing development and support.

**Cons:**
- **Technical Barrier:** Requires some technical knowledge for setup and maintenance.
- **Resource Intensive:** Running local LLMs may demand significant computational resources.
- **Limited Out-of-the-Box Integrations:** Compared to commercial tools, may require manual configuration for certain workflows.

## 6. Detailed Installation Guide (Self-host)
Follow these steps to self-host Khoj AI on an Ubuntu server:

### Prerequisites
- Ubuntu 22.04 LTS or later
- Docker and Docker Compose installed
- Python 3.8+ (if customizing beyond Docker)
- At least 8GB RAM (16GB+ recommended for local LLMs)

### Step-by-Step Installation
1. **Update System Packages:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install Docker and Docker Compose:**
   ```bash
   sudo apt install docker.io docker-compose -y
   sudo systemctl enable docker
   sudo systemctl start docker
   ```

3. **Clone the Khoj Repository:**
   ```bash
   git clone https://github.com/khoj-ai/khoj.git
   cd khoj
   ```

4. **Configure Environment Variables:**
   Create a `.env` file in the project root and set necessary variables (e.g., API keys for LLMs, storage paths):
   ```bash
   cp .env.example .env
   nano .env
   ```

5. **Build and Start with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

6. **Access Khoj AI:**
   Open your browser and navigate to `http://your-server-ip:8000` to access the Khoj interface.

7. **Optional: Set Up Reverse Proxy (for production):**
   Use Nginx or Traefik to proxy requests and enable HTTPS.

For advanced configurations, such as integrating specific LLMs or setting up automations, refer to the [official documentation](https://github.com/khoj-ai/khoj).