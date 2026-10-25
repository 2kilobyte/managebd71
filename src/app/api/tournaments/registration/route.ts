import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

function isAuthorized(request: Request) {
  const expected = (process.env.BD71_LIVE_SCORE_ADMIN_SECRET ?? '').trim();
  const supplied = (request.headers.get('x-bd71-admin-secret') ?? '').trim();
  if (expected.length < 32 || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
}

function getDhakaDate(value: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export async function PATCH(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Admin access key is missing or invalid.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('tournamentId');
    if (!tournamentId || !ObjectId.isValid(tournamentId)) {
      return NextResponse.json({ error: 'Invalid tournament ID.' }, { status: 400 });
    }

    const body = await request.json();
    if (typeof body.registrationClosed !== 'boolean') {
      return NextResponse.json({ error: 'Choose whether registration should be open or closed.' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('bd71');
    const _id = new ObjectId(tournamentId);
    const tournament = await db.collection('tournaments').findOne({ _id }, { projection: { startingDate: 1 } });
    if (!tournament) return NextResponse.json({ error: 'Tournament not found.' }, { status: 404 });

    if (!body.registrationClosed && tournament.startingDate) {
      const start = new Date(tournament.startingDate);
      if (Number.isFinite(start.getTime()) && getDhakaDate(new Date()) >= getDhakaDate(start)) {
        return NextResponse.json({ error: 'Registration has already closed at the scheduled Bangladesh-time cutoff.' }, { status: 409 });
      }
    }

    await db.collection('tournaments').updateOne(
      { _id },
      { $set: { registrationClosed: body.registrationClosed, registrationUpdatedAt: new Date() } },
    );

    return NextResponse.json({
      registrationClosed: body.registrationClosed,
      message: body.registrationClosed ? 'Registration closed.' : 'Registration reopened.',
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not update tournament registration status:', error);
    return NextResponse.json({ error: 'Could not update registration status.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
