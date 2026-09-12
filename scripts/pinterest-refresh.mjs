#!/usr/bin/env node
// Refresh the Pinterest OAuth access token using the stored refresh token.
// Access tokens expire in ~30 days; refresh tokens live much longer, so this
// avoids re-running the full browser OAuth flow every month.
// Usage: node scripts/pinterest-refresh.mjs [--sandbox]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.pinterest');

const SANDBOX = process.argv.includes('--sandbox');
const TOKEN_URL = SANDBOX
  ? 'https://api-sandbox.pinterest.com/v5/oauth/token'
  : 'https://api.pinterest.com/v5/oauth/token';
const TOKEN_KEY = SANDBOX ? 'PINTEREST_SANDBOX_ACCESS_TOKEN' : 'PINTEREST_ACCESS_TOKEN';
const REFRESH_KEY = SANDBOX ? 'PINTEREST_SANDBOX_REFRESH_TOKEN' : 'PINTEREST_REFRESH_TOKEN';
const EXPIRES_KEY = SANDBOX ? 'PINTEREST_SANDBOX_TOKEN_EXPIRES_IN' : 'PINTEREST_TOKEN_EXPIRES_IN';

function loadEnv() {
  const raw = readFileSync(envPath, 'utf8');
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

function saveEnv(env) {
  const lines = Object.entries(env).map(([k, v]) => `${k}=${v}`);
  writeFileSync(envPath, lines.join('\n') + '\n', 'utf8');
}

const env = loadEnv();
const APP_ID = env.PINTEREST_APP_ID;
const APP_SECRET = env.PINTEREST_APP_SECRET;
const refreshToken = env[REFRESH_KEY];

if (!APP_ID || !APP_SECRET) {
  console.error('Missing PINTEREST_APP_ID / PINTEREST_APP_SECRET in .env.pinterest');
  process.exit(1);
}
if (!refreshToken) {
  console.error(`Missing ${REFRESH_KEY} in .env.pinterest — run scripts/pinterest-auth.mjs${SANDBOX ? ' --sandbox' : ''} first.`);
  process.exit(1);
}

const basicAuth = Buffer.from(`${APP_ID}:${APP_SECRET}`).toString('base64');
const res = await fetch(TOKEN_URL, {
  method: 'POST',
  headers: {
    Authorization: `Basic ${basicAuth}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  }),
});

const data = await res.json();
if (!res.ok) {
  console.error(`${SANDBOX ? '[sandbox] ' : ''}Refresh failed:`, data);
  console.error('If the refresh token is also expired, re-run scripts/pinterest-auth.mjs to reauthorize in a browser.');
  process.exit(1);
}

saveEnv({
  ...env,
  [TOKEN_KEY]: data.access_token,
  ...(data.refresh_token ? { [REFRESH_KEY]: data.refresh_token } : {}),
  [EXPIRES_KEY]: String(data.expires_in ?? ''),
});

console.log(`${SANDBOX ? '[sandbox] ' : ''}Access token refreshed and saved (expires in ${data.expires_in ?? '?'}s).`);
