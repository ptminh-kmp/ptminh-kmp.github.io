# Adsense Implementation Guide for Minixium Blog

## Current Status
✅ Adsense script is already included in `src/layouts/Layout.astro`
✅ Google Analytics is configured
❌ Ad units are not placed within content
❌ No responsive ad placements

## Recommended Ad Placements

### 1. In-Article Ads (Highest CTR)
**Location:** Between H2 sections in long-form content
**Implementation:** Modify `src/pages/[lang]/posts/[...slug].astro`

```astro
// Add this import at the top
import AdSense from "@components/AdSense.astro";

// Then in the template, after the Markdown component, add:
<AdSense 
  slot="your-ad-slot-id-here" 
  className="my-8"
  format="fluid"
  layout="in-article"
  responsive={true}
/>
```

### 2. Sidebar Ads (Desktop)
**Location:** Right sidebar in `src/layouts/MainGridLayout.astro`
**Implementation:** Add to sidebar component

### 3. Below Content Ads
**Location:** After post content, before next/prev navigation
**Implementation:** Add to `src/pages/[lang]/posts/[...slug].astro`

### 4. Sticky Footer Ads (Mobile)
**Location:** Fixed at bottom on mobile
**Implementation:** Add to `src/layouts/Layout.astro`

## Step-by-Step Implementation

### Step 1: Create Ad Units in Adsense Dashboard
1. Go to https://adsense.google.com
2. Navigate to **Ads → Ad units**
3. Create these ad units:
   - **In-article**: Responsive, auto-format
   - **Sidebar**: 300×250 display
   - **Below content**: 728×90 leaderboard
   - **Mobile sticky**: 320×50 anchor ad

### Step 2: Update Post Layout
Modify `src/pages/[lang]/posts/[...slug].astro`:

```astro
---
// Add import
import AdSense from "@components/AdSense.astro";
// ... existing imports ...
---

// In the template, find the Markdown section and add ads:

<Markdown class="mb-6 markdown-content onload-animation">
    <Content />
</Markdown>

<!-- Add in-article ad after content -->
<AdSense 
  slot="your-in-article-slot-id" 
  className="my-8 rounded-lg"
  format="fluid"
  layout="in-article"
  responsive={true}
/>

{licenseConfig.enable && <License ... />}

<!-- Add below-content ad -->
<AdSense 
  slot="your-below-content-slot-id" 
  className="my-8"
  format="horizontal"
  layout="display"
  responsive={true}
/>
```

### Step 3: Add Sidebar Ads
Modify `src/components/widget/SideBar.astro` (if it exists) or create it:

```astro
---
import AdSense from "./AdSense.astro";
---

<aside class="sidebar-ads">
  <AdSense 
    slot="your-sidebar-slot-id"
    className="sticky top-20"
    format="rectangle"
    responsive={true}
  />
</aside>
```

### Step 4: Add Mobile Sticky Ads
Modify `src/layouts/Layout.astro`:

```astro
<!-- Add before closing body tag -->
<div class="adsense-sticky-mobile">
  <AdSense 
    slot="your-mobile-sticky-slot-id"
    className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
    format="anchor"
    responsive={true}
  />
</div>
```

## Best Practices for Higher RPM

### 1. Content Length
- **Target:** 1500-3000 words per post
- **Current OpenClaw post:** ~2000 words ✅
- **Action:** Continue writing comprehensive posts

### 2. Internal Linking
- Link to 3-5 related posts within content
- Use descriptive anchor text
- Update old posts with links to new content

### 3. SEO Optimization
- Primary keyword in title (H1)
- Secondary keywords in H2/H3
- Meta description under 160 chars
- URL includes primary keyword
- Image alt text with keywords

### 4. User Experience
- Place ads naturally between content sections
- Avoid more than 3 ads per page on mobile
- Ensure ads don't interfere with navigation
- Test on mobile devices

## Monitoring & Optimization

### Metrics to Track:
1. **Page RPM** (Revenue per 1000 impressions)
2. **CTR** (Click-through rate)
3. **Viewability** (Percentage of ads seen)
4. **Bounce rate** (Impact of ads on UX)

### Optimization Schedule:
- **Weekly:** Check Adsense performance
- **Monthly:** Adjust ad placements based on data
- **Quarterly:** Review content performance
- **Annually:** Update ad strategies

## Troubleshooting

### Common Issues:
1. **Ads not showing:** Check ad blocker, ensure script loads
2. **Low CTR:** Test different ad placements
3. **High bounce rate:** Reduce ad density, improve content
4. **Policy violations:** Review Adsense policies regularly

### Testing Checklist:
- [ ] Ads display on desktop
- [ ] Ads display on mobile
- [ ] No console errors
- [ ] Page load time < 3 seconds
- [ ] Ads don't break layout
- [ ] Click tracking works

## Advanced Strategies

### 1. A/B Testing
Test different ad placements:
- Version A: Ads after every H2
- Version B: Ads after every 500 words
- Version C: Mixed placement

### 2. Seasonal Content
Create content around:
- Holiday shopping (affiliate links)
- Back-to-school (tech tools)
- New Year (productivity apps)

### 3. Affiliate Integration
Combine Adsense with:
- Hosting referrals (DigitalOcean, Vultr)
- Course promotions (Udemy, Coursera)
- Tool discounts (GitHub Copilot, JetBrains)

## Next Steps

1. **Immediate:** Implement in-article ads in post layout
2. **Short-term:** Add sidebar ads for desktop
3. **Medium-term:** Create sticky mobile ads
4. **Long-term:** A/B test placements, add affiliate links

## Resources
- [Adsense Help Center](https://support.google.com/adsense)
- [Adsense Policies](https://support.google.com/adsense/answer/48182)
- [Web Vitals Guide](https://web.dev/vitals/)
- [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)

---

*Note: Always comply with Adsense policies. Too many ads or intrusive placements can lead to account suspension.*