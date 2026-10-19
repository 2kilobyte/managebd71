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

        if (!ObjectId.isValid(teamId) || !ObjectId.isValid(tournamentId)) {
            return NextResponse.json({ error: 'Invalid team or tournament ID.' }, { status: 400 });
        }
        const client = await clientPromise;
        const db = client.db("bd71");

        // Validate team exists
        const team = await db.collection("teams").findOne({ _id: new ObjectId(teamId), tournamentId });
        if (!team) {
            return NextResponse.json(
                { error: "Team not found." },
                { status: 404 }
            );
        }

        if (team.isApproved) return NextResponse.json({ message: 'Team is already approved.', team: { _id: teamId, teamGameId: team.teamGameId, isApproved: true } });
        const approved = await db.collection('teams').find({ tournamentId, isApproved: true }).toArray();
        const highest = Math.max(2, ...approved.map((t) => Number(t.teamGameId) || 2));
        const counters = db.collection<{ _id: string; value: number }>('teamSlotCounters');
        await counters.updateOne({ _id: tournamentId }, { $max: { value: highest } }, { upsert: true });
        const counter = await counters.findOneAndUpdate({ _id: tournamentId }, { $inc: { value: 1 } }, { returnDocument: 'after' });
        const teamGameId = counter!.value;

        // Approve team
        const result = await db.collection("teams").updateOne(
            { _id: new ObjectId(teamId), tournamentId, isApproved: { $ne: true } },
            { $set: { isApproved: true, teamGameId } }
        );

        if (result.modifiedCount === 0) {
            return NextResponse.json(
                { message: "Team is already approved." },
                { status: 200 }
            );
        }

        return NextResponse.json(
            { message: "Team approved successfully.", team: { _id: teamId, teamGameId, isApproved: true } },
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
