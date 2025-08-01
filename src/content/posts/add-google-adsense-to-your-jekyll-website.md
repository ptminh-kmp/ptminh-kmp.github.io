---
title: >- 
  💰 Monetize Your Jekyll Site 💰: A Step-by-Step Guide to Adding Google AdSense
description: >-
  Learn how to easily integrate Google AdSense into your Jekyll website and start earning revenue. This comprehensive guide covers everything from account setup to optimal ad placement.
author: minhpt
published: 2025-02-18
category: Self-hosted
tags: [tutorial, self-hosted, jekyll, Jekyll AdSense, Add Google AdSense Jekyll, Monetize Jekyll Blog, Google AdSense Integration, Jekyll Ads, Jekyll Ad Revenue, Jekyll Ad Placement]
image: https://minixium-bucket.hn.ss.bfcplatform.vn/blog/posts/google-adsense.jpg

---

> Cover image source: [Source](https://minixium-bucket.hn.ss.bfcplatform.vn/blog/posts/google-adsense.jpg)

Want to turn your passion for writing into a source of income? If you're running a Jekyll-powered website or blog, adding Google AdSense is a fantastic way to monetize your content. While Jekyll is known for its simplicity and speed, integrating external services like AdSense can sometimes seem daunting. But fear not! This guide will walk you through the process step-by-step, ensuring you can seamlessly add AdSense to your Jekyll site.

### Why Use Google AdSense with Jekyll?

- **Earn Revenue**: Generate income from your website traffic.
- **Easy Integration**: While it requires a few steps, it's relatively straightforward.
- **Targeted Ads**: Google's algorithms display relevant ads to your audience.
- **Customization**: Control ad placement and appearance.

### Prerequisites

- A Google AdSense account (apply at google.com/adsense)
- A Jekyll website or blog.
- Access to your website's HTML files.

#### Step 1: Get Your AdSense Code

1. Sign in to your Google AdSense account <https://adsense.google.com/start/>.
2. Navigate to `Site` > `New site`
![Desktop View](https://minixium-bucket.hn.ss.bfcplatform.vn/blog/posts/create-new-site.png)
3. Choose an verification method (e.g., `Adsense Code snippet`, `Ads.txt snippet`, `Meta tag`.)
![Desktop View](https://minixium-bucket.hn.ss.bfcplatform.vn/blog/posts/add-code.png)

#### Step 2: Add Verification Code to Jekyll website

##### Using Adsense Code snippet

1. Create `_includes` folder at your Jekyll project

```bash
cd [your-jekyll-project]
mkdir _includes
```

2. Create `head.html` file in `_includes` folder.

```bash
touch head.html
```

3. Copy and paste all content of `head.html` in this link: <https://github.com/cotes2020/jekyll-theme-chirpy/blob/master/_includes/head.html>
4. Create `google-adsense.html` file in `_includes` folder.

```bash
touch google-adsense.html
```

5. Edit `google-adsense.html` file with your Google Adsense Snippet above.

```text
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=[your-ca-pub-id]"
     crossorigin="anonymous"></script>
```

1. Edit `head.html`:

```html
  <head>
    <!--some code above-->
    {% include metadata-hook.html %}
    <!--add this line-->
    {% include google-adsense.html %} 
  </head>
```

##### Using Ads.txt snippet

1. Create `ads.txt` file in your Jekyll project:

```bash
  touch ads.txt
```

2. Edit `ads.txt` file with your Ads.txt snippet.

##### Using Meta tag

1. Edit `head.html` file in `_includes` folder.
2. Add Google Adsense meta tag insite `<head>` tag:

```html
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f7f7f7">
  <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1b1b1e">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <!--add this line-->
  <meta name="google-adsense-account" content="[your-meta-tag]">
  <meta
    name="viewport"
    content="width=device-width, user-scalable=no initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
  >
  <!--some remain code-->
</head>
```

#### Step 3: Verify code and monitoring

1. **AdSense Verification**: Google will review your site to ensure it complies with their policies. This may take some time.
2. **Check Ad Display**: Once approved, ads should start appearing on your site.
3. **Monitor Performance**: Use your AdSense dashboard to track your earnings and ad performance.
4. **Optimize Ad Placement**: Experiment with different ad placements to maximize revenue.

### Tips for Success

- **Content is King**: Focus on creating high-quality, engaging content.
- **Responsive Design**: Ensure your website and ads are responsive across devices.
- **Ad Placement Optimization**: Avoid placing too many ads or ads that disrupt user experience.
- **AdSense Policies**: Adhere to Google's AdSense policies to avoid account suspension.

### Conclusion

Adding Google AdSense to your Jekyll website is a straightforward process that can help you monetize your content. By following these steps and optimizing your ad placement, you can start earning revenue from your hard work. Remember to prioritize user experience and create valuable content to maximize your earnings. Happy monetizing!- Back to Google Adsense page and click `Verify` button.
