# Curated Threads Outdoors

Static marketing site for Curated Threads LLC. Traffic funnel that routes Google and Pinterest visitors to the [Etsy shop](https://curatedthreadsllc.etsy.com/). No cart, no checkout, no backend. Every product card and CTA links to the corresponding Etsy listing with UTM parameters.

- **Live:** https://curatedthreadsoutdoors.com
- **Repo:** https://github.com/curatedthreadsco/curated-threads-site
- **Framework:** Astro 5, Tailwind CSS 4, `@astrojs/sitemap`
- **Analytics:** Google Analytics 4 (`G-1JLQ73FPKR`) and Microsoft Clarity (`xp39uxe5ke`), wired in [BaseLayout.astro](src/layouts/BaseLayout.astro)
- **Hosting:** Vercel (Hobby plan). Auto-deploys every push to `main`.

---

## Table of contents

1. [Local development](#local-development)
2. [Project structure](#project-structure)
3. [Copy and voice rules](#copy-and-voice-rules-apply-to-every-indexable-string)
4. [Adding a new product](#adding-a-new-product)
5. [Adding a new gift guide](#adding-a-new-gift-guide)
6. [Updating homepage featured products](#updating-homepage-featured-products)
7. [Updating category page copy](#updating-category-page-copy)
8. [Integrating the brand images](#integrating-the-brand-images)
9. [Owner handoff checklist](#owner-handoff-checklist)

---

## Local development

```
npm install
npm run dev       # http://localhost:4321
npm run build     # production build to dist/
npm run preview   # preview the production build locally
```

## Project structure

```
src/
  content.config.ts               # Zod schemas for products and gift-guides
  content/
    products/*.md                 # one file per product
    gift-guides/*.md              # one file per gift guide
  layouts/BaseLayout.astro        # HTML shell, meta, GA4, Clarity
  components/
    Header.astro                  # top nav
    Footer.astro                  # social links + shop link
    ProductCard.astro             # reusable product grid card
  lib/etsy.ts                     # UTM helpers for Etsy links
  pages/
    index.astro                   # homepage
    [category].astro              # /hunting, /fishing, /outdoor, /patriotic
    products/[slug].astro         # product detail pages
    gift-guides/index.astro       # gift guide index
    gift-guides/[slug].astro      # gift guide detail pages
    story.astro
    faq.astro
  styles/global.css               # Tailwind + brand theme
public/
  robots.txt
  favicon.svg
  images/brand/                   # brand assets (see "Integrating the brand images")
astro.config.mjs                  # site URL, sitemap integration, tailwind
vercel.json                       # /sitemap.xml → /sitemap-index.xml rewrite
```

## Copy and voice rules (apply to every indexable string)

These rules are enforced by content review, not by tooling. Follow them for any page copy, product description, meta tag, alt text, gift guide, tag, or anything else that could be indexed by Google.

- No em dashes. Use commas, colons, or periods.
- Recipient-neutral framing. Never "for him / for her" as the default. Use "the hunter in your life," "dad, mom, grandpa, grandma, spouse, best friend."
- Never use the phrase "Add a personal note at checkout."
- "Weekend Hooker" never appears in titles, tags, meta, or any indexable text. Design artwork only.
- Product page section headers must use the exact strings `Product Features:` and `Care Instructions:` with the colon.
- Tone: unisex, recipient-neutral, gift-focused. Warm but not overly casual.

## Adding a new product

1. Copy an existing markdown file from `src/content/products/` as a template.
2. Change the filename. The filename (minus `.md`) becomes the URL slug: `src/content/products/my-new-mug.md` becomes `/products/my-new-mug`. Use lowercase, hyphens, and stick to letters and numbers.
3. Fill in the frontmatter. Required fields with allowed values are in `src/content.config.ts`:
   - `title`: the site title (follow the copy rules above)
   - `category`: one of `hunting`, `fishing`, `outdoor`, `patriotic`
   - `product_type`: one of the allowed types listed in [content.config.ts](src/content.config.ts)
   - `list_price` (and optional `sale_price`): numbers
   - `etsy_listing_url`: the full Etsy listing URL (the site strips any query string and appends UTM parameters automatically)
   - `short_description`, `product_features`, `care_instructions`, `images`, `tags`, `featured`
4. Write a mid-length description (about 200 words) in the body below the closing `---`. Do not copy the Etsy listing verbatim. Rewrite for depth.
5. Commit and push to `main`. Vercel auto-deploys in about a minute.
6. The new product is now live at `/products/{slug}`, appears in its category page and any gift guide that references its slug, and is included in the auto-generated sitemap.

## Adding a new gift guide

1. Create a new markdown file at `src/content/gift-guides/{slug}.md`. The slug becomes the URL.
2. Frontmatter fields:
   - `title`: displayed as the page H1 (e.g. "Fishing Gifts for Dad")
   - `description`: 1 to 2 sentences used in the meta description
   - `hero_intro`: the opening paragraph shown under the H1
   - `featured_products`: a list of product slugs (the filenames minus `.md` from `src/content/products/`) that appear as cards
   - `publish_date`: ISO date `YYYY-MM-DD`
3. Body content becomes the article prose between the intro and the product grid.
4. Commit and push. The guide appears at `/gift-guides/{slug}` and is auto-linked from `/gift-guides`.

## Updating homepage featured products

The homepage "Featured designs" grid pulls every product with `featured: true` in its frontmatter, capped at 8. To promote a product, set `featured: true` in that product's markdown file. To retire one, set it back to `false`. No other files need changes.

## Updating category page copy

Each category's hero title, kicker, body, and (for hunting) the family story line live in [`src/pages/[category].astro`](src/pages/[category].astro) inside the `meta` constant. Edit the strings for the relevant category and push.

## Integrating the brand images

Save the three brand assets to these exact paths, then follow the instructions:

- `public/images/brand/logo-round.png`: the circular logo. To use it in the header, replace the text wordmark block in [`src/components/Header.astro`](src/components/Header.astro) with:
  ```astro
  <img src="/images/brand/logo-round.png" alt="Curated Threads Outdoors" width="56" height="56" class="h-14 w-14" />
  ```
- `public/images/brand/banner.png`: the wide Etsy banner. Use it as a decorative element on the homepage hero if desired.
- `public/images/brand/card.jpg`: the business card lifestyle photo. This is the highest-value asset because it becomes the default social preview image. To wire it in, edit [`src/layouts/BaseLayout.astro`](src/layouts/BaseLayout.astro) and change:
  ```astro
  const { title, description, ogImage = '/images/og-default.jpg', ogType = 'website' } = Astro.props;
  ```
  to:
  ```astro
  const { title, description, ogImage = '/images/brand/card.jpg', ogType = 'website' } = Astro.props;
  ```

## Owner handoff checklist

Post-launch operational tasks. Some are one-time, some recurring.

- [x] Repo on GitHub, connected to Vercel, auto-deploy on push to `main`
- [x] Custom domain with SSL (`curatedthreadsoutdoors.com`)
- [x] Google Analytics 4 wired (`G-1JLQ73FPKR`)
- [x] Microsoft Clarity wired (`xp39uxe5ke`)
- [x] `/robots.txt` and `/sitemap.xml` publicly accessible
- [x] Product JSON-LD on every product page (verify with [Google Rich Results Test](https://search.google.com/test/rich-results))
- [x] Every Etsy link has UTM parameters, opens in a new tab, uses `rel="noopener"`
- [x] Footer social links (Instagram, TikTok, Pinterest, Facebook)
- [ ] Verify the site in Google Search Console at https://search.google.com/search-console and submit `https://curatedthreadsoutdoors.com/sitemap-index.xml`
- [ ] Set up Bing Webmaster Tools ([https://www.bing.com/webmasters](https://www.bing.com/webmasters)) and submit the same sitemap. Bing powers ChatGPT search and other AI answer engines.
- [ ] Save the three brand images to `public/images/brand/` (see previous section)
- [ ] Verify Open Graph previews with the [Pinterest debugger](https://www.pinterest.com/pin_creation/), [Facebook debugger](https://developers.facebook.com/tools/debug/), and [X card validator](https://cards-dev.twitter.com/validator)
- [ ] Lighthouse audit target: 95+ on Performance, Accessibility, and SEO (run from Chrome DevTools)
- [ ] Long-form product descriptions: 49 product markdown files currently ship with a generic 3-paragraph body. Rewrite each in-brand over time. Higher-margin items (mugs, drinkware) benefit most.
- [ ] Consider adding 2 more gift guides: "Fishing Gifts for Dad" and "Patriotic Gifts Made in USA" (see [Adding a new gift guide](#adding-a-new-gift-guide))
