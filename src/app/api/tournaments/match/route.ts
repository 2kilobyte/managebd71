import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { createHash } from 'node:crypto';
import clientPromise from '@/lib/mongodb';
import { fetchPubgMatchInfo } from '@/lib/match';
import { PubgApiError } from '@/lib/pubg';

export async function POST(req: Request) {
  try {
    const { matchName, map, matchId, tournamentId } = await req.json();
    if (![matchName, map, matchId, tournamentId].every((v) => typeof v === 'string' && v.trim())) {
      return NextResponse.json({ error: 'Match Name, Map, Match ID, and Tournament ID are required.' }, { status: 400 });
    }
    if (!ObjectId.isValid(tournamentId) || !/^[a-zA-Z0-9-]+$/.test(matchId)) {
      return NextResponse.json({ error: 'Invalid tournament or match ID.' }, { status: 400 });
    }
    const db = (await clientPromise).db('bd71');
    if (!await db.collection('tournaments').findOne({ _id: new ObjectId(tournamentId) })) {
      return NextResponse.json({ error: 'Tournament not found.' }, { status: 404 });
    }
    if (await db.collection('matches').findOne({ tournamentId, matchId })) {
      return NextResponse.json({ error: 'This match is already added to this tournament.' }, { status: 409 });
    }
    const matchData = await fetchPubgMatchInfo('steam', matchId);
    if (matchData?.data?.type !== 'match' || !Array.isArray(matchData.included)) {
      return NextResponse.json({ error: 'PUBG returned incomplete match data. Please retry.' }, { status: 502 });
    }
    const mapNames: Record<string, string> = {
      Baltic_Main: 'Erangel', Erangel_Main: 'Erangel', Desert_Main: 'Miramar',
      Savage_Main: 'Sanhok', DihorOtok_Main: 'Vikendi', Tiger_Main: 'Taego',
      Kiki_Main: 'Deston', Summerland_Main: 'Karakin', Chimera_Main: 'Paramo',
      Heaven_Main: 'Haven', Neon_Main: 'Rondo',
    };
    const actualMap = mapNames[matchData.data.attributes?.mapName];
    if (actualMap && actualMap !== map) {
      return NextResponse.json({ error: `This match was played on ${actualMap}. Please select that map.` }, { status: 400 });
    }
    // Deterministic ObjectId keeps the existing document shape and prevents concurrent duplicates.
    const id = new ObjectId(createHash('sha256').update(`${tournamentId}:${matchId}`).digest('hex').slice(0, 24));
    const result = await db.collection('matches').updateOne(
      { _id: id },
      { $setOnInsert: { matchName, map, matchId, tournamentId, matchData: JSON.stringify(matchData), createdAt: new Date() } },
      { upsert: true },
    );
    if (!result.upsertedCount) return NextResponse.json({ error: 'This match is already added to this tournament.' }, { status: 409 });
    return NextResponse.json({ message: 'Match added successfully', insertedId: result.upsertedId }, { status: 201 });
  } catch (error) {
    if (error instanceof PubgApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json({ error: 'This match is already added to this tournament.' }, { status: 409 });
    }
    console.error('Error adding match:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
