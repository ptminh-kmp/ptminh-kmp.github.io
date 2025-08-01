---
title: Create personal blog with Github Pages and Jekyll with Chirpy theme
description: >-
  Learn how to install, configure, and deploy the Chirpy Jekyll theme for your blog. This step-by-step guide covers Dev Containers, native setup, customization options, and deployment methods like GitHub Actions.
author: minhpt
published: 2025-02-03
category: Self-hosted
tags: [blog, tutorial, github, jekyll, chirpy, self-hosted]
lang: en
---

This guide will walk you through setting up and using the Chirpy Jekyll theme for your website.

### 1. Choose Your Starting Point

* **Recommended:** Use the **Chirpy Starter** for easy upgrades and minimal configuration.
  * On GitHub, navigate to the [Chirpy Starter](https://github.com/cotes2020/chirpy-starter) and click "Use this template."
  * Create a new repository named `<your_username>.github.io` (replace `<your_username>` with your actual GitHub username). This will automatically configure GitHub Pages to host your site.

* **For Advanced Customization:** Fork the main theme repository ([Fork the Theme Repository](https://tranglc.github.io/posts/getting-started/)).
  * **Caution:** This option is for those comfortable with Jekyll modifications. You'll be responsible for managing updates and potential conflicts.

### 2. Set Up Your Development Environment

* **Recommended (Windows):** Use **Dev Containers** for an isolated and consistent environment.
  * **Install Docker:**
    * **Windows/macOS:** Install Docker Desktop from [Docker](https://www.docker.com/products/docker-desktop/).
    * **Linux:** Install Docker Engine from the official Docker documentation.
  * **Install VS Code:** Download and install VS Code from [code.visualstudio.com](https://code.visualstudio.com/).
  * **Install the Dev Containers Extension:** Search for "Remote - Containers" in the VS Code extensions marketplace and install it.
  * **Clone into a Container:**
    * **Method 1 (Docker Desktop):** Open VS Code and use the "Clone Repository" command. Choose your newly created repository. VS Code will guide you through creating a Dev Container and opening the project within it.
    * **Method 2 (Docker Engine):** Clone the repository locally. In VS Code, open the folder and select "Reopen in Container." VS Code will create and start a container for your project.

* **Native Setup (Unix-like Systems):**

  * **Install Jekyll:** Follow the official Jekyll installation guide: [Jekyll Installation](https://jekyllrb.com/docs/installation/).
  * **Install Git:** If you don't have it already, install Git from [git-scm.com](https://git-scm.com/).
  * **Clone your Repository:** Use Git to clone your chosen repository (Starter or forked theme) to your local machine.
  * **Initialize (if forked):** If you forked the theme, run `bash tools/init.sh` in the root directory to initialize the repository.
  * **Install Dependencies:** Run `bundle` in the root of your repository to install the required Ruby gems.

### 3. Run the Site Locally

* **Start the Jekyll Server:** Execute the following command in your terminal:

```bash
bundle exec jekyll s
```

* **Access Your Site:** Open your web browser and navigate to `http://127.0.0.1:4000/`.

### 4. Customize

* **Configure:** Edit the `_config.yml` file to adjust settings:
  * `url`: The base URL of your site (e.g., `https://yourdomain.com`).
  * `title`: The title of your site.
  * `author`: Your name or pen name.
  * `avatar`: The URL of your profile picture.
  * `timezone`: Your local timezone.
  * `lang`: The language of your site (e.g., `en`, `es`).
  * **Note:** Refer to the `_config.yml` file for a complete list of available options.

* **Social Contacts:**
  * Edit the `_data/contact.yml` file to enable or disable social media links (e.g., Twitter, GitHub, LinkedIn).
  * Add or remove social media handles as needed.

* **Styles:**
  * Customize the stylesheet by modifying `assets/css/jekyll-theme-chirpy.scss`.
  * Add your custom CSS at the end of the file to avoid conflicts during future theme updates.

* **Static Assets:**
  * **Customization:** Modify or replace existing static assets (images, JavaScript, etc.) within the `assets` folder.
  * **Self-hosting:**
    * Refer to the `_chirpy-static-assets_` repository for instructions on self-hosting static assets for better performance and control.
    * Update the CDN URLs in `_data/origin/cors.yml` to point to your self-hosted assets.

### 5. Deploy Your Site

* **GitHub Pages with GitHub Actions (Recommended):**

  * **Ensure Public Repository:** If using the free GitHub plan, your repository must be public.
  * **Platform Compatibility (if using `Gemfile.lock`):** If your local machine is not Linux, update the platform list in your `Gemfile.lock`:

```bash
bundle lock --add-platform x86_64-linux
```

* **Configure GitHub Pages:**
  * In your GitHub repository, go to **Settings** -> **Pages**.
  * In the **Source** section, select **"GitHub Actions"** from the dropdown menu.

* **Deploy:** Push your changes to GitHub. The GitHub Actions workflow will automatically build and deploy your site.

* **Manual Deployment:**

  * **Build the Site:** Run the following command in your terminal:

```bash
JEKYLL_ENV=production bundle exec jekyll b
```

> **Upload Files:** The generated site files will be located in the `_site` folder. Upload the contents of this folder to your web server (e.g., using FTP, SFTP, or rsync).
{: .prompt-info }

**Video**

<iframe width="100%" height="468" src="https://www.youtube.com/embed/hKMF9LXlO7w" title="YouTube video player" frameborder="0" allowfullscreen></iframe>

**Key Considerations**

* **Project Sites:** If you are using a GitHub Project site or a custom domain, you may need to adjust the `baseurl` in `_config.yml`. For example, if your project name is "my-blog," set `baseurl: "/my-blog"`.
* **Refer to the Documentation:** For detailed information, consult the official Chirpy documentation and the Jekyll documentation.
