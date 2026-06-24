export async function GetLast3MatchIds(playerName: string) {
  if (!playerName) {
    throw new Error("Player name is required");
  }
  const res = await fetch(
    `https://api.pubg.com/shards/steam/players?filter[playerNames]=${playerName}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PUBG_API_KEY}`,
        Accept: "application/vnd.api+json",
      },
    }
  );

  const data = await res.json();

  const matchIds =
    data?.data?.[0]?.relationships?.matches?.data
      ?.slice(0, 20)
      //@ts-expect-error Reason: TypeScript expects data to be an array
      .map((match) => match.id) || [];

  return matchIds
}