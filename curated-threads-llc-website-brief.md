# Website Build Brief: Curated Threads LLC

**For:** Cowork or Claude Code
**Version:** Final, Phase 1 build spec

---

## 1. Business Overview

Curated Threads LLC is a family-owned, print-on-demand Etsy shop selling **hunting, fishing, outdoor, and patriotic** merchandise. Fulfillment is handled through Printify. All checkout stays on Etsy.

**Etsy shop:** https://curatedthreadsllc.etsy.com/

**Social media (link in site footer):**
- Instagram: https://www.instagram.com/curatedthreads_co
- TikTok: https://www.tiktok.com/@curatedthreadsco
- Facebook: https://www.facebook.com/share/19CkAy1XWj/

---

## 2. Website Purpose

Traffic funnel and brand authority hub. Google discovery plus Pinterest destination. Every product card and CTA links to the corresponding Etsy listing.

**Do not build:** cart, checkout, payment processing, customer accounts, inventory management. Etsy handles all of that.

---

## 3. Product Categories (Locked, Equal Peers)

Four top-level categories. Fishing is NOT nested under hunting or outdoor. Each gets its own category landing page and equal navigation weight.

1. **Hunting**
2. **Fishing**
3. **Outdoor**
4. **Patriotic**

Do not build categories, gift guides, or content around anything outside these four.

---

## 4. Product Catalog

Active product types:
- Graphic t-shirts
- Hooded long sleeve tees
- Ceramic mugs (11oz and 15oz)
- Can coolers (koozies)

Approximately 35+ active listings. All have free shipping. All excluded from percentage-off sale campaigns. Mugs and drinkware buyers are treated as less price-sensitive than apparel buyers.

**Pricing (locked):**

| Product | List Price | Sale Price |
|---|---|---|
| T-shirts | $27.99 | $21.99 |
| Hooded long sleeve tees | $34.99 | $29.99 |
| Mugs (11oz) | $18.99 | $15.99 |
| Mugs (15oz) | $21.99 | $18.99 |
| Can coolers | varies | varies |

---

## 5. Copy and Voice Rules (Non-Negotiable)

Applies to every indexable string on the site: page copy, product descriptions, meta tags, alt text, gift guides, everything.

- **No em dashes anywhere.** Use commas, colons, or periods.
- **No gendered "for him / for her" as default framing.** Use recipient-neutral phrasing: "the hunter in your life," "dad, mom, grandpa, grandma, spouse, best friend."
- **Banned phrase (never use):** "Add a personal note at checkout..."
- **Product page section headers must use exact format:** `Product Features:` and `Care Instructions:` (exact capitalization and colon).
- **"Weekend Hooker" pun is banned** from titles, tags, meta, and any indexable text. Design artwork only.

**Tone:** Unisex, recipient-neutral, gift-focused. Warm but not overly casual.

---

## 6. Brand Story (Use Sparingly)

Family-owned LLC run hands-on by Daniel. His daughter co-designs a portion of the catalog and hunts and fishes with the family. This is genuine differentiation but should stay understated:

- One short paragraph on the Story page.
- One honest line on the Hunting category page.
- Do NOT repeat this on every product, on the home page hero, or across category pages. Overuse turns an authentic detail into a marketing gimmick.

---

## 7. Tech Stack

- **Framework:** Astro (preferred) or Next.js
- **Styling:** Tailwind CSS
- **Content:** Markdown files with frontmatter, in the repo
- **Hosting:** Vercel (preferred) or Netlify. Free tier.
- **Domain:** Owner-provided (see runbook)
- **Analytics:** Google Analytics 4 and Google Search Console
- **No CMS. No database. No backend.**
- **Do not use:** Shopify, WooCommerce, WordPress

---

## 8. Site Architecture (Phase 1)

Pages to build:

1. **Home** with hero featuring hunting, seasonal callout slot, four-category grid, featured products, brand story teaser (one line).
2. **Hunting** category page with product grid linking to Etsy.
3. **Fishing** category page with product grid linking to Etsy.
4. **Outdoor** category page with product grid linking to Etsy.
5. **Patriotic** category page with product grid linking to Etsy.
6. **Product detail pages**, one per product, mid-length description, Etsy CTA above the fold.
7. **Gift Guides (2-3 at launch):**
   - Gifts for Hunters Who Have Everything
   - Fishing Gifts for Dad
   - Patriotic Gifts Made in USA
8. **Our Story** page covering family, Daniel, daughter co-designs, family hunts and fishes together.
9. **FAQ / Shipping / Returns** page that mirrors Etsy shop policies.
10. **Contact** page with a simple form or mailto.

**URL structure:**
- `/hunting`, `/fishing`, `/outdoor`, `/patriotic`
- `/products/[slug]`
- `/gift-guides/[slug]`
- `/story`, `/faq`, `/contact`

**Navigation:** All four categories appear in the top nav with equal visual weight.

**Do NOT build in Phase 1:** blog, email capture, product filtering/search, related products carousel, customer accounts.

---

## 9. Product Data Schema

Each product is a markdown file with frontmatter. Example:

```yaml
---
title: "Deer Hunter Coffee Mug for Dad"
slug: "deer-hunter-coffee-mug-dad"
category: "hunting"           # hunting | fishing | outdoor | patriotic
product_type: "mug-15oz"
list_price: 21.99
sale_price: 18.99
free_shipping: true
etsy_listing_url: "https://www.etsy.com/listing/XXXXXX"
short_description: "A rugged 15oz ceramic mug for the deer hunter in your life. Dishwasher safe."
product_features:
  - "15oz ceramic mug"
  - "Dishwasher and microwave safe"
  - "Wraparound print"
  - "Free shipping"
care_instructions:
  - "Top-rack dishwasher safe"
  - "Microwave safe"
  - "Do not scrub with abrasive pads"
images:
  - src: "/images/products/deer-hunter-mug-01.webp"
    alt: "Deer hunter ceramic mug on truck tailgate at dawn"
  - src: "/images/products/deer-hunter-mug-02.webp"
    alt: "Close-up of deer hunter mug design"
tags: ["hunting", "deer hunting", "gifts for dad", "coffee mug"]
publish_date: 2026-01-15
---

Long-form description here, 200+ words, written for Google and human readers. Do not copy the Etsy listing verbatim, rewrite for depth. Use recipient-neutral framing. No em dashes.
```

---

## 10. Etsy Link Pattern

Every Etsy link uses UTM parameters:

```
https://www.etsy.com/listing/{ID}?utm_source=curatedthreadsllc&utm_medium=web&utm_campaign={page_type}&utm_content={product_slug}
```

`page_type` values: `home`, `category_hunting`, `category_fishing`, `category_outdoor`, `category_patriotic`, `product_page`, `gift_guide`.

**"Shop on Etsy" CTA:**
- Primary button above the fold on product pages (mobile-visible without scrolling).
- Secondary CTA at the bottom of the description.
- Both use `rel="noopener"` and open in a new tab.

No Etsy API integration required. Manual product sync is fine at ~35 listings.

---

## 11. SEO Requirements (Non-Negotiable)

1. Static HTML rendering. All content in initial HTML.
2. Unique per-page metadata: `<title>`, `<meta description>`, Open Graph, Twitter Card. Open Graph is critical for Pinterest previews.
3. JSON-LD structured data:
   - `Product` schema on product pages, `offers.url` points to Etsy
   - `BreadcrumbList` sitewide
   - `Organization` on homepage (include social profile URLs in `sameAs`)
   - `Article` on gift guides
4. Auto-generated XML sitemap at `/sitemap.xml`.
5. `robots.txt` allowing indexing, referencing the sitemap.
6. Semantic HTML: one `<h1>` per page, correct heading hierarchy, alt text on every image.
7. Core Web Vitals targets: LCP under 2.5s, CLS under 0.1, INP under 200ms.
8. Image optimization: WebP or AVIF, explicit width/height, lazy-load below-the-fold.
9. Internal linking: every product links to its category and 2-3 related products; gift guides link to featured products.
10. Unique product descriptions rewritten from Etsy, not duplicated.
11. Self-referential canonical tags on all pages.
12. Mobile-first layout.

**Target search intent:**
- "gifts for hunters who have everything"
- "funny hunting shirts for dad"
- "best fishing gifts for father's day"
- "outdoor gifts for dad"
- "patriotic mugs made in USA"

---

## 12. Design Direction

**Aesthetic:** Rugged outdoor, Americana, family outdoor culture. Not corporate, not overly polished, not hipster-minimal.

**Photography:** Environmental lifestyle mockups over flat white lays. Products in a truck bed, on a hunter, in a deer stand, on a boat, at a tailgate, on a kitchen counter. Not floating on white.

**Color palette:**
- Deep forest green (primary)
- Muted blaze orange (hunting accent)
- Weathered navy
- Cream / off-white (backgrounds)
- Warm brown (worn wood texture)
- Matte black (typography)
- Lake blue accent (fishing category)
- Red / white / blue accents (patriotic category)

**Typography:** Bold, workwear-inspired sans or slab for headers. Clean readable sans for body. No script fonts.

---

## 13. Deploy Checklist

- [ ] Repo on GitHub
- [ ] Connected to Vercel, auto-deploy on push to `main`
- [ ] Custom domain with SSL
- [ ] Google Search Console verified, sitemap submitted
- [ ] Google Analytics 4 installed
- [ ] `/robots.txt` and `/sitemap.xml` publicly accessible
- [ ] All product pages have valid `Product` JSON-LD (Google Rich Results Test)
- [ ] Lighthouse audit: 95+ on Performance, Accessibility, SEO
- [ ] Open Graph preview verified (Pinterest, Facebook, Twitter debuggers)
- [ ] All Etsy links have UTM parameters and open in new tabs
- [ ] Footer includes Instagram, TikTok, Facebook links

---

## 14. Deliverables from Cowork / Claude Code

- Working site deployed to production URL under the custom domain
- Git repo with clear README
- README includes step-by-step instructions for:
  - Adding a new product (create markdown file, add images, push to main, auto-deploys)
  - Adding a new gift guide
  - Updating homepage featured products
  - Updating category page copy
- Seed content: 2 sample products per category (8 total minimum) and 1 fully built sample gift guide
- Google Search Console and Analytics either configured or documented handoff steps
- One-page owner handoff doc

---

## 15. What NOT to Build

- No cart, checkout, or payment processing
- No customer accounts or login
- No inventory management
- No em dashes anywhere
- No gendered "for him / for her" default framing
- No "Weekend Hooker" in any indexable content
- No "Add a personal note at checkout..." phrasing
- No blog in Phase 1
- No email capture in Phase 1
- No content outside hunting, fishing, outdoor, or patriotic
