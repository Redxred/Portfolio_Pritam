import { randomBytes, timingSafeEqual } from 'node:crypto';
import { get, put } from '@vercel/blob';

const TOKEN_PATH = 'linkedin/private/member-token.json';
const FEED_PATH = 'linkedin/private/member-feed.json';
const ACCESS = 'private';
const CALLBACK = 'https://www.pritamnathdipta.online/api/linkedin/callback';

export const redirectUri = CALLBACK;
export const newState = () => randomBytes(32).toString('base64url');

export function equalSecret(left, right) {
  if (!left || !right) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function cookieValue(request, name) {
  const match = request.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function ready() {
  return Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET && process.env.LINKEDIN_CONNECT_KEY && process.env.BLOB_READ_WRITE_TOKEN);
}

export async function readJson(path) {
  const result = await get(path, { access: ACCESS, useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  return new Response(result.stream).json();
}

export async function writeJson(path, value) {
  await put(path, JSON.stringify(value), {
    access: ACCESS,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
}

export async function tokenRequest(params) {
  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.LINKEDIN_CLIENT_ID, client_secret: process.env.LINKEDIN_CLIENT_SECRET, ...params }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`LinkedIn token exchange failed: ${response.status}`);
  const data = await response.json();
  if (!data.access_token || !Number.isFinite(Number(data.expires_in))) throw new Error('LinkedIn token response is incomplete');
  return data;
}

export function normalizePosts(data, authorUrn) {
  if (!Array.isArray(data?.elements)) throw new Error('LinkedIn posts response is incomplete');
  const seen = new Set();
  return data.elements.flatMap(post => {
    const id = typeof post.id === 'string' && /^urn:li:(share|ugcPost):[\w-]+$/.test(post.id) ? post.id : null;
    const text = typeof post.commentary === 'string' ? post.commentary.replace(/\s+/g, ' ').trim() : '';
    if (!id || !text || post.author !== authorUrn || post.visibility !== 'PUBLIC' || post.lifecycleState !== 'PUBLISHED' || seen.has(id)) return [];
    seen.add(id);
    const firstLine = post.commentary.split(/\r?\n/).map(line => line.trim()).find(Boolean) || text;
    const title = firstLine.length > 110 ? `${firstLine.slice(0, 107).trimEnd()}…` : firstLine;
    const summary = text.length > 330 ? `${text.slice(0, 327).trimEnd()}…` : text;
    const date = Number(post.publishedAt || post.createdAt);
    return [{ id, title, summary, url: `https://www.linkedin.com/feed/update/${encodeURIComponent(id)}/`, date: Number.isFinite(date) && date > 0 ? new Date(date).toISOString() : null }];
  }).slice(0, 12);
}

async function authorFromToken(accessToken) {
  if (process.env.LINKEDIN_PERSON_URN) {
    if (!/^urn:li:person:[\w-]+$/.test(process.env.LINKEDIN_PERSON_URN)) throw new Error('Invalid LinkedIn person URN');
    return process.env.LINKEDIN_PERSON_URN;
  }
  // A verified post on this portfolio identifies the member without requesting
  // extra profile scopes. LinkedIn posts can use either share or ugcPost URNs.
  const id = '7504964196967690240';
  for (const kind of ['share', 'ugcPost']) {
    const urn = `urn:li:${kind}:${id}`;
    const response = await fetch(`https://api.linkedin.com/rest/posts/${encodeURIComponent(urn)}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Linkedin-Version': process.env.LINKEDIN_API_VERSION || '202609',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) continue;
    const data = await response.json();
    if (typeof data.author === 'string' && /^urn:li:person:[\w-]+$/.test(data.author)) return data.author;
  }
  throw new Error('Could not identify the LinkedIn author; set LINKEDIN_PERSON_URN');
}

export async function connectToken(tokenData) {
  const author = await authorFromToken(tokenData.access_token);
  const now = Date.now();
  const credentials = {
    accessToken: tokenData.access_token,
    accessExpiresAt: now + Number(tokenData.expires_in) * 1000,
    refreshToken: tokenData.refresh_token || null,
    refreshExpiresAt: tokenData.refresh_token_expires_in ? now + Number(tokenData.refresh_token_expires_in) * 1000 : null,
    author,
  };
  await writeJson(TOKEN_PATH, credentials);
  return credentials;
}

export async function syncFeed() {
  let credentials = await readJson(TOKEN_PATH);
  if (!credentials) throw new Error('LinkedIn account is not connected');
  if (Date.now() > credentials.accessExpiresAt - 7 * 24 * 60 * 60 * 1000) {
    if (!credentials.refreshToken || (credentials.refreshExpiresAt && Date.now() >= credentials.refreshExpiresAt)) throw new Error('LinkedIn reauthorization is required');
    const refreshed = await tokenRequest({ grant_type: 'refresh_token', refresh_token: credentials.refreshToken });
    credentials = {
      ...credentials,
      accessToken: refreshed.access_token,
      accessExpiresAt: Date.now() + Number(refreshed.expires_in) * 1000,
      refreshToken: refreshed.refresh_token || credentials.refreshToken,
      refreshExpiresAt: refreshed.refresh_token_expires_in ? Date.now() + Number(refreshed.refresh_token_expires_in) * 1000 : credentials.refreshExpiresAt,
    };
    await writeJson(TOKEN_PATH, credentials);
  }
  const url = new URL('https://api.linkedin.com/rest/posts');
  url.search = new URLSearchParams({ q: 'author', author: credentials.author, count: '20', sortBy: 'CREATED' }).toString();
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      'Linkedin-Version': process.env.LINKEDIN_API_VERSION || '202609',
      'X-Restli-Protocol-Version': '2.0.0',
      'X-RestLi-Method': 'FINDER',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`LinkedIn posts request failed: ${response.status}`);
  const posts = normalizePosts(await response.json(), credentials.author);
  const feed = { updatedAt: new Date().toISOString(), posts };
  await writeJson(FEED_PATH, feed);
  return feed;
}

export const readFeed = () => readJson(FEED_PATH);
