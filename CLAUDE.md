# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```
npm install
npm run dev       # http://localhost:4321
npm run build     # production build to dist/
npm run preview   # preview the production build
```

There is no lint or test script. Type checking is only what `astro build` performs.

Ad-hoc scripts (run with `node scripts/<name>.mjs`):
- `generate-merchant-feed.mjs` — emits `merchant-feed.tsv` at repo root for Google Merchant Center. Regenerate after adding/changing products.
- `pinterest-*.mjs` — Pinterest API helpers (auth, pin queue, create pin, sandbox batch).

`merchant-feed.tsv` is gitignored; do not commit it.

## Deploy

Vercel auto-deploys every push to `main`. There is no staging environment. Confirmed authorization: on this repo, complete + commit + push requested changes without a separate confirmation round-trip.

## Architecture

Astro 5 static site — Google/Pinterest funnel to the Etsy shop. **No cart, no checkout, no backend.** Every product CTA is an external link to Etsy with UTM parameters. Do not add e-commerce features.

Key wiring to know before editing:

- **Categories are three, not four.** `src/content.config.ts` enum is `hunting | fishing | patriotic`. "Outdoor" was retired; `vercel.json` 308-redirects `/outdoor` → `/hunting`. The website brief and README predate this — trust the schema. Adding a fourth category means touching the enum, `src/pages/[category].astro` `getStaticPaths`, `Header.astro` nav, and `lib/etsy.ts` `UtmCampaign` type together.
- **Content is markdown, keyed by filename.** Product slug = filename without `.md`. No `slug` frontmatter — Astro derives it from the file id. Schema in `src/content.config.ts` is authoritative (allowed `product_type` values, optional vs required fields, `extra_categories` for cross-listing a product into another category page).
- **Category page ordering is hand-curated.** `src/pages/[category].astro` uses a `huntingPriority` array and `huntingLowPriority` set to override alphabetical sort. Sections (`tees`, `hoodies`, `youth`, `cups`, `accessories`) mirror the Etsy shop layout so shoppers see familiar groupings. Homepage "Fan favorites" order lives in a `featuredOrder` array in `src/pages/index.astro` — a product must have `featured: true` AND appear in that list to show.
- **Etsy links go through `lib/etsy.ts`.** Never build raw Etsy URLs. Use `etsyLink({ listingUrl, campaign, productSlug })` or `shopWithUtm(campaign)`; both strip existing query strings and append the standard UTM set. `UtmCampaign` is a closed union — add new values there.
- **Etsy CDN images use variant swapping.** `etsyImage(src, variant)` and `etsyImageSrcSet(src, variants)` rewrite the `il_fullxfull.` segment in Etsy URLs to a size variant (e.g. `il_570xN`, `il_1140xN`). Always pick the right variant + srcset for the display size; requesting `il_fullxfull` for a card wastes bandwidth and looks softer on some browsers.
- **Brand images that need srcset live in `src/assets/`.** Anything imported and passed to Astro's `<Image>` component (Sharp pipeline, WebP, retina srcset) must be under `src/assets/`. Static-path assets referenced by URL live in `public/images/brand/`. Some images exist in both locations on purpose.
- **The sitemap URL is rewritten.** `@astrojs/sitemap` outputs `/sitemap-index.xml`; `vercel.json` rewrites `/sitemap.xml` → `/sitemap-index.xml` so both work. Do not change that rewrite without updating `robots.txt`.
- **Analytics + ad pixels are all in `src/layouts/BaseLayout.astro`** as inline `is:inline` scripts: GA4 (`G-1JLQ73FPKR`), Microsoft Clarity (`xp39uxe5ke`), Pinterest Tag, Meta Pixel, TikTok Pixel. Product page tracks `AddToCart` on every `[data-pintrk-shop-etsy]` click across all three pixels.
- **Product JSON-LD is dynamic per build.** `src/pages/products/[slug].astro` sets `priceValidUntil` to +6 months from build time and points `offers.url` at the site's own product page (Google Merchant Center requires the landing URL to match the registered store domain — the on-page button still goes to Etsy).

## Copy and voice rules (non-negotiable, enforced by review not tooling)

Apply to every indexable string — page copy, product titles/descriptions, meta, alt text, tags, gift guides.

- No em dashes anywhere. Use commas, colons, or periods.
- Recipient-neutral framing only. Never "for him / for her". Use "the hunter in your life," "dad, mom, grandpa, grandma, spouse, best friend."
- Banned phrase: "Add a personal note at checkout."
- "Weekend Hooker" never appears in any indexable text (design artwork only).
- Product page section headers must be the exact strings `Product Features:` and `Care Instructions:` with the colon.
- Family/Daniel-and-daughter brand story stays understated — one paragraph on Story, one line on Hunting. Do not repeat on every product or the homepage hero.

## Where copy lives

- Category hero title/kicker/body: `meta` constant in `src/pages/[category].astro`.
- Homepage sections: inline in `src/pages/index.astro`.
- Product long-form body: markdown body of each `src/content/products/*.md` (below the frontmatter `---`).
- Featured homepage picks: `featured: true` in product frontmatter AND the slug listed in `featuredOrder` in `src/pages/index.astro`.
