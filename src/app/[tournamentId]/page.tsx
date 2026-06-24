'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import BasicInfo from '@/components/BasicInfo';
import TabsSection from '@/components/tabsSection';
import StickyButton from '@/components/StickyButton';
import { Team, Tournament } from '@/lib/shareInterface';
import GenerateObserverZip from '@/components/GenerateObserverZip';
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
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || 'Something went wrong.');
    }
  };

  return (
    <div>
      <Header />
      {
        !tournament && loading && <p className="text-white p-4 text-center">Loading tournament details...</p>
      }{
        tournament && !loading &&
      <div className="container mx-auto">
        <BasicInfo onDiscordSetup={handleDiscordSetup} tournament={tournament} teams={teams}  />
        <Participents teams={teams} />
      </div>
      }
      {
        !tournament && !loading && <p className="text-white p-4 text-center">Tournament not found.</p>
      }
    </div>
  );
};

export default TournamentDetails;
