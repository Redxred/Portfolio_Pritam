import { connectToken, cookieValue, equalSecret, redirectUri, syncFeed, tokenRequest } from '../../lib/linkedin.js';

export async function GET(request) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state');
  const cookie = cookieValue(request, 'linkedin_oauth_state');
  if (!equalSecret(state, cookie)) return new Response('Invalid LinkedIn connection state.', { status: 401 });
  const headers = { 'Set-Cookie': 'linkedin_oauth_state=; Max-Age=0; Path=/api/linkedin; HttpOnly; Secure; SameSite=Lax', 'Cache-Control': 'no-store' };
  if (url.searchParams.has('error')) return new Response(null, { status: 303, headers: { ...headers, Location: '/connect-linkedin.html?status=denied' } });
  const code = url.searchParams.get('code');
  if (!code) return new Response('Missing LinkedIn authorization code.', { status: 400, headers });
  try {
    const token = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: redirectUri });
    await connectToken(token);
    try {
      await syncFeed();
      return new Response(null, { status: 303, headers: { ...headers, Location: '/connect-linkedin.html?status=connected' } });
    } catch {
      return new Response(null, { status: 303, headers: { ...headers, Location: '/connect-linkedin.html?status=sync-error' } });
    }
  } catch {
    return new Response(null, { status: 303, headers: { ...headers, Location: '/connect-linkedin.html?status=error' } });
  }
}
