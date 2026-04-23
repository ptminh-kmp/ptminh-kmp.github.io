# Adsense Implementation Guide for Minixium Blog

## Current Status
✅ Adsense script is already included in `src/layouts/Layout.astro`
✅ Google Analytics is configured
✅ AdSense component created (`src/components/AdSense.astro`)
✅ Post layout updated with in-article and below-content ads
✅ Sidebar ads added for desktop
✅ Mobile sticky ads added
✅ All ads are responsive and include fallback for ad blockers

## Implementation Complete!

All AdSense placements have been implemented in the feature branch. Here's what's been added:

## Ad Placements Implemented

### 1. ✅ In-Article Ads (Highest CTR)
**Location:** After post content, before license section
**File:** `src/pages/[lang]/posts/[...slug].astro`
**Slot:** `in-article-ad`
**Format:** Fluid, responsive

### 2. ✅ Below Content Ads
**Location:** After license section, before next/prev navigation
**File:** `src/pages/[lang]/posts/[...slug].astro`
**Slot:** `below-content-ad`
**Format:** Horizontal display

### 3. ✅ Sidebar Ads (Desktop)
**Location:** Right sidebar, above categories
**File:** `src/components/widget/SideBar.astro`
**Slot:** `sidebar-ad`
**Format:** Rectangle (300×250)

### 4. ✅ Sticky Footer Ads (Mobile)
**Location:** Fixed at bottom on mobile devices
**File:** `src/layouts/Layout.astro`
**Slot:** `mobile-sticky-ad`
**Format:** Anchor ad

### 5. ✅ Enhanced AdSense Component
**File:** `src/components/AdSense.astro`
**Features:**
- Ad blocker detection with fallback message
- Unique ID generation for each ad instance
- Error handling for AdSense script
- Responsive design support
- Customizable labels

## Implementation Complete!

All AdSense placements have been implemented. Here's what you need to do next:

### Step 1: Create Ad Units in Adsense Dashboard
1. Go to https://adsense.google.com
2. Navigate to **Ads → Ad units**
3. Create these ad units (match the slot names):
   - **In-article ad** (`in-article-ad`): Responsive, auto-format
   - **Below content ad** (`below-content-ad`): 728×90 leaderboard
   - **Sidebar ad** (`sidebar-ad`): 300×250 display
   - **Mobile sticky ad** (`mobile-sticky-ad`): 320×50 anchor ad

### Step 2: Update Slot IDs
After creating ad units in Adsense, update the slot IDs in these files:

1. **Post layout** (`src/pages/[lang]/posts/[...slug].astro`):
   - Line with `slot="in-article-ad"` → Replace with your actual slot ID
   - Line with `slot="below-content-ad"` → Replace with your actual slot ID

2. **Sidebar** (`src/components/widget/SideBar.astro`):
   - Line with `slot="sidebar-ad"` → Replace with your actual slot ID

3. **Layout** (`src/layouts/Layout.astro`):
   - Line with `slot="mobile-sticky-ad"` → Replace with your actual slot ID

### Step 3: Test Implementation
```bash
# Test locally
pnpm dev
# Visit: http://localhost:4321/en/posts/openclaw-personal-ai-assistant-github-trending-2026/

# Check:
1. Ads display correctly
2. No console errors
3. Responsive design works
4. Mobile sticky ad only shows on mobile
```

### Step 4: Deploy and Monitor
1. Merge the PR and deploy to production
2. Monitor Adsense dashboard for impressions
3. Check Google Analytics for page performance
4. Adjust ad placements if needed based on CTR data

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