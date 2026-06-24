import { NextResponse } from 'next/server'; // Adjust path if needed
import { GetLast3MatchIds } from '@/lib/matchIds';

export async function GET(req: Request) {

  try {
    const { searchParams } = new URL(req.url); // ← this extracts query params
    const playerName = searchParams.get('playerName');
    
    const data = await GetLast3MatchIds(playerName as string);

    
    return NextResponse.json({ids: data}, { status: 200 });
  } catch{
    return NextResponse.json(
      { error:  'Internal Server Error' },
      { status: 500 }
    );
  }
}
