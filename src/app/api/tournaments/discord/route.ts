import { assignRoleToUser, createVoiceChannel, createRoleForTeam, setChannelPermissions } from "@/lib/discordBot";
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
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
            .find({ tournamentId, isApproved: true }) // Only approved teams
            .sort({ teamGameId: 1 })
            .toArray();

        //sort by teamGameId (if id is 1 show in top then 2 then 3)
        

        for (const team of teams) {
            // Assuming each team has a name and an id
            // Set user limit based on player count if available
            const userLimit = team.players ? team.players.length : 4;
            const channelName = team.name || `${team.teamGameId}. ${team.teamName}`;
            // Optionally, you can pass additional options such as parent category, permissions, etc.
            const teamRole = await createRoleForTeam(team.teamName)
            const teamChannel = await createVoiceChannel(channelName, userLimit);
            await setChannelPermissions(teamChannel, teamRole)
            for(const player of team.players) {
                await assignRoleToUser(player.discordName);
                await assignRoleToUser(player.discordName, teamRole);
            }
        }


        return NextResponse.json({ message: 'discord channel created' }, { status: 200 });
    } catch (error) {
        console.error('Error fetching teams:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}