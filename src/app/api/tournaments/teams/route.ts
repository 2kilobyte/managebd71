import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb'; // MongoDB connection helper

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { teamName, player1, player2, player3, player4, player5, player6, player7, player8, leader, tournamentId, teamGameId } = body;

        // Basic validation
        if (!teamName || !player1 || !leader || !tournamentId || !teamGameId) {
        return NextResponse.json(
            { error: 'Team name, Player1, and Leader are required.' },
            { status: 400 }
        );
        }

        const client = await clientPromise;
        const db = client.db('bd71'); // Replace with your DB name

        // Check if the team already exists
        const existingTeam = await db.collection('teams').findOne({ teamGameId });
        if (existingTeam) {
            return NextResponse.json(       
                { error: 'Team already exists for this tournament.' },
                { status: 409 }
            );
        }


        // Insert team
        const result = await db.collection('teams').insertOne({
            tournamentId, // Assuming no tournament association at creation
            teamGameId, // Incremental team ID
            teamName,
            players: [
                { ign: player1, isLeader: leader === player1 },
                player2 ? { ign: player2, isLeader: leader === player2 } : null,
                player3 ? { ign: player3, isLeader: leader === player3 } : null,
                player4 ? { ign: player4, isLeader: leader === player4 } : null,
                player5 ? { ign: player5, isLeader: leader === player5 } : null,
                player6 ? { ign: player6, isLeader: leader === player6 } : null,
                player7 ? { ign: player7, isLeader: leader === player7 } : null,
                player8 ? { ign: player8, isLeader: leader === player8 } : null,
            ].filter(Boolean), // Removes null entries
            createdAt: new Date(),
        });

        return NextResponse.json(
            { message: 'Team added successfully', insertedId: result.insertedId },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error adding team:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const tournamentId = searchParams.get('tournamentId');

        if (!tournamentId) {
            return NextResponse.json(
                { error: 'tournamentId query parameter is required.' },
                { status: 400 }
            );
        }

        const client = await clientPromise;
        const db = client.db('bd71');
        const teams = await db
            .collection('teams')
            .find({ tournamentId }) // Only approved teams
            .toArray();

        return NextResponse.json(teams, { status: 200 });
    } catch (error) {
        console.error('Error fetching teams:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}