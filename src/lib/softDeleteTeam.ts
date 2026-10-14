import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

// Alternative: Soft delete version (if you prefer to keep data)
export async function DELETE_soft(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db('bd71');

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('teamId');
    const tournamentId = searchParams.get('tournamentId');

    // Validate required parameters
    if (!teamId || !tournamentId) {
      return NextResponse.json(
        { 
          message: 'Missing required parameters: teamId and tournamentId are required' 
        },
        { status: 400 }
      );
    }

    // Validate ObjectId formats
    if (!ObjectId.isValid(teamId) || !ObjectId.isValid(tournamentId)) {
      return NextResponse.json(
        { message: 'Invalid teamId or tournamentId format' },
        { status: 400 }
      );
    }

    // Check if tournament exists
    const tournament = await db
      .collection('tournaments')
      .findOne({ _id: new ObjectId(tournamentId) });

    if (!tournament) {
      return NextResponse.json(
        { message: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Check if team exists and belongs to the specified tournament
    const team = await db.collection('teams').findOne({
      _id: new ObjectId(teamId),
      tournamentId: tournamentId
    });

    if (!team) {
      return NextResponse.json(
        { message: 'Team not found or does not belong to this tournament' },
        { status: 404 }
      );
    }

    // Perform soft delete (mark as deleted instead of removing)
    const result = await db.collection('teams').updateOne(
      {
        _id: new ObjectId(teamId),
        tournamentId: tournamentId
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          // You can add deletedBy field if you track who performed the deletion
        }
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { message: 'Failed to delete team' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Team marked as deleted successfully',
        teamId: teamId,
        teamName: team.teamName
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error soft deleting team:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
