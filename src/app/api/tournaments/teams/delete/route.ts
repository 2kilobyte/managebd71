import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request) {
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

    // Optional: Prevent deletion if tournament has already started
    // if (tournament.startingDate) {
    //   const now = new Date();
    //   const startingDate = new Date(tournament.startingDate);
    //   if (now >= startingDate) {
    //     return NextResponse.json(
    //       { message: 'Cannot delete team after tournament has started' },
    //       { status: 403 }
    //     );
    //   }
    // }

    // Optional: Only allow deletion if team is not approved
    // if (team.isApproved) {
    //   return NextResponse.json(
    //     { message: 'Cannot delete an approved team. Contact tournament admin.' },
    //     { status: 403 }
    //   );
    // }

    // Delete the team
    const result = await db.collection('teams').deleteOne({
      _id: new ObjectId(teamId),
      tournamentId: tournamentId
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: 'Failed to delete team' },
        { status: 500 }
      );
    }

    // Optional: Log the deletion or perform additional cleanup
    // await db.collection('deletionLogs').insertOne({
    //   teamId,
    //   tournamentId,
    //   teamName: team.teamName,
    //   deletedAt: new Date(),
    //   deletedBy: 'system' // You can modify this to track who deleted it
    // });

    return NextResponse.json(
      {
        message: 'Team deleted successfully',
        teamId: teamId,
        teamName: team.teamName
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
