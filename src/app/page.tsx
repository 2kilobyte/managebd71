// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import TournamentsCard from "@/components/TournamentsCard";

interface Tournament {
  _id: string;
  tournamentName: string;
  startingDate: string;
  endDate: string;
  tier: string;
  region: string;
  prize: string;
  totalMatch: number;
  tournamentImage: string;
}

export default function Home() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const res = await fetch("/api/tournaments");
        const data = await res.json();
        setTournaments(data.tournaments || []);
      } catch (err) {
        console.error("Failed to fetch tournaments", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  

  return (
    <div className="bg-[#18191D] text-white min-h-screen">
      <Header />
      <div className="container mx-auto p-4">
        {loading ? (
          <p className="text-center text-gray-400">Loading tournaments...</p>
        ) : tournaments.length > 0 ? (
          tournaments.map((tournament) => (
            <TournamentsCard
              tournamentImage={tournament.tournamentImage}
              key={tournament._id}
              id={tournament._id}
              tournamentName={tournament.tournamentName}
              startingDate={tournament.startingDate}
              tier={tournament.tier}
              region={tournament.region}
              prize={tournament.prize}
            />
          ))
        ) : (
          <p className="text-center text-gray-400">No tournaments found.</p>
        )}
      </div>
    </div>
  );
}
