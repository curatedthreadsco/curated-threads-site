#!/usr/bin/env node
// Builds a Pinterest bulk-upload CSV of every product that doesn't already
// have a pin on its target board. Matches existing pins to products by the
// Etsy listing ID embedded in the pin's link, so already-pinned products
// are skipped rather than duplicated.
// Usage: node scripts/pinterest-build-pin-queue.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { load as loadYaml } from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const BOARDS = {
  hunters: { id: '791718878183670414', name: 'Gifts for Hunters and Fishermen!!' },
  patriotic: { id: '791718878183670034', name: 'PATRIOTIC 4th OF JULY GIFTS!!' },
};

function boardFor(category) {
  return category === 'patriotic' ? BOARDS.patriotic : BOARDS.hunters;
}

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

function loadProducts() {
  const dir = path.join(root, 'src/content/products');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const slug = f.replace(/\.md$/, '');
      const raw = readFileSync(path.join(dir, f), 'utf8');
      const match = raw.match(/^---\n([\s\S]*?)\n---/);
      return { slug, data: loadYaml(match[1]) };
    });
}

async function getAllPins(token, boardId) {
  let pins = [];
  let bookmark = null;
  do {
    const url = new URL(`https://api.pinterest.com/v5/boards/${boardId}/pins`);
    url.searchParams.set('page_size', '100');
    if (bookmark) url.searchParams.set('bookmark', bookmark);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(`Failed to fetch pins for board ${boardId}: ${JSON.stringify(data)}`);
    pins = pins.concat(data.items || []);
    bookmark = data.bookmark;
  } while (bookmark);
  return pins;
}

function extractListingId(link) {
  const match = (link || '').match(/etsy\.com\/listing\/(\d+)/);
  return match?.[1];
}

function toFullRes(src) {
  return src.replace(/il_(?:75x75|170x135|340x270|570xN|794xN|1140xN|1588xN|2000xN|fullxfull)\./, 'il_2000xN.');
}

function csvField(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

const env = loadEnv();
const token = env.PINTEREST_ACCESS_TOKEN;
if (!token) {
  console.error('Missing PINTEREST_ACCESS_TOKEN in .env.pinterest — run scripts/pinterest-auth.mjs first.');
  process.exit(1);
}

const [huntersPins, patrioticPins] = await Promise.all([
  getAllPins(token, BOARDS.hunters.id),
  getAllPins(token, BOARDS.patriotic.id),
]);

const pinnedListingIds = {
  [BOARDS.hunters.id]: new Set(huntersPins.map((p) => extractListingId(p.link)).filter(Boolean)),
  [BOARDS.patriotic.id]: new Set(patrioticPins.map((p) => extractListingId(p.link)).filter(Boolean)),
};

const products = loadProducts();

const rows = [];
const skipped = [];

for (const { slug, data } of products) {
  const board = boardFor(data.category);
  const listingId = data.etsy_listing_id;
  if (listingId && pinnedListingIds[board.id].has(listingId)) {
    skipped.push({ slug, board: board.name });
    continue;
  }
  const cover = data.images?.[0];
  if (!cover || !data.etsy_listing_url) continue;

  const link = new URL(data.etsy_listing_url.split('?')[0]);
  link.searchParams.set('utm_source', 'pinterest');
  link.searchParams.set('utm_medium', 'social');
  link.searchParams.set('utm_campaign', 'pin');
  link.searchParams.set('utm_content', slug);

  rows.push({
    Title: data.title,
    'Media URL': toFullRes(cover.src),
    'Pinterest board': board.name,
    Description: data.short_description,
    Link: link.toString(),
    Keywords: (data.tags || []).slice(0, 10).join(', '),
  });
}

const headers = ['Title', 'Media URL', 'Pinterest board', 'Description', 'Link', 'Keywords'];
const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => csvField(r[h])).join(','))].join('\n');

const outPath = path.join(root, 'pinterest-pins-queue.csv');
writeFileSync(outPath, csv, 'utf8');

console.log(`Wrote ${rows.length} pins to ${outPath}`);
console.log(`Skipped ${skipped.length} products already pinned on their target board:`);
for (const s of skipped) console.log(`  - ${s.slug} (${s.board})`);
