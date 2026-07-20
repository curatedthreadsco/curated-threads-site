# Curated Threads Outdoors

Static marketing site for Curated Threads LLC. Built with Astro and Tailwind CSS, hosted on Vercel at https://curatedthreadsoutdoors.com. The site is a traffic funnel: every product card and CTA links to the corresponding Etsy listing. There is no cart, checkout, or backend.

- **Etsy shop:** https://curatedthreadsllc.etsy.com/
- **Framework:** Astro 5, Tailwind CSS 4, @astrojs/sitemap
- **Analytics:** Google Analytics 4 (`G-1JLQ73FPKR`) and Microsoft Clarity (`xp39uxe5ke`), both wired in `src/layouts/BaseLayout.astro`

## Local development

```
npm install
npm run dev       # local dev server at http://localhost:4321
npm run build     # production build to dist/
npm run preview   # preview the production build
```

## Deployment

Pushing to the `main` branch on GitHub auto-deploys to Vercel. There is no manual deploy step.

## Project structure

```
src/
  layouts/BaseLayout.astro   # HTML shell, SEO meta, Open Graph, GA4, Clarity
  pages/index.astro          # homepage
  styles/global.css          # Tailwind + brand color theme
public/
  robots.txt                 # allows indexing, points to sitemap
  favicon.svg
vercel.json                  # rewrites /sitemap.xml to /sitemap-index.xml
```

The sitemap is generated automatically at build time. It is served at both `/sitemap.xml` and `/sitemap-index.xml`.

## Content rules (apply to every indexable string)

- No em dashes anywhere. Use commas, colons, or periods.
- Recipient-neutral framing. No "for him / for her" defaults.
- Never use the phrase "Add a personal note at checkout".
- "Weekend Hooker" never appears in titles, tags, meta, or any indexable text.
- Product page section headers use the exact strings `Product Features:` and `Care Instructions:`.
- Every Etsy link uses UTM parameters and opens in a new tab with `rel="noopener"`:
  `https://www.etsy.com/listing/{ID}?utm_source=curatedthreadsllc&utm_medium=web&utm_campaign={page_type}&utm_content={product_slug}`

## Adding products and gift guides

Product and gift guide content collections arrive in the next build phase. This section will be updated with step-by-step instructions when they land.
