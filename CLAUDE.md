# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick start for a new session

Most of the ongoing work is **adding new Etsy listings and syncing feeds**. The workflow is CSV-driven and repeatable — read this section before doing anything else so you don't waste turns re-deriving it.

**What a "batch add" run looks like end-to-end:**

1. The user attaches an Etsy CSV export from their Desktop (`EtsyListingsDownload.csv`) and gives you the listing URLs + titles. **Etsy blocks WebFetch (403)** — always ask for the CSV; never try to scrape.
2. Copy the CSV into the scratchpad: `cp "/c/Users/danie/OneDrive/Desktop/EtsyListingsDownload.csv" "$SCRATCH/etsy-batch.csv"` where `$SCRATCH` is the scratchpad directory named in your system prompt.
3. Write a Node build script in the scratchpad (`build-batch-<date>.mjs`) that:
   - Parses the CSV (embedded newlines in quoted fields — use the parser pattern from prior batch scripts; see git log or scratchpad).
   - Matches each row by unique title prefix (`row.TITLE.toLowerCase().startsWith(match.toLowerCase())`).
   - Writes one markdown per product into `src/content/products/<slug>.md` using the templates in "Product markdown template" below.
4. Run the script, then `npm run build` to catch any Zod schema errors.
5. `npm run feeds` to regenerate `public/meta-catalog.csv` and `merchant-feed.tsv`.
6. `node scripts/pinterest-refresh.mjs` to renew the OAuth token, then `node scripts/pinterest-build-pin-queue.mjs` to write a fresh `pinterest-pins-queue.csv` of only the not-yet-pinned products.
7. `SendUserFile` both `merchant-feed.tsv` and `pinterest-pins-queue.csv` back with `display: "attach"` (the attach card is the one with the download button — `render` opens inline preview and hides it).
8. Commit + push. Vercel auto-deploys.

**Current pricing tiers (2026-09-21):**
- Adult tees: **$28.99**
- Adult hoodies: **$49.99**
- Adult mugs (11oz/15oz variant): **$18.99**
- Youth tees: **$19.99** (newer batches) or **$21.99** (earlier batches — do not backfill)
- Youth hoodies: **$31.99**

**Category routing rules:**
- `hunting` — everything hunting-related (deer, turkey, bear, elk, pheasant, duck, coyote/varmint, coonhound, beagle rabbit hunting, bow hunting, skinning-shed / meat-hunter designs).
- `fishing` — includes fly-fishing (rainbow trout / Ugly Flies-style designs), bass, marlin, koozies.
- `patriotic` — American flag, eagles, 250th anniversary, USA pride.

**Slug pattern:** long, keyword-rich, hyphenated, all lowercase, no special chars. Match the Etsy title's first several keywords: `bow-season-state-of-mind-tee-whitetail-deer-bow-hunter-shirt`.

**Where images live in the Etsy CSV:** columns `IMAGE1`…`IMAGE10`, always `il_fullxfull` URLs from `i.etsystatic.com`. Store them exactly as-is in frontmatter — `lib/etsy.ts` handles variant swapping downstream. Some CSV rows have fewer than 10; `yamlImages()` in prior scripts handles this.

**Pinterest boards** (from `scripts/pinterest-build-pin-queue.mjs`):
- `Gifts for Hunters and Fishermen!!` → hunting + fishing categories.
- `PATRIOTIC 4th OF JULY GIFTS!!` → patriotic category.
- Dedup is by Etsy listing ID embedded in the pin's link, so re-running the queue script always emits only the missing ones.

**Pinterest CSV format** (per Pinterest's help doc, matched exactly by `pinterest-build-pin-queue.mjs`):
```
Title | Media URL | Pinterest board | Thumbnail | Description | Link | Publish date | Keywords
```
Thumbnail is video-only (leave blank for images); Publish date blank = publish immediately. Upload path on Pinterest: **Settings → Import content → Upload .csv or .txt file** (desktop only).

**Etsy access token** (`.env.pinterest`) expires every 30 days. If any Pinterest script returns `{"code":2,"message":"Authentication failed"}`, run `node scripts/pinterest-refresh.mjs` — refresh token is long-lived, so no browser OAuth needed.

**Do NOT try to publish pins via API.** The app is on trial tier and returns error 29 on production `POST /v5/pins`. Only the bulk-CSV path works. `pinterest-create-pin.mjs --sandbox` works for API integration testing only.

## Product markdown template

Every product is `src/content/products/<slug>.md` with this frontmatter (Zod-validated per `src/content.config.ts`):

```yaml
---
title: "<CSV TITLE verbatim>"
category: hunting | fishing | patriotic
product_type: tee | hoodie | tank-top | mug-11oz | mug-15oz | tumbler-22oz | tumbler-40oz | can-cooler | whiskey-glass | shot-glass | pint-glass | mixing-glass | car-magnet | phone-case | wall-canvas
list_price: 28.99
free_shipping: true
etsy_listing_url: "https://www.etsy.com/listing/<id>/<url-slug>"
etsy_listing_id: "<id>"
short_description: "<1-2 sentences, brand voice, ends with 'Free shipping from our Etsy shop.'>"
product_features:
  - "<bullet>"
  - "<bullet>"
care_instructions:
  - "<bullet>"
images:
  - src: "https://i.etsystatic.com/…/il_fullxfull.…jpg"
    alt: "<Product name> product photo"
  - src: "…"
    alt: "<Product name> additional view 2"
tags:
  - "<tag>"
featured: false
youth: true  # only for kids-sized apparel
publish_date: 2026-09-21
---

<3 paragraphs, ~200 words total, brand voice — see "Copy and voice rules" below>
```

**Adult tee** features/care blocks (paste as-is):
```
product_features:
  - "Soft medium-weight 100% cotton (180 g/m²) for year-round comfort"
  - Classic unisex fit that holds shape wash after wash
  - Tubular knit construction with no side seams for a clean finish
  - Shoulder-to-shoulder taping for durability
  - Ribbed crew neck that keeps its shape
  - Durable DTG and DTF printing that stays vibrant
  - Tear-away label for comfort
  - OEKO-TEX certified fabric
  - "True to size, size up for a looser feel"
  - "Available in multiple colors"
care_instructions:
  - "Machine wash cold (max 30°C / 90°F)"
  - Tumble dry low heat
  - "Iron on low heat only, avoid the print"
  - Do not dry clean
  - Non-chlorine bleach only
```

**Adult mug** features/care blocks:
```
product_features:
  - Glossy white ceramic with a comfortable C-handle
  - "Vibrant, crisp full-color printing"
  - Microwave-safe for quick reheats
  - Dishwasher-safe for easy cleaning
  - Available in 11 oz and 15 oz
  - Lead-free and BPA-free
care_instructions:
  - Clean in the dishwasher or wash by hand with warm water and dish soap
  - "Design will not fade, crack, or peel with normal use"
```

**Adult hoodie** features/care follow the same pattern; grep an existing hoodie markdown to copy the exact strings.

**Youth apparel** uses different features (5.3 oz cotton for tees, 8 oz cotton-poly fleece for hoodies, pearlized tear-away label, warmer wash temps). Copy from an existing youth product like `whitetail-deer-hunter-kids-shirt-youth-buck-tee.md`.

## Commands

```
npm install
npm run dev       # http://localhost:4321
npm run build     # production build to dist/ (prebuild regenerates public/meta-catalog.csv)
npm run preview   # preview the production build
npm run feeds     # regenerate both product feeds (meta catalog + merchant TSV)
```

There is no lint or test script. Type checking is only what `astro build` performs.

Ad-hoc scripts (run with `node scripts/<name>.mjs`):
- `generate-meta-catalog.mjs` — emits `public/meta-catalog.csv` for Meta (Facebook/Instagram) Commerce Manager. Auto-runs on every build via the `prebuild` hook; Meta fetches the URL on a daily schedule. **Committed to git** (it's served as a public asset), so regenerate + commit whenever product data changes.
- `generate-merchant-feed.mjs` — emits `merchant-feed.tsv` at repo root for Google Merchant Center. Regenerate after adding/changing products; the file is gitignored (owner pastes it into the Merchant Center sheet by hand).
- `pinterest-refresh.mjs` — renews the Pinterest OAuth access token using the stored refresh token (30-day TTL on the access token, months on the refresh token). Run this before any other Pinterest script if you hit an auth error, or once a month proactively.
- `pinterest-build-pin-queue.mjs` — diffs every product markdown against pins already on the two boards (via Pinterest API), emits `pinterest-pins-queue.csv` in Pinterest's exact bulk-upload column order (`Title, Media URL, Pinterest board, Thumbnail, Description, Link, Publish date, Keywords`). User uploads that CSV at **Settings → Import content → Upload .csv or .txt file** on pinterest.com.
- `pinterest-auth.mjs` — one-time browser OAuth (localhost:8888 callback). Only needed on first setup or if the refresh token itself has expired.
- `pinterest-create-pin.mjs`, `pinterest-sandbox-batch.mjs` — API pin creation. **Trial-tier app returns error 29 on production**; sandbox path works for integration testing. Do not use these to publish real pins; use the bulk-CSV path instead.

Any change to `product_type`, price, or images affects both feeds — both generators keep their own `GOOGLE_CATEGORY` / `MATERIAL_BY_TYPE` maps, so a new product type needs to be added in both scripts (plus the `content.config.ts` enum and the `cupTypes` set in `[category].astro` if it should land in Cups vs. Accessories).

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
