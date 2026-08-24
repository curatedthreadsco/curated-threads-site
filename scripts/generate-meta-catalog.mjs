#!/usr/bin/env node
// Generates a Meta (Facebook/Instagram) Commerce Manager product catalog CSV,
// populated from every product markdown file. Written to public/meta-catalog.csv
// so Vercel serves it at https://curatedthreadsoutdoors.com/meta-catalog.csv.
//
// Usage: node scripts/generate-meta-catalog.mjs
//
// How to wire it into Meta:
//   Business Manager → Commerce Manager → Catalogs → Add products →
//   "Use a URL or Google Sheets" → paste:
//     https://curatedthreadsoutdoors.com/meta-catalog.csv
//   Set the refresh schedule to Daily (or whatever cadence you want).
//   Meta will fetch and re-index every push to main automatically.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { load as loadYaml } from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

// Google product taxonomy strings (Meta accepts these in google_product_category).
const GOOGLE_CATEGORY = {
  tee: 'Apparel & Accessories > Clothing > Shirts & Tops',
  'tank-top': 'Apparel & Accessories > Clothing > Shirts & Tops',
  hoodie: 'Apparel & Accessories > Clothing > Shirts & Tops',
  'mug-11oz': 'Home & Garden > Kitchen & Dining > Tableware > Drinkware > Coffee & Tea Cups',
  'mug-15oz': 'Home & Garden > Kitchen & Dining > Tableware > Drinkware > Coffee & Tea Cups',
  'tumbler-22oz': 'Home & Garden > Kitchen & Dining > Tableware > Drinkware > Tumblers',
  'tumbler-40oz': 'Home & Garden > Kitchen & Dining > Tableware > Drinkware > Tumblers',
  'can-cooler': 'Home & Garden > Kitchen & Dining > Tableware > Drinkware',
  'whiskey-glass': 'Home & Garden > Kitchen & Dining > Tableware > Drinkware > Barware',
  'shot-glass': 'Home & Garden > Kitchen & Dining > Tableware > Drinkware > Barware',
  'pint-glass': 'Home & Garden > Kitchen & Dining > Tableware > Drinkware > Barware',
  'mixing-glass': 'Home & Garden > Kitchen & Dining > Tableware > Drinkware > Barware',
  'car-magnet':
    'Vehicles & Parts > Vehicle Parts & Accessories > Motor Vehicle Parts > Motor Vehicle Exterior Accessories',
  'phone-case': 'Electronics > Communications > Telephony > Mobile Phone Accessories > Mobile Phone Cases',
  'wall-canvas': 'Home & Garden > Decor > Artwork > Posters, Prints, & Visual Artwork',
};

// Meta's own taxonomy string (fb_product_category) — coarser than Google's.
const FB_CATEGORY = {
  tee: 'Clothing & Accessories > Clothing',
  'tank-top': 'Clothing & Accessories > Clothing',
  hoodie: 'Clothing & Accessories > Clothing',
  'mug-11oz': 'Home & Garden > Kitchen & Dining',
  'mug-15oz': 'Home & Garden > Kitchen & Dining',
  'tumbler-22oz': 'Home & Garden > Kitchen & Dining',
  'tumbler-40oz': 'Home & Garden > Kitchen & Dining',
  'can-cooler': 'Home & Garden > Kitchen & Dining',
  'whiskey-glass': 'Home & Garden > Kitchen & Dining',
  'shot-glass': 'Home & Garden > Kitchen & Dining',
  'pint-glass': 'Home & Garden > Kitchen & Dining',
  'mixing-glass': 'Home & Garden > Kitchen & Dining',
  'car-magnet': 'Vehicles & Parts',
  'phone-case': 'Electronics',
  'wall-canvas': 'Home & Garden',
};

const APPAREL_TYPES = new Set(['tee', 'tank-top', 'hoodie']);

const MATERIAL_BY_TYPE = {
  tee: 'cotton',
  'tank-top': 'cotton',
  hoodie: 'cotton-polyester blend',
  'mug-11oz': 'ceramic',
  'mug-15oz': 'ceramic',
  'tumbler-22oz': 'stainless steel',
  'tumbler-40oz': 'stainless steel',
  'can-cooler': 'neoprene',
  'whiskey-glass': 'glass',
  'shot-glass': 'glass',
  'pint-glass': 'glass',
  'mixing-glass': 'glass',
  'car-magnet': 'magnet',
  'phone-case': 'plastic',
  'wall-canvas': 'canvas',
};

// Etsy CDN URLs carry a size segment. Meta caches images at fetch time, so we
// request the largest sensible size that isn't the raw fullxfull.
function toLargeImage(src) {
  return src.replace(
    /il_(?:75x75|170x135|340x270|570xN|794xN|1140xN|1588xN|2000xN|fullxfull)\./,
    'il_1588xN.',
  );
}

// Link back to our own product page — the Meta Pixel is on curatedthreadsoutdoors.com,
// so on-site landing preserves attribution and retargeting. Shoppers click "Shop on
// Etsy" from the product page to reach checkout.
function buildSiteLink(slug) {
  const params = new URLSearchParams({
    utm_source: 'facebook',
    utm_medium: 'catalog',
    utm_campaign: 'meta_catalog',
    utm_content: slug,
  });
  return `https://curatedthreadsoutdoors.com/products/${slug}?${params.toString()}`;
}

function clampTitle(title) {
  const t = (title ?? '').trim();
  return t.length <= 200 ? t : t.slice(0, 197).replace(/\s+\S*$/, '') + '...';
}

function clampDescription(text) {
  const t = (text ?? '').trim();
  return t.length <= 9999 ? t : t.slice(0, 9996) + '...';
}

// RFC 4180 CSV field escaping.
function csvField(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

const productDir = path.join(root, 'src/content/products');
const files = readdirSync(productDir).filter((f) => f.endsWith('.md'));

// Column order matches Meta's Commerce Manager CSV template.
const columns = [
  'id',
  'title',
  'description',
  'availability',
  'condition',
  'price',
  'link',
  'image_link',
  'brand',
  'google_product_category',
  'fb_product_category',
  'sale_price',
  'item_group_id',
  'gender',
  'age_group',
  'material',
  'shipping',
];

const rows = [];
let skipped = 0;

for (const file of files) {
  const slug = file.replace(/\.md$/, '');
  const raw = readFileSync(path.join(productDir, file), 'utf8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) continue;
  const data = loadYaml(match[1]);

  if (!data.etsy_listing_id) {
    console.warn(`SKIP ${slug} — missing etsy_listing_id`);
    skipped++;
    continue;
  }

  const images = (data.images ?? []).map((img) => toLargeImage(img.src));
  const [mainImage] = images;
  if (!mainImage) {
    console.warn(`SKIP ${slug} — no images`);
    skipped++;
    continue;
  }

  const isApparel = APPAREL_TYPES.has(data.product_type);
  const price = `${data.list_price.toFixed(2)} USD`;
  const salePrice = data.sale_price ? `${data.sale_price.toFixed(2)} USD` : '';

  // id must be the site slug (not the Etsy listing ID) so:
  //   1. Meta's Checkout URL template can resolve
  //      https://curatedthreadsoutdoors.com/products/{{product.retailer_id}}
  //      to a live page (product URLs are keyed by slug, not by Etsy ID).
  //   2. The Meta Pixel already emits content_ids: [slug], so aligning
  //      catalog.id with pixel content_ids restores dedup + DPA attribution.
  rows.push({
    id: slug,
    title: clampTitle(data.title),
    description: clampDescription(data.short_description),
    availability: 'in stock',
    condition: 'new',
    price,
    link: buildSiteLink(slug),
    image_link: mainImage,
    brand: 'Curated Threads Outdoors',
    google_product_category: GOOGLE_CATEGORY[data.product_type] ?? '',
    fb_product_category: FB_CATEGORY[data.product_type] ?? '',
    sale_price: salePrice,
    // item_group_id would let us group color/size variants; we don't sync those
    // per-variant, so leave it empty.
    item_group_id: '',
    gender: isApparel ? 'unisex' : '',
    age_group: data.youth ? 'kids' : isApparel ? 'adult' : '',
    material: MATERIAL_BY_TYPE[data.product_type] ?? '',
    // Country::Service:Price. Etsy handles shipping; we advertise free US.
    shipping: 'US::Standard:0.00 USD',
  });
}

const header = columns.join(',');
const body = rows.map((r) => columns.map((c) => csvField(r[c] ?? '')).join(',')).join('\n');
const output = `${header}\n${body}\n`;

const publicDir = path.join(root, 'public');
mkdirSync(publicDir, { recursive: true });
const outPath = path.join(publicDir, 'meta-catalog.csv');
writeFileSync(outPath, output, 'utf8');

console.log(`Wrote ${rows.length} products to ${outPath}`);
if (skipped) console.log(`Skipped ${skipped} product(s) (see warnings above).`);
console.log('');
console.log('Once pushed to main and Vercel has deployed, the feed is live at:');
console.log('  https://curatedthreadsoutdoors.com/meta-catalog.csv');
console.log('');
console.log('Wire it into Meta Commerce Manager:');
console.log('  1. Catalogs → Add products → Upload a data file → Next.');
console.log('  2. "Which platform is your file formatted for?" → Commerce Manager.');
console.log('  3. "Use a URL or Google Sheets" → paste the URL above.');
console.log('  4. Schedule the fetch (Daily is the sensible default).');
