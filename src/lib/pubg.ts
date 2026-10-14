export class PubgApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function requestPubg(path: string, authenticated = false) {
  const headers: Record<string, string> = { Accept: 'application/vnd.api+json' };
  if (authenticated) {
    const key = process.env.PUBG_API_KEY;
    if (!key) throw new PubgApiError('PUBG API key is not configured.', 503);
    headers.Authorization = `Bearer ${key}`;
  }
  let response: Response;
  try {
    response = await fetch(`https://api.pubg.com/shards/${path}`, {
      headers, cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new PubgApiError('PUBG is unavailable or timed out. Please retry.', 502);
  }
  if (!response.ok) {
    const messages: Record<number, string> = {
      401: 'PUBG API key is invalid or expired.',
      404: 'PUBG data was not found. Check the platform and ID; match data expires after 14 days.',
      429: 'PUBG rate limit reached. Please retry later.',
    };
    throw new PubgApiError(messages[response.status] || 'PUBG could not return the requested data.', response.status === 429 ? 429 : response.status === 404 ? 404 : 502);
  }
  return response.json();
}
