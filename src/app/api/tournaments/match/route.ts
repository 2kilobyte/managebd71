import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb'; // MongoDB connection helper

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { matchName, map, matchId, tournamentId } = body;

    // Basic validation
    if (!matchName || !map || !matchId || !tournamentId) {
      return NextResponse.json(
        { error: 'Match Name, Map, Match ID, and Tournament ID are required.' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('bd71'); // Your DB name

    const response = await fetch(`https://api.pubg.com/shards/steam/matches/${matchId}`, {
        headers: {
          Accept: "application/vnd.api+json",
        },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Pubg server busy now try again letter' },
        { status: 400 }
      );
    }

    const matchData = await response.json()

    // Insert match data
    const result = await db.collection('matches').insertOne({
      matchName,
      map,
      matchId,
      matchData: JSON.stringify(matchData),
      tournamentId,
      createdAt: new Date(),
    });

    return NextResponse.json(
      { message: 'Match added successfully', insertedId: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding match:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
