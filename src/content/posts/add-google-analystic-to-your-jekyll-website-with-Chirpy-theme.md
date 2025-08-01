---
title: Add Google Analytics to your Jekyll website using the Chirpy theme
description: >-
  Let's break down how to add Google Analytics to your Jekyll website using the Chirpy theme. This tutorial will cover everything from setting up your Google Analytics account to verifying the tracking code.
author: minhpt
published: 2025-02-18
category: Self-hosted
tags: [blog, tutorial, github, jekyll, chirpy, self-hosted, google-analystic]
---

### Create a Google Analytics Account (if you don't have one already)

* Go to [https://analytics.google.com/](https://www.google.com/search?q=https://analytics.google.com/)

* Click "Start for free" (or "Sign in" if you already have an account).

* Follow the prompts to create an account. You'll need a Google account.

### Set up a Property for your Jekyll Site

* Once logged in, you'll likely be guided through the setup process. If not, click "Admin" (the gear icon) at the bottom left.

* In the "Account" column, choose the appropriate account (or create a new one).

* In the "Property" column, click "Create Property."

* Choose "Web" as the platform.

* Fill in the following details:

  * **Website name:** The name of your blog (e.g., "My Jekyll Blog").

  * **Website URL:** Your blog's URL (e.g., <https://yourusername.github.io> or your custom domain). Make sure to select https:// (or http:// if your site uses it).

  * **Reporting Time Zone:** Choose your time zone.

  * **Currency:** Your preferred currency.

* Click "Create."

### Get your Tracking ID (Measurement ID)

* After creating the property, you'll be taken to the "Data Streams" section. Click on "Web" to configure the data stream for your website.

* On the Web stream details page, you'll see a "Measurement ID" which starts with G-. This is your Tracking ID. Copy this ID. You'll need it shortly.
  
### Add the Tracking ID to your Jekyll Site (Chirpy Theme)

Chirpy offers a straightforward way to integrate Google Analytics. You'll typically add the tracking ID to your site's \_config.yml file.

* Open \_config.yml: In your Jekyll project directory, open the \_config.yml file.

* **Add the Google Analytics Configuration:** Add the following lines to your \_config.yml file, replacing G-XXXXXXXXXX with your actual Measurement ID:
    `google_analytics: G-XXXXXXXXXX`

* **Important for Chirpy:** Chirpy uses the google\_analytics setting directly. You _do not_ need to add any other code snippets to your \_layouts/default.html or other template files. Chirpy handles the implementation for you.

### Rebuild and Deploy your Jekyll Site

* Run bundle exec jekyll serve (or your usual Jekyll build command) to rebuild your site with the changes.

* Deploy your site to GitHub Pages (or wherever you're hosting it).

### Verify the Tracking Code

* **Visit your website:** Open your blog in a web browser.

* **Use Google Analytics Realtime Reports:** Go back to your Google Analytics dashboard. In the left-hand menu, under "Reports," click on "Realtime" -> "Overview."

* **Check for Activity:** As you browse your website, you should see your activity in the Realtime reports. This confirms that the tracking code is working correctly. It might take a few minutes for data to show up.

### Troubleshooting

* **No data showing up?**

  * Double-check your Measurement ID in \_config.yml. Make sure it's the correct one.

  * Ensure you've rebuilt and redeployed your site after adding the ID.

  * Clear your browser cache and cookies.

  * Give it a little time. Realtime reports are usually quick, but other data might take up to 24 hours to appear.

  * Check your browser's developer console (usually opened by pressing F12) for any JavaScript errors related to Google Analytics.

* **GitHub Pages deployment issues?** Make sure your GitHub Pages settings are correct and that your site is building successfully.

### Important Considerations

* **Privacy:** Be transparent with your users about your use of Google Analytics. Consider adding a privacy policy to your website.

* **GDPR and other regulations:** Be aware of and comply with relevant data privacy regulations, such as GDPR. You might need to configure Google Analytics to anonymize IP addresses or provide users with options to opt out of tracking. Refer to Google Analytics' documentation for compliance details.

By following these steps, you should be able to successfully integrate Google Analytics into your Jekyll blog using the Chirpy theme and start tracking your website traffic.
