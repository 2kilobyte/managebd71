import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const teamId = searchParams.get("teamId");
        const tournamentId = searchParams.get("tournamentId");

        if (!teamId) {
            return NextResponse.json(
                { error: "Team id query parameter is required." },
                { status: 400 }
            );
        }
        if (!tournamentId) {
            return NextResponse.json(
                { error: "Tournament id query parameter is required." },
                { status: 400 }
            );
        }

        const client = await clientPromise;
        const db = client.db("bd71");

        // Validate team exists
        const team = await db.collection("teams").findOne({ _id: new ObjectId(teamId) });
        if (!team) {
            return NextResponse.json(
                { error: "Team not found." },
                { status: 404 }
            );
        }

        // Calculate teamNumber: if 2 teams registered, next teamNumber is 3
        const teamCount = await db.collection('teams').countDocuments({
            tournamentId,
            isApproved: true
        });
        const teamGameId = teamCount + 3;

        // Approve team
        const result = await db.collection("teams").updateOne(
            { _id: new ObjectId(teamId) },
            { $set: { isApproved: true, teamGameId } }
        );

        if (result.modifiedCount === 0) {
            return NextResponse.json(
                { error: "Failed to approve team." },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { message: "Team approved successfully." },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error Approving Team:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
