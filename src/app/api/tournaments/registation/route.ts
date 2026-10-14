import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db('bd71');

    const { searchParams } = new URL(req.url);
    const tournamentId = searchParams.get('tournamentId');

    // Validate tournamentId
    if (!tournamentId) {
      return NextResponse.json(
        { message: 'Missing tournamentId in query parameters' },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(tournamentId)) {
      return NextResponse.json(
        { message: 'Invalid tournamentId format' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      teamName,
      teamLogo,
      // teamCode,
      mobileNumber,
      players,
      teamShortName
    } = body;

    // Field validations
    if (!teamName || typeof teamName !== 'string') {
      return NextResponse.json(
        { message: 'Team name is required' },
        { status: 400 }
      );
    }

    if (!teamShortName || typeof teamShortName !== 'string') {
      return NextResponse.json(
        { message: 'Team short name is required' },
        { status: 400 }
      );
    }

    if (!teamLogo || typeof teamLogo !== 'string' || !teamLogo.startsWith('http')) {
      return NextResponse.json(
        { message: 'Valid team logo URL is required' },
        { status: 400 }
      );
    }

    // if (!teamCode || typeof teamCode !== 'string') {
    //   return NextResponse.json(
    //     { message: 'Team code is required' },
    //     { status: 400 }
    //   );
    // }

    // ✅ Bangladesh mobile number validation
    const bdMobilePattern = /^01[0-9]{9}$/;
    if (!mobileNumber || typeof mobileNumber !== 'string' || !bdMobilePattern.test(mobileNumber)) {
      return NextResponse.json(
        { message: 'Mobile number must be a valid 11-digit Bangladeshi number starting with 01' },
        { status: 400 }
      );
    }

    if (!Array.isArray(players) || players.length === 0 || players.some((p) => !p || typeof p !== 'object')) {
      return NextResponse.json({ message: 'A non-empty player roster is required' }, { status: 400 });
    }
    const names = players.map((p) => typeof p.ign === 'string' ? p.ign.trim().toLowerCase() : '');
    if (new Set(names).size !== names.length) {
      return NextResponse.json({ message: 'Duplicate players in the roster are not allowed' }, { status: 400 });
    }
    let leaderCount = 0;

    for (let i = 0; i < players.length; i++) {
      const player = players[i];

      if (!player.ign || typeof player.ign !== 'string') {
        return NextResponse.json(
          { message: `Player ${i + 1}: In-Game Name (ign) is required` },
          { status: 400 }
        );
      }

      if (!player.fullName || typeof player.fullName !== 'string') {
        return NextResponse.json(
          { message: `Player ${i + 1}: Real Name is required` },
          { status: 400 }
        );
      }

      if (!player.discordName || typeof player.discordName !== 'string') {
        return NextResponse.json(
          { message: `Player ${i + 1}: Discord ID is required` },
          { status: 400 }
        );
      }

      // ✅ Discord ID must be numeric
      const discordIdPattern = /^\d+$/;
      if (!discordIdPattern.test(player.discordName)) {
        return NextResponse.json(
          { message: `Player ${i + 1}: Discord ID must contain only numbers` },
          { status: 400 }
        );
      }

      if (player.isLeader === true) {
        leaderCount++;
      }
    }

    // ✅ Leader validation
    if (leaderCount !== 1) {
      return NextResponse.json(
        { message: 'Exactly one player must be marked as team leader' },
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

    // Calculate teamNumber: if 2 teams registered, next teamNumber is 3
    // const teamCount = await db.collection('teams').countDocuments({
    //   tournamentId,
    // });
    // const teamGameId = teamCount + 3;

    // Check if teamCode is included in tournament.teamCodes array
    // if (!Array.isArray(tournament.teamCodes) || !tournament.teamCodes.includes(teamCode)) {
    //   return NextResponse.json(
    //     { message: 'Invalid team code for this tournament' },
    //     { status: 400 }
    //   );
    // }

    // Prevent registration after tournament starting date
    // if (tournament.startingDate) {
    //   const now = new Date();
    //   const startingDate = new Date(tournament.startingDate);
    //   if (now >= startingDate) {
    //     return NextResponse.json(
    //       { message: 'Registration is closed. Tournament has already started.' },
    //       { status: 403 }
    //     );
    //   }
    // }

    const type = tournament.tournamentType.toLowerCase(); // 'solo', 'duo', or 'squad'
    const playerCount = players.length;

    // 🛡️ Validate player count based on tournament type
    if (type === 'solo' && playerCount !== 1) {
      return NextResponse.json(
        { message: 'Solo tournament requires exactly 1 player' },
        { status: 400 }
      );
    }
    if (type === 'duo' && playerCount < 2) {
      return NextResponse.json(
        { message: 'Duo tournament requires exactly 2 players' },
        { status: 400 }
      );
    }
    if (type === 'squad' && (playerCount < 4 || playerCount > 6)) {
      return NextResponse.json(
        { message: 'Squad tournament requires 4 to 6 registered players (4 active players)' },
        { status: 400 }
      );
    }

    // Check for duplicate team code
    // const existingTeam = await db.collection('teams').findOne({
    //   teamCode,
    //   tournamentId,
    // });

    // if (existingTeam) {
    //   return NextResponse.json(
    //     { message: 'Team code already used in this tournament' },
    //     { status: 409 }
    //   );
    // }

    const newTeam = {
      teamName,
      teamLogo,
      // teamCode,
      isApproved: false,
      mobileNumber,
      teamShortName,
      teamGameId: 1000,
      players,
      tournamentId,
      createdAt: new Date(),
    };

    const result = await db.collection('teams').insertOne(newTeam);

    return NextResponse.json(
      {
        message: 'Team registered successfully. Pending approval.',
        teamId: result.insertedId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error registering team:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
