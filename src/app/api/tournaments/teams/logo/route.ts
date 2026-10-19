import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { normalizeAllowedAdminImageUrl } from '@/lib/adminImageUrl';

export async function PATCH(request: Request) {
  const expectedSecret = (process.env.BD71_LIVE_SCORE_ADMIN_SECRET ?? '').trim();
  if (!expectedSecret) {
    return NextResponse.json({ error: 'Admin secret is not configured on the server.' }, { status: 503 });
  }
  if ((request.headers.get('x-bd71-admin-secret') ?? '').trim() !== expectedSecret) {
    return NextResponse.json({ error: 'Admin key is missing or invalid.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const teamId = typeof body.teamId === 'string' ? body.teamId : '';
    const tournamentId = typeof body.tournamentId === 'string' ? body.tournamentId : '';
    const teamLogo = normalizeAllowedAdminImageUrl(body.teamLogo);

    if (!ObjectId.isValid(teamId) || !ObjectId.isValid(tournamentId)) {
      return NextResponse.json({ error: 'Invalid team or tournament ID.' }, { status: 400 });
    }
    if (!teamLogo) {
      return NextResponse.json({ error: 'Use an HTTPS image URL from i.postimg.cc or i.ibb.co.' }, { status: 400 });
    }

    const db = (await clientPromise).db('bd71');
    const result = await db.collection('teams').updateOne(
      { _id: new ObjectId(teamId), tournamentId },
      { $set: { teamLogo, updatedAt: new Date() } },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Team not found in this tournament.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Team logo URL updated.', teamLogo });
  } catch (error) {
    console.error('Error updating team logo URL:', error);
    return NextResponse.json({ error: 'Could not update the team logo URL.' }, { status: 500 });
  }
}
