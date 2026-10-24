import { readFeed } from '../../lib/linkedin.js';

export async function GET() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ updatedAt: null, posts: [] }, { headers: { 'Cache-Control': 'public, s-maxage=300' } });
  }
  try {
    const feed = await readFeed();
    return Response.json(feed || { updatedAt: null, posts: [] }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch {
    return Response.json({ updatedAt: null, posts: [] }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
