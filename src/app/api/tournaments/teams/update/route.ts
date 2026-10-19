import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function PATCH(request: Request) {
  const expectedSecret = (process.env.BD71_LIVE_SCORE_ADMIN_SECRET ?? '').trim();
  if (!expectedSecret) {
    return NextResponse.json({ error: 'Admin secret is not configured on the server.' }, { status: 503 });
  }
  if ((request.headers.get('x-bd71-admin-secret') ?? '').trim() !== expectedSecret) {
    return NextResponse.json({ error: 'Admin key is missing or invalid.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid team information.' }, { status: 400 });
    }
    const teamId = typeof body.teamId === 'string' ? body.teamId : '';
    const tournamentId = typeof body.tournamentId === 'string' ? body.tournamentId : '';
    const teamName = typeof body.teamName === 'string' ? body.teamName.trim() : '';
    const teamShortName = typeof body.teamShortName === 'string' ? body.teamShortName.trim() : '';
    const teamLogo = typeof body.teamLogo === 'string' ? body.teamLogo.trim() : '';
    const requestedTeamColor = typeof body.teamColor === 'string' ? body.teamColor.trim() : '';
    const teamColorHex = requestedTeamColor.replace(/^#/, '');
    const teamCode = typeof body.teamCode === 'string' ? body.teamCode.trim() : '';
    const mobileNumber = typeof body.mobileNumber === 'string' ? body.mobileNumber.trim() : '';
    const transactionId = typeof body.transactionId === 'string' ? body.transactionId.trim() : '';
    const players = body.players;

    if (!ObjectId.isValid(teamId) || !ObjectId.isValid(tournamentId)) {
      return NextResponse.json({ error: 'Invalid team or tournament ID.' }, { status: 400 });
    }
    if (!teamName || teamName.length > 100) {
      return NextResponse.json({ error: 'Team name is required and must be under 100 characters.' }, { status: 400 });
    }
    if (!teamShortName || teamShortName.length > 4) {
      return NextResponse.json({ error: 'Team short name is required and must be 4 characters or fewer.' }, { status: 400 });
    }
    if (teamLogo) {
      try {
        const imageUrl = new URL(teamLogo);
        if (!['http:', 'https:'].includes(imageUrl.protocol)) throw new Error('Unsupported image URL');
      } catch {
        return NextResponse.json({ error: 'Enter a valid HTTP or HTTPS image URL, or leave it blank.' }, { status: 400 });
      }
    }
    if (requestedTeamColor && !/^[0-9a-fA-F]{6}$/.test(teamColorHex)) {
      return NextResponse.json({ error: 'Team color must be a 6-digit HEX value or left blank.' }, { status: 400 });
    }
    const teamColor = requestedTeamColor ? `#${teamColorHex.toUpperCase()}` : '';
    if (!/^01\d{9}$/.test(mobileNumber)) {
      return NextResponse.json({ error: 'Enter a valid 11-digit Bangladesh mobile number.' }, { status: 400 });
    }
    if (!Array.isArray(players) || players.length === 0 || players.some((player) => !player || typeof player !== 'object')) {
      return NextResponse.json({ error: 'A team must have at least one player.' }, { status: 400 });
    }

    const normalizedPlayers = players.map((player) => ({
      ign: typeof player.ign === 'string' ? player.ign.trim() : '',
      fullName: typeof player.fullName === 'string' ? player.fullName.trim() : '',
      discordName: typeof player.discordName === 'string' ? player.discordName.trim() : '',
      isLeader: player.isLeader === true,
    }));
    if (normalizedPlayers.some((player) => !player.ign || !player.fullName || !/^\d+$/.test(player.discordName))) {
      return NextResponse.json({ error: 'Each player needs an IGN, real name, and numeric Discord User ID.' }, { status: 400 });
    }
    if (new Set(normalizedPlayers.map((player) => player.ign.toLowerCase())).size !== normalizedPlayers.length) {
      return NextResponse.json({ error: 'Duplicate player IGNs are not allowed.' }, { status: 400 });
    }
    if (normalizedPlayers.filter((player) => player.isLeader).length !== 1) {
      return NextResponse.json({ error: 'Select exactly one team leader.' }, { status: 400 });
    }

    const db = (await clientPromise).db('bd71');
    const teams = db.collection('teams');
    const existingTeam = await teams.findOne({ _id: new ObjectId(teamId), tournamentId });
    if (!existingTeam) {
      return NextResponse.json({ error: 'Team not found in this tournament.' }, { status: 404 });
    }

    // Preserve legacy/custom player properties while updating registration fields.
    const previousPlayers = Array.isArray(existingTeam.players) ? existingTeam.players : [];
    const mergedPlayers = normalizedPlayers.map((player, index) => ({
      ...(previousPlayers[index] && typeof previousPlayers[index] === 'object' ? previousPlayers[index] : {}),
      ...player,
    }));

    await teams.updateOne(
      { _id: new ObjectId(teamId), tournamentId },
      { $set: { teamName, teamShortName, teamLogo, teamColor, teamCode, mobileNumber, transactionId, players: mergedPlayers, updatedAt: new Date() } },
    );

    return NextResponse.json({
      message: 'Team information updated.',
      team: { _id: teamId, teamName, teamShortName, teamLogo, teamColor, teamCode, mobileNumber, transactionId, players: mergedPlayers },
    });
  } catch (error) {
    console.error('Error updating team information:', error);
    return NextResponse.json({ error: 'Could not update team information.' }, { status: 500 });
  }
}
