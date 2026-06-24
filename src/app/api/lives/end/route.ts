import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function PUT() {
  try {
    const client = await clientPromise;
    const db = client.db('bd71');

    // Find the most recent live stream that is NOT ended
    const latestLive = await db
      .collection('lives')
      .findOne({ isEnded: false }, { sort: { createdAt: -1 } });

    if (!latestLive) {
      return NextResponse.json(
        { error: 'No active live stream found to end.' },
        { status: 404 }
      );
    }

    // Update isEnded to true for that live stream
    await db.collection('lives').updateOne(
      { _id: latestLive._id },
      { $set: { isEnded: true } }
    );

    return NextResponse.json(
      { message: 'Live stream ended successfully.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error ending live stream:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
