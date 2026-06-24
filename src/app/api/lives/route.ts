import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb"; // adjust path

export async function PUT(req: Request) {
  try {
    const { videoId } = await req.json();

    if (!videoId) {
      return NextResponse.json({ message: "videoId is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("bd71"); // replace with your DB name

    // Find the latest live
    const latestLive = await db.collection("lives").findOne({}, { sort: { createdAt: -1 } });

    if (!latestLive) {
      return NextResponse.json({ message: "No live entry found" }, { status: 404 });
    }

    // Update videoId (and optionally isEnded)
    const updateData: any = { videoId, isEnded: false  };


    await db.collection("lives").updateOne(
      { _id: latestLive._id },
      { $set: updateData }
    );

    return NextResponse.json({ message: "Live updated successfully", updated: updateData });
  } catch (error) {
    console.error("Error updating live:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}



export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("bd71"); // replace with your DB name
    const live = await db.collection("lives").findOne(
      {}, 
      { sort: { createdAt: -1 } } // get latest by createdAt
    );

    if (!live) {
      return NextResponse.json({ message: "No live found" }, { status: 404 });
    }

    return NextResponse.json(live);
  } catch (error) {
    console.error("Error fetching live:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
