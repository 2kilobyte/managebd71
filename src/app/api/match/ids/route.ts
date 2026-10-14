import { NextResponse } from 'next/server'; // Adjust path if needed
import { PubgApiError } from '@/lib/pubg';
import { GetLast3MatchIds } from '@/lib/matchIds';

export async function GET(req: Request) {

  try {
    const { searchParams } = new URL(req.url); // ← this extracts query params
    const playerName = searchParams.get('playerName');
    if (!playerName?.trim() || playerName.includes(',')) return NextResponse.json({ error: 'A single player name is required' }, { status: 400 });
    
    const data = await GetLast3MatchIds(playerName as string);

    
    return NextResponse.json({ids: data}, { status: 200 });
  } catch (error) {
    if (error instanceof PubgApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json(
      { error:  'Internal Server Error' },
      { status: 500 }
    );
  }
}
