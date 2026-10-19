'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import BasicInfo from '@/components/BasicInfo';
import type { Team, Tournament } from '@/lib/shareInterface';
import Participents from '@/components/Participents';
import toast from 'react-hot-toast';

const TournamentDetails = () => {
  const { tournamentId } = useParams();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;

    const fetchTournament = async () => {
      try {
        const res = await fetch(`/api/tournaments/details?tournamentId=${tournamentId}`);
        const teamsRes = await fetch(`/api/tournaments/teams?tournamentId=${tournamentId}`);
        if (!res.ok || !teamsRes.ok) throw new Error('Failed to fetch tournament');
        const data = await res.json();
        const teamData = await teamsRes.json();
        setTournament(data.tournament);
        setTeams(teamData)
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTournament();
  }, [tournamentId]);


   // ✅ Define the Discord setup handler function
  const handleDiscordSetup = async () => {
    if (!tournamentId) {
      toast.error("Tournament ID not found.");
      return;
    }
    try {
      toast.loading("Setting up Discord...");
      const response = await fetch(`/api/tournaments/discord?tournamentId=${tournamentId}`, {
        method: 'POST',
      });

      const data = await response.json();
      toast.dismiss(); // Remove loading toast

      if (!response.ok) {
         toast.error(data.error || 'Failed to setup Discord');
      }

      toast.success(data.message || 'Discord setup completed!');
    } catch (error: unknown) {
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  return (
    <div className="admin-shell">
      <Header />
      {
        !tournament && loading && <main className="admin-content"><div className="empty-state">Loading tournament details…</div></main>
      }{
        tournament && !loading &&
      <main className="admin-content">
        <BasicInfo onDiscordSetup={handleDiscordSetup} tournament={tournament} teams={teams}  />
        <div className="section-toolbar"><h2>Registered teams</h2><span>{teams.length} total · {teams.filter((team) => team.isApproved).length} approved</span></div>
        <Participents teams={teams} />
      </main>
      }
      {
        !tournament && !loading && <main className="admin-content"><div className="empty-state">Tournament not found.</div></main>
      }
    </div>
  );
};

export default TournamentDetails;
