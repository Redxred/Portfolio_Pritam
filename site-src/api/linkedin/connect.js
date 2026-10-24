import { equalSecret, newState, ready, redirectUri } from '../../lib/linkedin.js';

export async function POST(request) {
  if (!ready()) return Response.json({ error: 'LinkedIn connection is not configured.' }, { status: 503 });
  if (request.headers.get('origin') !== 'https://www.pritamnathdipta.online') return Response.json({ error: 'Invalid origin.' }, { status: 403 });
  let submitted;
  try { submitted = (await request.json()).key; } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }
  if (!equalSecret(submitted, process.env.LINKEDIN_CONNECT_KEY)) return Response.json({ error: 'Invalid connection key.' }, { status: 401 });
  const state = newState();
  const url = new URL('https://www.linkedin.com/oauth/v2/authorization');
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID,
    redirect_uri: redirectUri,
    state,
    scope: 'r_member_social',
  }).toString();
  return Response.json({ url: url.href }, {
    headers: { 'Set-Cookie': `linkedin_oauth_state=${state}; Max-Age=600; Path=/api/linkedin; HttpOnly; Secure; SameSite=Lax`, 'Cache-Control': 'no-store' },
  });
}
