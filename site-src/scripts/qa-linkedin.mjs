import assert from 'node:assert/strict';
import { normalizePosts } from '../lib/linkedin.js';
import { POST as connect } from '../api/linkedin/connect.js';
import { GET as callback } from '../api/linkedin/callback.js';
import { GET as refresh } from '../api/linkedin/refresh.js';

const author = 'urn:li:person:owner123';
const posts = normalizePosts({ elements: [
  { id: 'urn:li:share:123', author, commentary: 'Hello\nworld', visibility: 'PUBLIC', lifecycleState: 'PUBLISHED', publishedAt: 1770000000000 },
  { id: 'urn:li:share:124', author, commentary: 'Draft', visibility: 'PUBLIC', lifecycleState: 'DRAFT' },
  { id: 'urn:li:share:125', author, commentary: 'Private', visibility: 'CONNECTIONS', lifecycleState: 'PUBLISHED' },
  { id: 'urn:li:share:126', author: 'urn:li:person:other', commentary: 'Other', visibility: 'PUBLIC', lifecycleState: 'PUBLISHED' },
  { id: 'urn:li:share:123', author, commentary: 'Duplicate', visibility: 'PUBLIC', lifecycleState: 'PUBLISHED' },
] }, author);
assert.equal(posts.length, 1);
assert.equal(posts[0].title, 'Hello');
assert.equal(posts[0].url, 'https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3A123/');
assert.equal(posts[0].summary, 'Hello world');
assert.throws(() => normalizePosts({}, author));

process.env.LINKEDIN_CLIENT_ID = 'client-id';
process.env.LINKEDIN_CLIENT_SECRET = 'client-secret';
process.env.LINKEDIN_CONNECT_KEY = 'a-secret-owner-key-with-more-than-24-characters';
process.env.BLOB_READ_WRITE_TOKEN = 'dummy';
process.env.CRON_SECRET = 'another-independent-secret-value';
const post = (origin, key) => new Request('https://www.pritamnathdipta.online/api/linkedin/connect', {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ key }),
});
assert.equal((await connect(post('https://untrusted.example', process.env.LINKEDIN_CONNECT_KEY))).status, 403);
assert.equal((await connect(post('https://www.pritamnathdipta.online', 'wrong'))).status, 401);
const authorized = await connect(post('https://www.pritamnathdipta.online', process.env.LINKEDIN_CONNECT_KEY));
assert.equal(authorized.status, 200);
const body = await authorized.json();
const url = new URL(body.url);
assert.equal(url.origin, 'https://www.linkedin.com');
assert.equal(url.searchParams.get('scope'), 'r_member_social');
assert.equal(url.searchParams.get('redirect_uri'), 'https://www.pritamnathdipta.online/api/linkedin/callback');
assert.match(authorized.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Lax/);
assert.equal((await callback(new Request('https://www.pritamnathdipta.online/api/linkedin/callback?state=invalid&code=invalid'))).status, 401);
assert.equal((await refresh(new Request('https://www.pritamnathdipta.online/api/linkedin/refresh'))).status, 401);
console.log('LinkedIn post filtering and connection guards passed.');
