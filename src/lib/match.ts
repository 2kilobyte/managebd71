export async function fetchPubgMatchInfo(platform: string, matchId: string) {
  const API_KEY = process.env.PUBG_API_KEY
  const url = `https://api.pubg.com/shards/${platform}/matches/${matchId}`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: 'application/vnd.api+json',
    },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch match info: ${res.statusText}`)
  }

  const data = await res.json()
  return data
}
