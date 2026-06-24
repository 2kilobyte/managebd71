import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  
) {
  try {

    
    const client = await clientPromise;
    const db = client.db('bd71'); // your database name

    const { searchParams } = new URL(req.url); // ← this extracts query params
    const tournamentId = searchParams.get('tournamentId');

    // Validate ObjectId
    if (!tournamentId || !ObjectId.isValid(tournamentId)) {
      return NextResponse.json({ error: 'Invalid tournament ID' }, { status: 400 });
    }

    const tournament = await db
      .collection('tournaments')
      .findOne({ _id: new ObjectId(tournamentId) });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    return NextResponse.json({ tournament });
  } catch (error) {
    console.error('Error fetching tournament:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
