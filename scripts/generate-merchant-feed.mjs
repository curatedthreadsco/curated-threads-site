#!/usr/bin/env node
// Generates a Google Merchant Center TSV in Google's OFFICIAL template column
// order (40 columns), populated from every product markdown file.
//
// Usage: node scripts/generate-merchant-feed.mjs
// Output: merchant-feed.tsv at repo root.
//
// How to load it into Merchant Center:
//   1. Open the sheet Google gave you (or a fresh one).
//   2. DELETE any instruction/example rows so only the header row remains.
//   3. Select cell A2 → paste the contents of merchant-feed.tsv (Sheets
//      auto-splits on tabs).
//   4. Back in Merchant Center → click Continue.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { load as loadYaml } from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

// Google product taxonomy paths — accepted alongside numeric category IDs.
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
  'vinyl-decal': 'Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Craft Supplies & Tools > Stickers',
  'vinyl-sticker': 'Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Craft Supplies & Tools > Stickers',
  'car-magnet': 'Vehicles & Parts > Vehicle Parts & Accessories > Motor Vehicle Parts > Motor Vehicle Exterior Accessories > Motor Vehicle Bumper Stickers, Decals & Magnets',
  'phone-case': 'Electronics > Communications > Telephony > Mobile Phone Accessories > Mobile Phone Cases',
};

const APPAREL_TYPES = new Set(['tee', 'tank-top', 'hoodie']);

const MATERIAL_BY_TYPE = {
  tee: 'Cotton',
  'tank-top': 'Cotton',
  hoodie: 'Cotton/Polyester Blend',
  'mug-11oz': 'Ceramic',
  'mug-15oz': 'Ceramic',
  'tumbler-22oz': 'Stainless Steel',
  'tumbler-40oz': 'Stainless Steel',
  'can-cooler': 'Neoprene',
  'whiskey-glass': 'Glass',
  'shot-glass': 'Glass',
  'pint-glass': 'Glass',
  'mixing-glass': 'Glass',
  'vinyl-decal': 'Vinyl',
  'vinyl-sticker': 'Vinyl',
  'car-magnet': 'Magnet',
  'phone-case': 'Plastic',
};

// Etsy CDN URLs carry a size segment (il_570xN, il_1140xN, il_fullxfull, …).
// Google Merchant wants full resolution.
function toFullRes(src) {
  return src.replace(
    /il_(?:75x75|170x135|340x270|570xN|794xN|1140xN|1588xN|2000xN|fullxfull)\./,
    'il_fullxfull.',
  );
}

// Merchant Center enforces that the feed's landing URL must match the
// registered store domain (curatedthreadsoutdoors.com). Point the link at
// our product page — shoppers click through to Etsy from there.
function buildSiteLink(slug) {
  const params = new URLSearchParams({
    utm_source: 'google',
    utm_medium: 'shopping',
    utm_campaign: 'merchant_free_listings',
    utm_content: slug,
  });
  return `https://curatedthreadsoutdoors.com/products/${slug}?${params.toString()}`;
}

// Google caps description at 5000 chars total but Shopping tab truncates
// around 200 for the visible snippet — keep it short and punchy.
function truncateDescription(text) {
  const trimmed = (text ?? '').trim();
  if (trimmed.length <= 200) return trimmed;
  const cut = trimmed.slice(0, 197);
  const lastSpace = cut.lastIndexOf(' ');
  return cut.slice(0, lastSpace > 100 ? lastSpace : 197) + '...';
}

function tsvEscape(value) {
  if (value === null || value === undefined || value === '') return '';
  // TSV disallows raw tabs/newlines inside fields; collapse them to spaces.
  return String(value).replace(/[\t\r\n]+/g, ' ').trim();
}

const productDir = path.join(root, 'src/content/products');
const files = readdirSync(productDir).filter((f) => f.endsWith('.md'));

// Exact column order from Google's official Merchant Center template.
const columns = [
  'id',
  'title',
  'description',
  'availability',
  'availability_date',
  'expiration_date',
  'link',
  'mobile_link',
  'image_link',
  'price',
  'sale_price',
  'sale_price_effective_date',
  'identifier_exists',
  'gtin',
  'mpn',
  'brand',
  'product_highlight',
  'product_detail',
  'additional_image_link',
  'condition',
  'adult',
  'color',
  'size',
  'size_type',
  'size_system',
  'gender',
  'material',
  'pattern',
  'age_group',
  'multipack',
  'is bundle',
  'unit_pricing_measure',
  'unit_pricing_base_measure',
  'energy_efficiency_class',
  'min_energy_efficiency_class',
  'max_energy_efficiency',
  'item_group_id',
  'video_link',
  'virtual_model_link',
  'cost_of_goods_sold',
];

const rows = [];

for (const file of files) {
  const slug = file.replace(/\.md$/, '');
  const raw = readFileSync(path.join(productDir, file), 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) continue;
  const data = loadYaml(match[1]);

  if (!data.etsy_listing_id || !data.etsy_listing_url) {
    console.warn(`SKIP ${slug} — missing etsy_listing_id or etsy_listing_url`);
    continue;
  }

  const link = buildSiteLink(slug);
  const images = (data.images ?? []).map((img) => toFullRes(img.src));
  const [mainImage, ...restImages] = images;

  const price = `${data.list_price.toFixed(2)} USD`;
  const salePrice = data.sale_price ? `${data.sale_price.toFixed(2)} USD` : '';

  const isApparel = APPAREL_TYPES.has(data.product_type);
  const ageGroup = data.youth ? 'kids' : isApparel ? 'adult' : '';
  const gender = isApparel ? 'unisex' : '';

  const row = {
    id: data.etsy_listing_id,
    title: data.title,
    description: truncateDescription(data.short_description),
    availability: 'in_stock',
    link,
    image_link: mainImage ?? '',
    price,
    sale_price: salePrice,
    // No GTIN/MPN for made-to-order print-on-demand items — explicit 'no'
    // stops Google from flagging a missing-identifier warning on every row.
    identifier_exists: 'no',
    brand: 'Curated Threads Outdoors',
    // Up to 10 additional image URLs, comma-separated per Google's spec.
    additional_image_link: restImages.slice(0, 10).join(','),
    condition: 'new',
    material: MATERIAL_BY_TYPE[data.product_type] ?? '',
    age_group: ageGroup,
    gender,
    // google_product_category is not in the template's flat column set but the
    // description field accepts it via product_highlight bullets — skip and
    // let Merchant Center auto-categorize from title/description.
    // Left blank in the row so the header list stays aligned to the template.
  };

  rows.push(row);
}

const header = columns.join('\t');
const body = rows
  .map((r) => columns.map((c) => tsvEscape(r[c] ?? '')).join('\t'))
  .join('\n');
const output = `${header}\n${body}\n`;

const outPath = path.join(root, 'merchant-feed.tsv');
writeFileSync(outPath, output, 'utf8');

console.log(`Wrote ${rows.length} products to ${outPath}\n`);
console.log('How to load it into the Merchant Center Google Sheet:');
console.log('  1. Open the sheet Google gave you.');
console.log('  2. Delete rows 2-5 (instruction/example rows).');
console.log('  3. Open merchant-feed.tsv in a text editor, select all, copy.');
console.log('  4. In the sheet, click cell A2, then paste (Ctrl+Shift+V works');
console.log('     best on Windows — Sheets auto-splits on tabs).');
console.log('  5. Back in Merchant Center, click Continue.');
