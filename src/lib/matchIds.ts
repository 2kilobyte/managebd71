import { requestPubg } from './pubg';
export async function GetLast3MatchIds(playerName: string) {
  if (!playerName?.trim() || playerName.includes(',')) throw new Error('A single player name is required');
  const data = await requestPubg(`steam/players?filter[playerNames]=${encodeURIComponent(playerName.trim())}`, true);
  const matches = data?.data?.[0]?.relationships?.matches?.data;
  return Array.isArray(matches) ? matches.slice(0, 20).map((match: { id: string }) => match.id) : [];
}
