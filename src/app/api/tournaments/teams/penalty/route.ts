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
    const penaltyPoints = Number(body?.penaltyPoints);

    if (!ObjectId.isValid(teamId) || !ObjectId.isValid(tournamentId)) {
      return NextResponse.json({ error: 'Invalid team or tournament ID.' }, { status: 400 });
    }
    if (!Number.isSafeInteger(penaltyPoints) || penaltyPoints < 0 || penaltyPoints > 100000) {
      return NextResponse.json({ error: 'Penalty points must be a whole number from 0 to 100,000.' }, { status: 400 });
    }

    const db = (await clientPromise).db('bd71');
    const teams = db.collection('teams');
    const team = await teams.findOne({ _id: new ObjectId(teamId), tournamentId });
    if (!team) return NextResponse.json({ error: 'Team not found in this tournament.' }, { status: 404 });

    const updatedAt = new Date();
    await teams.updateOne(
      { _id: new ObjectId(teamId), tournamentId },
      { $set: { penaltyPoints, updatedAt } },
    );

    return NextResponse.json({
      message: penaltyPoints > 0 ? 'Penalty points updated.' : 'Penalty cleared.',
      team: { _id: teamId, penaltyPoints },
    });
  } catch (error) {
    console.error('Could not update team penalty:', error);
    return NextResponse.json({ error: 'Could not update team penalty.' }, { status: 500 });
  }
}
