import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

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
    const teamId = typeof body?.teamId === 'string' ? body.teamId : '';
    const tournamentId = typeof body?.tournamentId === 'string' ? body.tournamentId : '';
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

    if (!ObjectId.isValid(teamId) || !ObjectId.isValid(tournamentId)) {
      return NextResponse.json({ error: 'Invalid team or tournament ID.' }, { status: 400 });
    }
    if (reason.length > 500) {
      return NextResponse.json({ error: 'Reason must be 500 characters or fewer.' }, { status: 400 });
    }

    const db = (await clientPromise).db('bd71');
    const teams = db.collection('teams');
    const team = await teams.findOne({ _id: new ObjectId(teamId), tournamentId });
    if (!team) return NextResponse.json({ error: 'Team not found in this tournament.' }, { status: 404 });

    const disqualifiedAt = new Date();
    await teams.updateOne(
      { _id: new ObjectId(teamId), tournamentId },
      { $set: { isDisqualified: true, disqualificationReason: reason, disqualifiedAt, updatedAt: disqualifiedAt } },
    );

    return NextResponse.json({
      message: 'Team disqualified.',
      team: { _id: teamId, isDisqualified: true, disqualificationReason: reason, disqualifiedAt: disqualifiedAt.toISOString() },
    });
  } catch (error) {
    console.error('Could not disqualify team:', error);
    return NextResponse.json({ error: 'Could not disqualify team.' }, { status: 500 });
  }
}
