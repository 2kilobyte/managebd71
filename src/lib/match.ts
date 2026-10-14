import { requestPubg } from './pubg';
export async function fetchPubgMatchInfo(platform: string, matchId: string) {
  if (!['steam', 'kakao', 'psn', 'xbox', 'console'].includes(platform)) throw new Error('Invalid PUBG platform');
  if (!/^[a-zA-Z0-9-]+$/.test(matchId)) throw new Error('Invalid match ID');
  return requestPubg(`${platform}/matches/${encodeURIComponent(matchId)}`);
}
