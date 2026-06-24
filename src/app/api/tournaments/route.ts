import clientPromise from '@/lib/mongodb';
import { NextResponse } from 'next/server';


export async function POST(req: Request) {
    try {
        const body = await req.json();
        const client = await clientPromise;
        const db = client.db('bd71'); // Adjust database name as needed


        const { tournamentName, startingDate, endDate, tier, region, prize, totalMatch, tournamentType, tournamentImage, isScream } = body;

        if ( !tournamentName || !startingDate || !endDate || !tier || !region || !prize || !totalMatch || !tournamentType || !tournamentImage ) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

        const result = await db.collection('tournaments').insertOne({
            tournamentName,
            tournamentType,
            startingDate: new Date(startingDate), 
            endDate: new Date(endDate),
            tier,
            tournamentImage,
            region,
            prize,
            isScream,
            totalMatch,
            createdAt: new Date(),
            // teamCodes: Array.from(teamCodes),
        });

        return NextResponse.json({ 
            insertedId: result.insertedId, 
            message: 'Tournament created successfully' 
        }, { status: 201 });

    } catch (error) {
        console.error('Error Adding tournament:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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