# Curated Threads Outdoors

Static marketing site for Curated Threads LLC. Traffic funnel that routes Google and Pinterest visitors to the [Etsy shop](https://curatedthreadsllc.etsy.com/). No cart, no checkout, no backend. Every product card and CTA links to the corresponding Etsy listing with UTM parameters. Do not add e-commerce features.

- **Live:** https://curatedthreadsoutdoors.com
- **Repo:** https://github.com/curatedthreadsco/curated-threads-site
- **Framework:** Astro 5, Tailwind CSS 4, `@astrojs/sitemap`
- **Analytics + ad pixels** (all inline in [`src/layouts/BaseLayout.astro`](src/layouts/BaseLayout.astro)): Google Analytics 4 (`G-1JLQ73FPKR`), Microsoft Clarity (`xp39uxe5ke`), Pinterest Tag, Meta Pixel, TikTok Pixel. Product page fires `AddToCart` on every `[data-pintrk-shop-etsy]` click across all three ad pixels.
- **Hosting:** Vercel (Hobby plan). Auto-deploys every push to `main`. No staging environment.

For agent-facing conventions (voice rules, wiring you must not break), see [CLAUDE.md](CLAUDE.md). This README is the human-facing version and stays aligned with it.

---

## Table of contents

1. [Local development](#local-development)
2. [Project structure](#project-structure)
3. [Copy and voice rules](#copy-and-voice-rules-apply-to-every-indexable-string)
4. [Adding a new product](#adding-a-new-product)
5. [Adding a new gift guide](#adding-a-new-gift-guide)
6. [Updating homepage featured products](#updating-homepage-featured-products)
7. [Updating category page copy](#updating-category-page-copy)
8. [Brand images](#brand-images)
9. [Ad-hoc scripts](#ad-hoc-scripts)
10. [Owner handoff checklist](#owner-handoff-checklist)

---

## Local development

```
npm install
npm run dev       # http://localhost:4321
npm run build     # production build to dist/
npm run preview   # preview the production build locally
```

There is no lint or test script. Type checking is only what `astro build` performs.

## Project structure

```
src/
  content.config.ts               # Zod schemas for products and gift-guides (authoritative)
  content/
    products/*.md                 # one file per product; filename = URL slug
    gift-guides/*.md              # one file per gift guide
  layouts/BaseLayout.astro        # HTML shell, meta, GA4, Clarity, Pinterest/Meta/TikTok pixels
  components/
    Header.astro                  # top nav
    Footer.astro                  # social links + shop link
    ProductCard.astro             # reusable product grid card
  lib/etsy.ts                     # UTM helpers + Etsy CDN image variant swapping
  pages/
    index.astro                   # homepage ("Fan favorites" grid)
    [category].astro              # /hunting, /fishing, /patriotic
    products/[slug].astro         # product detail pages (dynamic JSON-LD)
    gift-guides/index.astro       # gift guide index
    gift-guides/[slug].astro      # gift guide detail pages
    story.astro
    faq.astro
    privacy.astro
    404.astro
  assets/                         # brand images consumed by <Image> (Sharp/WebP/retina srcset)
  styles/global.css               # Tailwind + brand theme
public/
  robots.txt
  favicon.svg
  images/brand/                   # brand assets referenced by URL (not through <Image>)
scripts/                          # ad-hoc Node scripts (see "Ad-hoc scripts")
astro.config.mjs                  # site URL, sitemap integration, tailwind
vercel.json                       # /sitemap.xml → /sitemap-index.xml rewrite + legacy redirects
```

Notes on wiring you'll want to know before editing:

- **Three categories, not four.** The `category` enum in `src/content.config.ts` is `hunting | fishing | patriotic`. "Outdoor" was retired; `vercel.json` 308-redirects `/outdoor` → `/hunting`. Adding a fourth category means touching the enum, `getStaticPaths` in `src/pages/[category].astro`, the nav in `Header.astro`, and the `UtmCampaign` union in `lib/etsy.ts` together.
- **Etsy links go through `lib/etsy.ts`.** Never build raw Etsy URLs. Use `etsyLink({ listingUrl, campaign, productSlug })` or `shopWithUtm(campaign)`; both strip any existing query string and append the standard UTM set.
- **Etsy CDN images use variant swapping.** `etsyImage(src, variant)` and `etsyImageSrcSet(src, variants)` rewrite the `il_fullxfull.` segment (e.g. `il_570xN`, `il_1140xN`). Pick the right variant + srcset for the display size — requesting `il_fullxfull` for a card wastes bandwidth.
- **Category page ordering is hand-curated.** `src/pages/[category].astro` uses a `huntingPriority` array and `huntingLowPriority` set to override alphabetical sort. Section groupings (`tees`, `hoodies`, `youth`, `cups`, `accessories`) mirror the Etsy shop layout.
- **Sitemap URL is rewritten.** `@astrojs/sitemap` outputs `/sitemap-index.xml`; `vercel.json` rewrites `/sitemap.xml` → `/sitemap-index.xml` so both work. If you change that rewrite, also update `robots.txt`.
- **Product JSON-LD is dynamic per build.** `src/pages/products/[slug].astro` sets `priceValidUntil` to +6 months from build time and points `offers.url` at the site's own product page (Google Merchant Center requires the landing URL to match the registered store domain — the on-page button still goes to Etsy).

## Copy and voice rules (apply to every indexable string)

These rules are non-negotiable and enforced by content review, not tooling. Apply to any page copy, product title, product description, meta tag, alt text, tag, or gift guide.

- No em dashes anywhere. Use commas, colons, or periods.
- Recipient-neutral framing only. Never "for him / for her". Use "the hunter in your life," "dad, mom, grandpa, grandma, spouse, best friend."
- Never use the phrase "Add a personal note at checkout."
- "Weekend Hooker" never appears in titles, tags, meta, or any indexable text. Design artwork only.
- Product page section headers must be the exact strings `Product Features:` and `Care Instructions:` with the colon.
- Family/Daniel-and-daughter brand story stays understated. One paragraph on Story, one line on Hunting. Do not repeat on every product or the homepage hero.
- Tone: unisex, recipient-neutral, gift-focused. Warm but not overly casual.

## Adding a new product

1. Copy an existing markdown file from `src/content/products/` as a template.
2. Change the filename. The filename minus `.md` becomes the URL slug: `src/content/products/my-new-mug.md` becomes `/products/my-new-mug`. Use lowercase, hyphens, letters and numbers only. There is no `slug` field in frontmatter; Astro derives it from the file id.
3. Fill in the frontmatter. The Zod schema in [`src/content.config.ts`](src/content.config.ts) is authoritative. Common fields:
   - `title`: site title (follow the copy rules above)
   - `category`: one of `hunting`, `fishing`, `patriotic`
   - `extra_categories`: optional array of additional categories to cross-list the product under
   - `product_type`: one of the allowed types listed in `content.config.ts` (`tee`, `hoodie`, `tank-top`, `mug-11oz`, `mug-15oz`, `tumbler-22oz`, `tumbler-40oz`, `can-cooler`, `whiskey-glass`, `shot-glass`, `pint-glass`, `mixing-glass`, `car-magnet`, `phone-case`)
   - `list_price` (and optional `sale_price`): numbers
   - `free_shipping`: boolean, defaults `true`
   - `etsy_listing_url`: full Etsy listing URL (the site strips any query string and appends UTMs automatically)
   - `etsy_listing_id`: optional Etsy numeric ID
   - `short_description`, `product_features`, `care_instructions`, `images`, `tags`
   - `featured`: boolean — see [Updating homepage featured products](#updating-homepage-featured-products) for how this is used
   - `youth`: boolean — flags youth-sized apparel; category page groups these under the "youth" section
   - `publish_date`: optional ISO date
4. Write a mid-length description (about 200 words) in the body below the closing `---`. Do not copy the Etsy listing verbatim. Rewrite for depth.
5. Commit and push to `main`. Vercel auto-deploys in about a minute.
6. The product is now live at `/products/{slug}`, appears in its category page and any gift guide that references its slug, and is included in the auto-generated sitemap. If you added or changed a listing, regenerate the Merchant Center feed — see [Ad-hoc scripts](#ad-hoc-scripts).

## Adding a new gift guide

1. Create a new markdown file at `src/content/gift-guides/{slug}.md`. The slug becomes the URL.
2. Frontmatter fields:
   - `title`: displayed as the page H1 (e.g. "Fishing Gifts for Dad")
   - `description`: 1 to 2 sentences used in the meta description
   - `hero_intro`: opening paragraph shown under the H1
   - `featured_products`: list of product slugs (the filenames minus `.md` from `src/content/products/`) that appear as cards
   - `publish_date`: ISO date `YYYY-MM-DD`
   - `updated_date`: optional ISO date
3. Body content becomes the article prose between the intro and the product grid.
4. Commit and push. The guide appears at `/gift-guides/{slug}` and is auto-linked from `/gift-guides`.

## Updating homepage featured products

The homepage "Fan favorites" grid requires **both**:

1. `featured: true` in the product's frontmatter, **and**
2. The product's slug listed in the `featuredOrder` array in [`src/pages/index.astro`](src/pages/index.astro).

`featuredOrder` is the source of truth for order — the homepage tiles render in the order you list them there. To promote a product: set `featured: true` and add the slug where you want it in `featuredOrder`. To retire one: remove it from `featuredOrder` (or set `featured: false`). No other files need changes.

## Updating category page copy

Each category's hero title, kicker, and body live in the `meta` constant in [`src/pages/[category].astro`](src/pages/[category].astro). Edit the strings for the relevant category and push.

Category hero copy is the one place category-specific messaging lives. Homepage section copy is inline in [`src/pages/index.astro`](src/pages/index.astro). Product long-form copy lives in the markdown body of each `src/content/products/*.md` (below the frontmatter `---`).

## Brand images

There are two locations for brand imagery, and both are used on purpose:

- **`src/assets/`** — anything imported and passed to Astro's `<Image>` component. Sharp pipeline handles WebP conversion and retina srcset. Use this for hero images, category tiles, and any brand asset that benefits from responsive sizing.
- **`public/images/brand/`** — static assets referenced by URL (e.g. in an inline `<img>` tag, meta tags, or third-party integrations). No processing.

Some assets exist in both locations intentionally. If you're adding a new brand image and you want retina/WebP, import from `src/assets/` and use `<Image>`. If you need a stable public URL, put it under `public/images/brand/`.

## Ad-hoc scripts

Run with `node scripts/<name>.mjs` from the repo root.

- **`generate-merchant-feed.mjs`** — emits `merchant-feed.tsv` at the repo root for Google Merchant Center. Regenerate after adding or changing products. **`merchant-feed.tsv` is gitignored; do not commit it.**
- **`pinterest-auth.mjs`, `pinterest-build-pin-queue.mjs`, `pinterest-create-pin.mjs`, `pinterest-sandbox-batch.mjs`** — Pinterest API helpers for OAuth, queue building, pin creation, and sandbox testing.

## Owner handoff checklist

Post-launch operational tasks. Some are one-time, some recurring.

- [x] Repo on GitHub, connected to Vercel, auto-deploy on push to `main`
- [x] Custom domain with SSL (`curatedthreadsoutdoors.com`)
- [x] Google Analytics 4 wired (`G-1JLQ73FPKR`)
- [x] Microsoft Clarity wired (`xp39uxe5ke`)
- [x] Pinterest Tag, Meta Pixel, TikTok Pixel wired, with `AddToCart` firing on every Etsy CTA click
- [x] `/robots.txt` and `/sitemap.xml` publicly accessible
- [x] Product JSON-LD on every product page (verify with [Google Rich Results Test](https://search.google.com/test/rich-results))
- [x] Every Etsy link has UTM parameters, opens in a new tab, uses `rel="noopener"`
- [x] Footer social links (Instagram, TikTok, Pinterest, Facebook)
- [ ] Verify the site in Google Search Console at https://search.google.com/search-console and submit `https://curatedthreadsoutdoors.com/sitemap-index.xml`
- [ ] Set up Bing Webmaster Tools ([https://www.bing.com/webmasters](https://www.bing.com/webmasters)) and submit the same sitemap. Bing powers ChatGPT search and other AI answer engines.
- [ ] Keep Google Merchant Center feed fresh: rerun `node scripts/generate-merchant-feed.mjs` after any product change and upload the resulting `merchant-feed.tsv`.
- [ ] Verify Open Graph previews with the [Pinterest debugger](https://www.pinterest.com/pin_creation/), [Facebook debugger](https://developers.facebook.com/tools/debug/), and [X card validator](https://cards-dev.twitter.com/validator)
- [ ] Lighthouse audit target: 95+ on Performance, Accessibility, and SEO (run from Chrome DevTools)
- [ ] Long-form product descriptions: rewrite the generic 3-paragraph bodies in-brand over time. Higher-margin items (mugs, drinkware) benefit most.
- [ ] Consider adding more gift guides (e.g. "Fishing Gifts for Dad," "Patriotic Gifts Made in USA") — see [Adding a new gift guide](#adding-a-new-gift-guide).
