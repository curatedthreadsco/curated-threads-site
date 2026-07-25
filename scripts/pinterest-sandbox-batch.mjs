#!/usr/bin/env node
// Creates a sandbox pin for every product not yet pinned on its target
// production board. Sandbox pins are visible to the account owner in the
// real Pinterest app/website, so you can open each and click "Save" to
// publish it onto the real board — sidesteps the Trial-tier API write
// block without waiting on Standard access approval.
// Usage: node scripts/pinterest-sandbox-batch.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { load as loadYaml } from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const PROD_BOARDS = {
  hunters: { id: '791718878183670414', name: 'Gifts for Hunters and Fishermen!!' },
  patriotic: { id: '791718878183670034', name: 'PATRIOTIC 4th OF JULY GIFTS!!' },
};

function prodBoardFor(category) {
  return category === 'patriotic' ? PROD_BOARDS.patriotic : PROD_BOARDS.hunters;
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
  return (link || '').match(/etsy\.com\/listing\/(\d+)/)?.[1];
}

function toFullRes(src) {
  return src.replace(/il_(?:75x75|170x135|340x270|570xN|794xN|1140xN|1588xN|2000xN|fullxfull)\./, 'il_2000xN.');
}

async function ensureSandboxBoard(token, name) {
  const listRes = await fetch('https://api-sandbox.pinterest.com/v5/boards?page_size=25', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listData = await listRes.json();
  const existing = listData.items?.find((b) => b.name === name);
  if (existing) return existing;

  const createRes = await fetch('https://api-sandbox.pinterest.com/v5/boards', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description: 'Sandbox queue — open in Pinterest and click Save to publish for real.' }),
  });
  const created = await createRes.json();
  if (!createRes.ok) throw new Error(`Failed to create sandbox board "${name}": ${JSON.stringify(created)}`);
  return created;
}

const env = loadEnv();
const prodToken = env.PINTEREST_ACCESS_TOKEN;
const sandboxToken = env.PINTEREST_SANDBOX_ACCESS_TOKEN;
if (!prodToken) throw new Error('Missing PINTEREST_ACCESS_TOKEN — run scripts/pinterest-auth.mjs first.');
if (!sandboxToken) throw new Error('Missing PINTEREST_SANDBOX_ACCESS_TOKEN — run scripts/pinterest-auth.mjs --sandbox first.');

const [huntersPins, patrioticPins] = await Promise.all([
  getAllPins(prodToken, PROD_BOARDS.hunters.id),
  getAllPins(prodToken, PROD_BOARDS.patriotic.id),
]);

const pinnedListingIds = {
  [PROD_BOARDS.hunters.id]: new Set(huntersPins.map((p) => extractListingId(p.link)).filter(Boolean)),
  [PROD_BOARDS.patriotic.id]: new Set(patrioticPins.map((p) => extractListingId(p.link)).filter(Boolean)),
};

const products = loadProducts();
const todo = products.filter(({ data }) => {
  const board = prodBoardFor(data.category);
  return !(data.etsy_listing_id && pinnedListingIds[board.id].has(data.etsy_listing_id));
});

console.log(`${todo.length} products not yet pinned on their target board. Creating sandbox pins...\n`);

const sandboxBoardCache = {};

for (const { slug, data } of todo) {
  const prodBoard = prodBoardFor(data.category);
  const sandboxBoardName = `Sandbox Queue - ${prodBoard.name}`;
  if (!sandboxBoardCache[sandboxBoardName]) {
    sandboxBoardCache[sandboxBoardName] = await ensureSandboxBoard(sandboxToken, sandboxBoardName);
  }
  const sandboxBoard = sandboxBoardCache[sandboxBoardName];

  const cover = data.images?.[0];
  if (!cover || !data.etsy_listing_url) {
    console.log(`SKIP ${slug} — missing image or Etsy link`);
    continue;
  }

  const link = new URL(data.etsy_listing_url.split('?')[0]);
  link.searchParams.set('utm_source', 'pinterest');
  link.searchParams.set('utm_medium', 'social');
  link.searchParams.set('utm_campaign', 'pin');
  link.searchParams.set('utm_content', slug);

  const pinBody = {
    board_id: sandboxBoard.id,
    media_source: { source_type: 'image_url', url: toFullRes(cover.src) },
    title: data.title,
    description: data.short_description,
    link: link.toString(),
    alt_text: cover.alt,
  };

  const pinRes = await fetch('https://api-sandbox.pinterest.com/v5/pins', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sandboxToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(pinBody),
  });
  const pinData = await pinRes.json();

  if (!pinRes.ok) {
    console.log(`FAILED ${slug}:`, JSON.stringify(pinData));
    continue;
  }

  console.log(`OK  ${slug}  ->  target: "${prodBoard.name}"  |  sandbox pin: ${pinData.id}`);
  await new Promise((r) => setTimeout(r, 300));
}

console.log('\nDone. Open each sandbox pin in the Pinterest app/website and click "Save" to publish it to the real board named in the target column above.');
