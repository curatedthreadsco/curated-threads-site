#!/usr/bin/env node
// Creates a Pinterest pin from a product's content file.
// Usage: node scripts/pinterest-create-pin.mjs <product-slug> <board name substring> [--sandbox]
// Example: node scripts/pinterest-create-pin.mjs hook-line-and-sinker-blue-marlin-fishing-shirt hunters
//
// Trial-tier apps can't write Pins against the production API (returns
// error code 29). Pass --sandbox to write into Pinterest's sandbox
// environment instead — separate boards/pins from production, visible only
// to you, but a real end-to-end proof of the integration. Once the app has
// Standard access, drop --sandbox and pins go live for real.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { load as loadYaml } from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const SANDBOX = process.argv.includes('--sandbox');
const API_BASE = SANDBOX ? 'https://api-sandbox.pinterest.com' : 'https://api.pinterest.com';

function loadEnv() {
  const raw = readFileSync(path.join(root, '.env.pinterest'), 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return env;
}

function loadProduct(slug) {
  const filePath = path.join(root, 'src/content/products', `${slug}.md`);
  const raw = readFileSync(filePath, 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error(`No frontmatter found in ${filePath}`);
  return loadYaml(match[1]);
}

function toFullRes(src) {
  return src.replace(/il_(?:75x75|170x135|340x270|570xN|794xN|1140xN|1588xN|2000xN|fullxfull)\./, 'il_2000xN.');
}

const [slug, boardQuery] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!slug || !boardQuery) {
  console.error('Usage: node scripts/pinterest-create-pin.mjs <product-slug> <board name substring> [--sandbox]');
  process.exit(1);
}

const env = loadEnv();
const token = SANDBOX ? env.PINTEREST_SANDBOX_ACCESS_TOKEN : env.PINTEREST_ACCESS_TOKEN;
if (!token) {
  console.error(
    `Missing ${SANDBOX ? 'PINTEREST_SANDBOX_ACCESS_TOKEN' : 'PINTEREST_ACCESS_TOKEN'} in .env.pinterest — run scripts/pinterest-auth.mjs${SANDBOX ? ' --sandbox' : ''} first.`,
  );
  process.exit(1);
}

const product = loadProduct(slug);
const cover = product.images?.[0];
if (!cover) throw new Error(`Product ${slug} has no images`);

const boardsRes = await fetch(`${API_BASE}/v5/boards?page_size=25`, {
  headers: { Authorization: `Bearer ${token}` },
});
const boardsData = await boardsRes.json();
if (!boardsRes.ok) {
  console.error('Failed to list boards:', boardsData);
  process.exit(1);
}

let board = boardsData.items?.find((b) => b.name.toLowerCase().includes(boardQuery.toLowerCase()));

if (!board && SANDBOX) {
  console.log(`No sandbox board matched "${boardQuery}" — creating one.`);
  const createRes = await fetch(`${API_BASE}/v5/boards`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Sandbox Test Board - ${boardQuery}`,
      description: 'Sandbox test board for API validation.',
    }),
  });
  board = await createRes.json();
  if (!createRes.ok) {
    console.error('Failed to create sandbox board:', board);
    process.exit(1);
  }
}

if (!board) {
  console.error(`No board matched "${boardQuery}". Available boards:`, boardsData.items?.map((b) => b.name));
  process.exit(1);
}

// Pins link straight to the Etsy listing (not our site) since that's where
// the transaction actually happens — avoids an extra Pinterest -> site ->
// Etsy hop that just adds click fatigue for no benefit.
if (!product.etsy_listing_url) throw new Error(`Product ${slug} has no etsy_listing_url`);
const productUrl = new URL(product.etsy_listing_url.split('?')[0]);
productUrl.searchParams.set('utm_source', 'pinterest');
productUrl.searchParams.set('utm_medium', 'social');
productUrl.searchParams.set('utm_campaign', 'pin');
productUrl.searchParams.set('utm_content', slug);

const pinBody = {
  board_id: board.id,
  media_source: {
    source_type: 'image_url',
    url: toFullRes(cover.src),
  },
  title: product.title,
  description: product.short_description,
  link: productUrl.toString(),
  alt_text: cover.alt,
};

console.log(`${SANDBOX ? '[sandbox] ' : ''}Creating pin "${product.title}" on board "${board.name}"...`);

const pinRes = await fetch(`${API_BASE}/v5/pins`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(pinBody),
});

const pinData = await pinRes.json();

if (!pinRes.ok) {
  console.error('Pin creation failed:', pinData);
  process.exit(1);
}

console.log('Pin created:', JSON.stringify(pinData, null, 2));
