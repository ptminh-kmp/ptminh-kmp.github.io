---
title: Setting up Open WebUI with Ollama & Docker Desktop
description: >-
  Learn how to setup Open WebUI with Ollama and Docker Desktop for local AI model interaction. This step-by-step tutorial is perfect for AI developers and bloggers.
author: minhpt
published: 2025-02-03
category: Self-hosted
tags: [tutorial, self-hosted, AI, docker, ollama, open webui]
---

This blog post will guide you through setting up **Open WebUI**, a user-friendly interface, with **Ollama**, a lightweight and extensible framework for running large language models, all containerized with **Docker Desktop**. This setup is perfect for AI developers and bloggers who want to experiment with and showcase AI models locally, offering a streamlined and efficient workflow.

### Why This Stack?

* **Open WebUI**:  Provides a sleek and intuitive web interface to interact with language models. Forget command-line interfaces – Open WebUI offers a visual and user-friendly experience, making it ideal for demos and content creation.
* **Ollama**: Simplifies the process of running and managing large language models on your local machine. It handles the complexities of model serving, letting you focus on using the models.
* **Docker Desktop**:  Containerization at its finest. Docker ensures that your environment is consistent, isolated, and easy to reproduce. It eliminates dependency conflicts and simplifies deployment, making setup a breeze across different operating systems.

Together, these tools create a robust and user-friendly platform for AI exploration and content generation.

### Prerequisites

Before we begin, ensure you have the following installed:

1. **Docker Desktop**: Download and install [Docker Desktop](https://www.google.com/url?sa=E&source=gmail&q=https://www.docker.com/products/docker-desktop/). Follow the installation instructions for your operating system (Windows, macOS, or Linux).
2. **Ollama**: Download and install [Ollama](https://www.google.com/url?sa=E&source=gmail&q=https://ollama.com/).  Ollama provides installers for macOS and Linux. For Windows users, Ollama works seamlessly within WSL 2 (Windows Subsystem for Linux).

### Step-by-Step Setup Guide

Let's get everything up and running\! Follow these simple steps:

**Step 1: Verify Docker Desktop Installation**

* Open your terminal or command prompt and run: `docker --version`.
* You should see the Docker version information if the installation was successful.
* Ensure Docker Desktop is running in the background.

**Step 2: Run Ollama in Docker**

While Ollama is installed locally, for this setup, we'll leverage Docker to run it. This keeps our environment clean and consistent.

* In your terminal, pull the Ollama Docker image:

    ```bash
    docker pull ollama/ollama
    ```

* Once the image is pulled, run Ollama:

    ```bash
    docker run -d -p 11434:11434 --name ollama ollama/ollama
    ```

  * `-d`: Runs the container in detached mode (background).
  * `-p 11434:11434`: Maps port 11434 on your host to port 11434 in the container (Ollama's default port).
  * `--name ollama`: Assigns the name "ollama" to the container for easy management.
  * `ollama/ollama`: Specifies the Docker image to use.

**Step 3: Deploy Open WebUI with Docker Compose**

Docker Compose simplifies the deployment of multi-container Docker applications. We'll use it to deploy Open WebUI.

* Create a directory for your project (e.g., `open-webui-ollama`) and navigate into it:

    ```bash
    mkdir open-webui-ollama
    cd open-webui-ollama
    ```

* Create a file named `docker-compose.yml` inside this directory and paste the following content:

    ```yaml
    version: '3'
    services:
    open-webui:
    image: ghcr.io/open-webui/open-webui:main
    ports:
      - 3000:8080
    environment:
    OLLAMA_API_BASE_URL: http://ollama:11434/v1
    volumes:
      - open-webui:/app/data

    volumes:
    open-webui:
    driver: local
    ```

  * This `docker-compose.yml` file defines two services (though we are only explicitly defining one, `open-webui`, and implicitly relying on the `ollama` container we started in the previous step):
    * `open-webui`:  Defines the Open WebUI service.
      * `image`: Specifies the Docker image for Open WebUI.
      * `ports`: Maps port 3000 on your host to port 8080 in the container (Open WebUI's port). You'll access Open WebUI through `http://localhost:3000`.
      * `environment`: Sets the `OLLAMA_API_BASE_URL` environment variable to point Open WebUI to our Ollama container.  **Note:** We use `http://ollama:11434/v1` because Docker Compose, in more complex setups, can create a network where containers can resolve each other by name. In our simple case, since we are running Ollama separately, this might not directly resolve. However, for future scalability and more complex Docker setups, this is good practice. For this simple setup, `http://localhost:11434/v1` will also work if you encounter issues.
      * `volumes`:  Mounts a Docker volume named `open-webui` to persist Open WebUI data.

* Start Open WebUI using Docker Compose:

    ```bash
    docker-compose up -d
    ```

  * `docker-compose up`:  Creates and starts the services defined in `docker-compose.yml`.
  * `-d`: Runs the services in detached mode (background).

**Step 4: Access Open WebUI in Your Browser**

* Open your web browser and navigate to `http://localhost:3000`.
* You should see the Open WebUI interface.

**Step 5: Connect to Ollama**

* By default, Open WebUI is configured to connect to Ollama running on `http://ollama:11434/v1`. If you used the `docker-compose.yml` as provided and ran the `ollama` container as instructed, it should connect automatically.
* If you encounter issues, or if you are running Ollama locally (not in Docker), you might need to adjust the `OLLAMA_API_BASE_URL`. You can usually configure this within the Open WebUI settings interface if needed.

**Step 6: Start Chatting\!**

* Explore the Open WebUI interface. You can now select and download models directly within the UI (powered by Ollama).
* Start chatting with your chosen AI models\!

### Conclusion

Congratulations\! You've successfully set up Open WebUI with Ollama and Docker Desktop. You now have a powerful, local AI environment for experimenting with language models, generating blog content, and exploring the exciting world of AI.
