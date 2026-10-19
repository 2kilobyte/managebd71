'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import TournamentsCard from '@/components/TournamentsCard';

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
  createdAt?: string;
}

export default function Home() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await fetch('/api/tournaments');
        if (!response.ok) throw new Error('Could not load the tournament list.');
        const data = await response.json();
        setTournaments(Array.isArray(data.tournaments) ? data.tournaments : []);
      } catch (err) {
        console.error('Failed to fetch tournaments', err);
        setError(err instanceof Error ? err.message : 'Could not load tournaments.');
      } finally {
        setLoading(false);
      }
    };
    void fetchTournaments();
  }, []);

  const now = Date.now();
  const activeCount = tournaments.filter((tournament) => {
    const endTime = new Date(tournament.endDate).getTime();
    return Number.isNaN(endTime) || endTime >= now;
  }).length;
  const recentFirst = [...tournaments].sort((a, b) => {
    const timeA = new Date(a.createdAt || a.startingDate).getTime();
    const timeB = new Date(b.createdAt || b.startingDate).getTime();
    return (Number.isFinite(timeB) ? timeB : 0) - (Number.isFinite(timeA) ? timeA : 0);
  });

  return (
    <div className="admin-shell">
      <Header />
      <main className="admin-content">
        <section className="dashboard-intro">
          <div>
            <p className="dashboard-kicker">BD71 esports · Control room</p>
            <h1>Tournament dashboard</h1>
            <p>Manage events, registrations, matches, and live scoring from one place.</p>
          </div>
        </section>
        <section className="dashboard-stats" aria-label="Tournament overview">
          <div className="stat-card"><span>All tournaments</span><strong>{loading ? '—' : tournaments.length}</strong></div>
          <div className="stat-card"><span>Upcoming / active</span><strong>{loading ? '—' : activeCount}</strong></div>
          <div className="stat-card"><span>Finished</span><strong>{loading ? '—' : tournaments.length - activeCount}</strong></div>
        </section>
        <div className="section-toolbar">
          <h2>Tournaments</h2>
          <span>{loading ? 'Loading events…' : `${tournaments.length} ${tournaments.length === 1 ? 'event' : 'events'}`}</span>
        </div>
        {loading ? (
          <div className="tournament-list" aria-label="Loading tournaments">
            {[1, 2, 3].map((item) => <div key={item} className="tournament-card animate-pulse"><div className="logo" /><div className="tournament-details"><div className="h-5 w-1/2 rounded bg-white/10"/><div className="h-4 w-3/4 rounded bg-white/5"/></div></div>)}
          </div>
        ) : error ? (
          <div className="empty-state" role="alert">{error}</div>
        ) : tournaments.length ? (
          <div className="tournament-list">
            {recentFirst.map((tournament) => <TournamentsCard key={tournament._id} id={tournament._id} tournamentName={tournament.tournamentName} startingDate={tournament.startingDate} tier={tournament.tier} region={tournament.region} prize={tournament.prize} tournamentImage={tournament.tournamentImage} />)}
          </div>
        ) : (
          <div className="empty-state">No tournaments yet. Create one to get started.</div>
        )}
      </main>
    </div>
  );
}
