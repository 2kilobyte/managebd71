import { timingSafeEqual } from 'node:crypto';
import { ObjectId, type Document } from 'mongodb';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { createScorerKey, decryptScorerKey } from '@/lib/liveScoreKeyCrypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ScorerKey = { position: number; keyHash: string; encryptedKey?: string; lastFour: string; active: boolean; createdAt: Date };
type ScorerKeyRecord = Document & ScorerKey & { tournamentId: string; createdAt?: Date; updatedAt?: Date };

function authorized(request: Request) {
  const expected = (process.env.BD71_LIVE_SCORE_ADMIN_SECRET ?? '').trim();
  const supplied = (request.headers.get('x-bd71-admin-secret') ?? '').trim();
  if (expected.length < 32 || supplied.length === 0) return false;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(request: Request) {
  if (!authorized(request)) return fail(401, 'Admin key is missing or invalid.');
  const { searchParams } = new URL(request.url);
  const tournamentId = searchParams.get('tournamentId') ?? '';
  if (!ObjectId.isValid(tournamentId)) return fail(400, 'Invalid tournament ID.');
  try {
    const db = (await clientPromise).db('bd71');
    const tournament = await db.collection('tournaments').findOne({ _id: new ObjectId(tournamentId) }, { projection: { tournamentName: 1, totalMatch: 1 } });
    if (!tournament) return fail(404, 'Tournament not found.');
    const keyCollection = db.collection<ScorerKeyRecord>('liveScoreKeys');
    await keyCollection.createIndex({ tournamentId: 1, position: 1 }, { unique: true });
    let records = await keyCollection.find({ tournamentId }, { projection: { position: 1, active: 1, lastFour: 1, createdAt: 1, encryptedKey: 1 } }).toArray();
    // Existing tournaments only had two keys. Add the missing third scorer key
    // when an administrator opens the key manager; preserve existing credentials.
    for (const position of [1, 2, 3]) {
      if (records.some((entry) => Number(entry.position) === position)) continue;
      const generated = createScorerKey();
      try {
        await keyCollection.insertOne({
          tournamentId, position, keyHash: generated.keyHash,
          encryptedKey: generated.encryptedKey, lastFour: generated.lastFour,
          active: true, createdAt: new Date(),
        });
      } catch (error) {
        if (!(error && typeof error === 'object' && 'code' in error && error.code === 11000)) throw error;
      }
    }
    records = await keyCollection.find({ tournamentId }, { projection: { position: 1, active: 1, lastFour: 1, createdAt: 1, encryptedKey: 1 } }).toArray();
    const keys = [1, 2, 3].map((position) => {
      const key = records.find((entry) => Number(entry.position) === position);
      let value: string | null = null;
      if (key?.active && key.encryptedKey) value = decryptScorerKey(key.encryptedKey);
      return { position, active: Boolean(key?.active), lastFour: key?.lastFour ?? null, createdAt: key?.createdAt ?? null, key: value };
    });
    return NextResponse.json({ tournament: { id: tournamentId, name: tournament.tournamentName, totalMatch: tournament.totalMatch }, keys }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Live score key status error:', error);
    return fail(500, 'Could not load scorer key status.');
  }
}
