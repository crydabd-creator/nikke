export const runtime = 'edge';

const SOURCE_URL = 'https://raw.githubusercontent.com/crydabd-creator/nikke/main/nikke-account-status/references/site-account-data.json';

export async function GET() {
  try {
    const response = await fetch(SOURCE_URL, {
      cache: 'no-store',
      headers: { Accept: 'application/json', 'User-Agent': 'oh-my-commander-site' },
    });
    if (!response.ok) throw new Error(`GitHub account data request failed (${response.status})`);
    const data = await response.json() as { cache?: unknown; source?: unknown; account?: unknown; nikkes?: unknown };
    if (data.cache !== true || typeof data.source !== 'string' || !data.account || !Array.isArray(data.nikkes)) {
      throw new Error('GitHub account data is invalid');
    }
    return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'GitHub 최신 계정 자료를 불러오지 못했습니다.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
