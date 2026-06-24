// components/TournamentsCard.tsx
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface TournamentProps {
  id: string;
  tournamentName: string;
  startingDate: string;
  tier: string;
  region: string;
  prize: string;
  tournamentImage: string
}

const formatDate = (isoDate: string) => {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-GB", {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const TournamentsCard = ({
  id,
  tournamentName,
  startingDate,
  tier,
  region,
  prize,
  tournamentImage
}: TournamentProps) => {
  
  return (
    <div className="tournament-card p-4 border-b border-gray-700">
      <div className="logo mb-2">
        <Image width={100} height={100} className="w-20 h-20 rounded" src={tournamentImage} alt="Tournament Logo" />
      </div>
      <div className="tournament-details mb-2">
        <h2 className="text-xl font-semibold">{tournamentName}</h2>
        <div className="text-sm text-gray-300 space-y-1 flex flex-row gap-4">
          <p>Starting Date: {formatDate(startingDate)}</p>
          <p>Tier: {tier}</p>
          <p>Prize Pool: ${prize}</p>
          <p>Region: {region}</p>
        </div>
      </div>
      <div className="read-more">
        <Link href={`/${id}`} className="text-blue-400 hover:underline">
          Details
        </Link>
      </div>
    </div>
  );
};

export default TournamentsCard;
