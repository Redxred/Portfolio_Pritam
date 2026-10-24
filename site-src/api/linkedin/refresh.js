import { equalSecret, syncFeed } from '../../lib/linkedin.js';

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !equalSecret(request.headers.get('authorization'), `Bearer ${secret}`)) return new Response('Unauthorized', { status: 401 });
  try {
    const feed = await syncFeed();
    return Response.json({ updatedAt: feed.updatedAt, count: feed.posts.length }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
