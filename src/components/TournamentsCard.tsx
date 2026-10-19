import Link from 'next/link';
import SafeAdminImage from './SafeAdminImage';

interface TournamentProps {
  id: string;
  tournamentName: string;
  startingDate: string;
  tier: string;
  region: string;
  prize: string;
  tournamentImage: string;
}

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date TBA' : date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function TournamentsCard({ id, tournamentName, startingDate, tier, region, prize, tournamentImage }: TournamentProps) {
  return (
    <article className="tournament-card">
      <div className="logo">
        <SafeAdminImage width={100} height={100} src={tournamentImage} alt={`${tournamentName} logo`} />
      </div>
      <div className="tournament-details">
        <h2 title={tournamentName}>{tournamentName}</h2>
        <div className="tournament-info">
          <p>Starts {formatDate(startingDate)}</p>
          <p>{tier || 'Tier TBA'}</p>
          <p>{region || 'Region TBA'}</p>
          <p>Prize {prize ? `$${prize}` : 'TBA'}</p>
        </div>
      </div>
      <div className="read-more"><Link href={`/${id}`}>Manage tournament <span aria-hidden="true">→</span></Link></div>
    </article>
  );
}
