#!/usr/bin/env node
// One-time local OAuth flow: opens a browser approval link, catches the
// redirect on localhost, exchanges the code for tokens, and writes them
// into .env.pinterest. Run with: node scripts/pinterest-auth.mjs [--sandbox]
//
// Trial-tier apps can't write Pins against the production API (see
// scripts/pinterest-create-pin.mjs comments), so pass --sandbox to mint a
// token against Pinterest's separate sandbox environment instead.
import http from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.pinterest');

const SANDBOX = process.argv.includes('--sandbox');
const PORT = 8888;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPES = ['boards:read', 'boards:write', 'pins:read', 'pins:write', 'user_accounts:read'].join(',');
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

if (!APP_ID || !APP_SECRET) {
  console.error('Missing PINTEREST_APP_ID / PINTEREST_APP_SECRET in .env.pinterest');
  process.exit(1);
}

const state = crypto.randomBytes(16).toString('hex');

const authUrl = new URL('https://www.pinterest.com/oauth/');
authUrl.searchParams.set('client_id', APP_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPES);
authUrl.searchParams.set('state', state);

console.log('\n1. Make sure this exact redirect URI is added on the Pinterest app Configure page:');
console.log(`   ${REDIRECT_URI}\n`);
console.log('2. Open this URL in your browser and approve access:\n');
console.log(authUrl.toString());
console.log(`\n${SANDBOX ? '[sandbox] ' : ''}Waiting for approval (this script is listening on localhost:8888)...\n`);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== '/callback') {
    res.writeHead(404).end();
    return;
  }

  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(400, { 'Content-Type': 'text/html' }).end(`<h1>Authorization denied: ${error}</h1>`);
    console.error('Authorization denied:', error);
    server.close(() => process.exit(1));
    return;
  }

  if (returnedState !== state) {
    res.writeHead(400, { 'Content-Type': 'text/html' }).end('<h1>State mismatch, aborting.</h1>');
    console.error('State mismatch - possible CSRF, aborting.');
    server.close(() => process.exit(1));
    return;
  }

  try {
    const basicAuth = Buffer.from(`${APP_ID}:${APP_SECRET}`).toString('base64');
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const data = await tokenRes.json();

    if (!tokenRes.ok) {
      throw new Error(JSON.stringify(data));
    }

    saveEnv({
      ...env,
      [TOKEN_KEY]: data.access_token,
      [REFRESH_KEY]: data.refresh_token ?? '',
      [EXPIRES_KEY]: String(data.expires_in ?? ''),
    });

    res.writeHead(200, { 'Content-Type': 'text/html' }).end('<h1>Success. You can close this tab.</h1>');
    console.log(`${SANDBOX ? '[sandbox] ' : ''}Access token + refresh token saved to .env.pinterest`);
    server.close(() => process.exit(0));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/html' }).end('<h1>Token exchange failed.</h1>');
    console.error('Token exchange failed:', err.message);
    server.close(() => process.exit(1));
  }
});

server.listen(PORT);
