import clientPromise from '@/lib/mongodb';
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createScorerKey } from '@/lib/liveScoreKeyCrypto';

function authorizationError(req: Request) {
    const expected = (process.env.BD71_LIVE_SCORE_ADMIN_SECRET ?? '').trim();
    const supplied = (req.headers.get('x-bd71-admin-secret') ?? '').trim();
    if (expected.length < 32) {
        if (process.env.VERCEL_ENV) return `BD71_LIVE_SCORE_ADMIN_SECRET is not configured for this Vercel ${process.env.VERCEL_ENV} deployment. Add it to that environment and redeploy.`;
        if (process.env.NODE_ENV === 'development') return 'BD71_LIVE_SCORE_ADMIN_SECRET is missing from the local Admin server. Add it to bd71admin/.env.local and restart npm run dev.';
        return 'BD71_LIVE_SCORE_ADMIN_SECRET is not configured for this server.';
    }
    if (!supplied) return 'Admin access key is required.';
    const expectedBytes = Buffer.from(expected);
    const suppliedBytes = Buffer.from(supplied);
    return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes)
        ? null
        : 'Admin access key does not match BD71_LIVE_SCORE_ADMIN_SECRET.';
}


export async function POST(req: Request) {
    const authError = authorizationError(req);
    if (authError) return NextResponse.json({ error: authError }, { status: authError.startsWith('BD71_LIVE_SCORE_ADMIN_SECRET') ? 503 : 401, headers: { 'Cache-Control': 'no-store' } });
    try {
        const body = await req.json();
        const client = await clientPromise;
        const db = client.db('bd71'); // Adjust database name as needed


        const { tournamentName, startingDate, endDate, tier, region, prize, totalMatch, tournamentType, tournamentImage, isScream } = body;
        const entryFeeAmount = body.entryFeeAmount === null || body.entryFeeAmount === '' || body.entryFeeAmount === undefined
            ? null
            : Number(body.entryFeeAmount);
        const entryFeeBkashNumber = typeof body.entryFeeBkashNumber === 'string' ? body.entryFeeBkashNumber.trim() : '';

        if ( !tournamentName || !startingDate || !endDate || !tier || !region || !prize || !totalMatch || !tournamentType || !tournamentImage ) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const start = new Date(startingDate);
        const end = new Date(endDate);
        if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
            return NextResponse.json({ error: 'End date and time must be after the start.' }, { status: 400 });
        }
        if (!['Solo', 'Duo', 'Squad'].includes(tournamentType) || !Number.isInteger(Number(totalMatch)) || Number(totalMatch) < 1) {
            return NextResponse.json({ error: 'Choose a valid tournament type and positive match count.' }, { status: 400 });
        }
        if (entryFeeAmount !== null && (!Number.isFinite(entryFeeAmount) || entryFeeAmount < 0)) {
            return NextResponse.json({ error: 'Entry fee must be a valid amount greater than or equal to zero.' }, { status: 400 });
        }
        if (entryFeeAmount !== null && entryFeeAmount > 0 && !entryFeeBkashNumber) {
            return NextResponse.json({ error: 'A bKash number is required when an entry fee is set.' }, { status: 400 });
        }
        // Generate 30 unique 16-character team codes (format: xxxx-xxxx-xxxx-xxxx, lowercase, alphanumeric)
        // const generateTeamCode = () => {
        //     const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        //     let code = '';
        //     for (let i = 0; i < 16; i++) {
        //   code += chars[Math.floor(Math.random() * chars.length)];
        //     }
        //     // Format as xxxx-xxxx-xxxx-xxxx
        //     return code.match(/.{1,4}/g)!.join('-');
        // };

        // const teamCodes = new Set<string>();
        // while (teamCodes.size < 40) {
        //     teamCodes.add(generateTeamCode());
        // }

        // Prepare both credentials before creating the tournament so a missing
        // encryption secret cannot leave an unscorable tournament behind.
        const scorerKeys = [1, 2].map((position) => ({ position, ...createScorerKey() }));
        await db.collection('liveScoreKeys').createIndex({ tournamentId: 1, position: 1 }, { unique: true });
        const result = await db.collection('tournaments').insertOne({
            tournamentName,
            tournamentType,
            startingDate: new Date(startingDate), 
            endDate: new Date(endDate),
            tier,
            tournamentImage,
            region,
            prize,
            entryFeeAmount,
            entryFeeBkashNumber,
            entryFeeRefundable: entryFeeAmount !== null && entryFeeAmount > 0 && body.entryFeeRefundable === true,
            isScream,
            totalMatch,
            createdAt: new Date(),
            // teamCodes: Array.from(teamCodes),
        });

        const tournamentId = result.insertedId.toString();
        try {
            await db.collection('liveScoreKeys').insertMany(scorerKeys.map(({ position, keyHash, encryptedKey, lastFour }) => ({
                tournamentId,
                position,
                keyHash,
                encryptedKey,
                lastFour,
                active: true,
                createdAt: new Date(),
            })));
        } catch (error) {
            await db.collection('tournaments').deleteOne({ _id: result.insertedId });
            throw error;
        }

        return NextResponse.json({ 
            insertedId: tournamentId,
            message: 'Tournament created successfully',
            scorerKeys: scorerKeys.map(({ position, value }) => ({ position, key: value })),
        }, { status: 201, headers: { 'Cache-Control': 'no-store' } });

    } catch (error) {
        console.error('Error Adding tournament:', error);
        const message = error instanceof Error && error.message.includes('BD71_LIVE_SCORE_KEY_ENCRYPTION_SECRET')
            ? error.message
            : 'Could not create tournament and scorer keys.';
        return NextResponse.json({ error: message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }
}


export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('bd71'); // your database name
    const tournaments = await db.collection('tournaments').find().toArray();

    return NextResponse.json({ tournaments });
  } catch (error) {
    console.error('MongoDB GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
