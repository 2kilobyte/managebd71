'use client';

import { Player, Team } from '@/lib/shareInterface';
import SafeAdminImage from './SafeAdminImage';
import Link from 'next/link';
import React, { useState } from 'react';
import { IoGameControllerOutline } from 'react-icons/io5';
import { LuUser } from 'react-icons/lu';
import { MdLocalPhone } from 'react-icons/md';
import { TbBrandDiscord } from 'react-icons/tb';
import toast from 'react-hot-toast';

interface ParticipentsProps {
  teams: Team[];
}

const hasValidTeamColor = (color?: string) => typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color);

const Participents: React.FC<ParticipentsProps> = ({ teams }) => {
  const [teamList, setTeamList] = useState<Team[]>(teams);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamDrafts, setTeamDrafts] = useState<Record<string, Team>>({});
  const [adminSecret, setAdminSecret] = useState('');
  const [savingTeamId, setSavingTeamId] = useState<string | null>(null);

  const startEditing = (team: Team) => {
    setTeamDrafts((current) => ({
      ...current,
      [team._id]: {
        ...team,
        players: team.players.map((player) => ({ ...player })),
      },
    }));
    setEditingTeamId(team._id);
  };

  const updateDraft = (team: Team, updates: Partial<Team>) => {
    setTeamDrafts((current) => ({
      ...current,
      [team._id]: { ...(current[team._id] ?? team), ...updates },
    }));
  };

  const updatePlayerDraft = (team: Team, index: number, updates: Partial<Player>) => {
    const draft = teamDrafts[team._id] ?? team;
    const players = draft.players.map((player, playerIndex) => playerIndex === index ? { ...player, ...updates } : player);
    updateDraft(team, { players });
  };

  const handleSaveTeam = async (team: Team) => {
    const draft = teamDrafts[team._id] ?? team;
    if (!adminSecret.trim()) return toast.error('Enter the Admin key to save team information.');

    setSavingTeamId(team._id);
    try {
      const response = await fetch('/api/tournaments/teams/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-bd71-admin-secret': adminSecret.trim(),
        },
        body: JSON.stringify({
          teamId: team._id,
          tournamentId: team.tournamentId,
          teamName: draft.teamName,
          teamShortName: draft.teamShortName,
          teamLogo: draft.teamLogo,
          teamColor: draft.teamColor ?? '',
          teamCode: draft.teamCode,
          mobileNumber: draft.mobileNumber,
          transactionId: draft.transactionId ?? '',
          players: draft.players,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not update team information.');

      setTeamList((current) => current.map((item) => item._id === team._id ? { ...item, ...data.team } : item));
      setEditingTeamId(null);
      setAdminSecret('');
      toast.success('Team information updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update team information.');
    } finally {
      setSavingTeamId(null);
    }
  };

  const handleApprove = async (teamId: string, tournamentId: string) => {
    const toastId = toast.loading('Approving team...');
    try {
      const res = await fetch(`/api/tournaments/teams/accept?teamId=${teamId}&tournamentId=${tournamentId}`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to approve team');
      }

      toast.success('Team approved successfully!', { id: toastId });

      // update UI state instantly
      setTeamList((prev) =>
        prev.map((t) => (t._id === teamId ? { ...t, isApproved: true } : t))
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error approving team', { id: toastId });
    }
  };

  const handleDecline = async (teamId: string, tournamentId: string) => {
    const toastId = toast.loading('Removing team from approve list...');
    try {
      const res = await fetch(`/api/tournaments/teams/decline?teamId=${teamId}&tournamentId=${tournamentId}`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to decline team');
      }

      toast.success('Team removed from approved list!', { id: toastId });

      // update UI state instantly
      setTeamList((prev) =>
        prev.map((t) => (t._id === teamId ? { ...t, isApproved: false } : t))
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error declining team', { id: toastId });
    }
  };

  const handleDelete = async (teamId: string, tournamentId: string) => {
    const toastId = toast.loading('Deleting team...');
    try {
      const res = await fetch(`/api/tournaments/teams/delete?teamId=${teamId}&tournamentId=${tournamentId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete team');
      }

      toast.success('Team deleted successfully!', { id: toastId });

      // Remove team from UI state
      setTeamList((prev) => prev.filter((t) => t._id !== teamId));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error deleting team', { id: toastId });
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {teamList.map((team) => (
        <div
          key={team._id}
          className="relative bg-gray-800 p-4 rounded-lg mt-20 min-h-25"
        >
          <SafeAdminImage
            src={team.teamLogo}
            alt={team.teamName}
            width={100}
            height={100}
            className="bg-gray-800 aspect-square object-cover rounded -top-18 absolute"
          />
          <div
            style={hasValidTeamColor(team.teamColor) ? { backgroundColor: team.teamColor, color: '#fff' } : undefined}
            className={`ml-22 ${hasValidTeamColor(team.teamColor) ? '' : 'bg-gray-700 text-orange-300'} p-2 rounded w-25 -mt-13 text-center rounded-tr-4xl font-bold`}
          >
            {team.teamShortName}
          </div>
          <div
            style={team.isApproved ? { backgroundColor: 'green' } : { backgroundColor: 'red' }}
            className="absolute right-3 top-3 px-2 py-1 rounded"
          >
            {team.isApproved ? 'Approved' : 'Not Approved'}
          </div>
          {/* <button
                  onClick={() => handleDelete(team._id, team.tournamentId)}
                  className="px-5 py-2 bg-red-700 rounded-3xl cursor-pointer hover:bg-red-600 transition-colors flex items-center gap-2 absolute right-2 top-2"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-5 w-5" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                  Delete
                </button> */}

          <div className="flex flex-row justify-between items-center">
            <h2 className="text-white text-4xl font-bold mt-8 ">
              {team.teamName}
            </h2>
            <Link
              href={`tel:${team.mobileNumber}`}
              className="text-gray-500 hover:text-gray-400 transition-all text-lg font-bold mt-14 flex items-center"
            >
              <MdLocalPhone className="mr-2" /> {team.mobileNumber}
            </Link>
          </div>

          {editingTeamId === team._id ? (() => {
            const draft = teamDrafts[team._id] ?? team;
            const inputClass = 'w-full min-w-0 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-400';
            return <form className="mt-5 rounded-lg border border-amber-500/40 bg-gray-900 p-4" onSubmit={(event) => { event.preventDefault(); void handleSaveTeam(team); }}>
              <h3 className="mb-4 text-lg font-semibold text-amber-300">Edit team and player details</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs text-gray-300">Team name<input required maxLength={100} className={inputClass} value={draft.teamName} onChange={(event) => updateDraft(team, { teamName: event.target.value })} /></label>
                <label className="grid gap-1 text-xs text-gray-300">Team short name (max 4)<input required maxLength={4} className={inputClass} value={draft.teamShortName} onChange={(event) => updateDraft(team, { teamShortName: event.target.value })} /></label>
                <label className="grid gap-1 text-xs text-gray-300">Mobile number<input required inputMode="numeric" maxLength={11} className={inputClass} value={draft.mobileNumber} onChange={(event) => updateDraft(team, { mobileNumber: event.target.value })} /></label>
                <label className="grid gap-1 text-xs text-gray-300">bKash transaction ID<input className={inputClass} value={draft.transactionId ?? ''} onChange={(event) => updateDraft(team, { transactionId: event.target.value })} /></label>
                <label className="grid gap-1 text-xs text-gray-300 sm:col-span-2">Team image URL<input type="url" className={inputClass} value={draft.teamLogo ?? ''} onChange={(event) => updateDraft(team, { teamLogo: event.target.value })} placeholder="https://i.postimg.cc/... or https://i.ibb.co/..." /><span className="text-gray-500">Supported hosted image sources display normally. Other valid image URLs are saved and shown as text; the site leaves their image blank.</span></label>
                <label className="grid gap-1 text-xs text-gray-300 sm:col-span-2">Team color (6-digit HEX)<div className="flex flex-wrap items-center gap-2"><input type="color" aria-label="Pick team color" value={/^#[0-9a-fA-F]{6}$/.test(draft.teamColor ?? '') ? draft.teamColor : '#FFB800'} onChange={(event) => updateDraft(team, { teamColor: event.target.value.toUpperCase() })} className="h-10 w-14 rounded border border-gray-600 bg-gray-800 p-1" /><input className={`${inputClass} max-w-40 font-mono uppercase`} value={draft.teamColor ?? ''} onChange={(event) => updateDraft(team, { teamColor: event.target.value.toUpperCase() })} placeholder="#FFB800" maxLength={7} /><button type="button" onClick={() => updateDraft(team, { teamColor: '' })} className="rounded-md bg-gray-700 px-3 py-2 text-xs text-white">Clear color</button></div></label>
                <label className="grid gap-1 text-xs text-gray-300 sm:col-span-2">Team code<input className={inputClass} value={draft.teamCode ?? ''} onChange={(event) => updateDraft(team, { teamCode: event.target.value })} /></label>
              </div>
              <div className="mt-5 grid gap-3">
                <div className="flex items-center justify-between"><h4 className="font-semibold text-white">Players</h4><button type="button" onClick={() => updateDraft(team, { players: [...draft.players, { ign: '', fullName: '', discordName: '', isLeader: draft.players.length === 0 }] })} className="rounded-md border border-amber-500/60 px-3 py-1.5 text-sm text-amber-300 hover:bg-amber-500/10">Add player</button></div>
                {draft.players.map((player, idx) => <div key={idx} className="grid gap-2 rounded-md border border-gray-700 p-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-xs text-gray-300">PUBG IGN<input required className={inputClass} value={player.ign ?? ''} onChange={(event) => updatePlayerDraft(team, idx, { ign: event.target.value })} /></label>
                  <label className="grid gap-1 text-xs text-gray-300">Real name<input required className={inputClass} value={player.fullName ?? ''} onChange={(event) => updatePlayerDraft(team, idx, { fullName: event.target.value })} /></label>
                  <label className="grid gap-1 text-xs text-gray-300">Discord User ID<input required inputMode="numeric" className={inputClass} value={player.discordName ?? ''} onChange={(event) => updatePlayerDraft(team, idx, { discordName: event.target.value })} /></label>
                  <div className="flex items-end justify-between gap-2"><label className="flex items-center gap-2 pb-2 text-sm text-gray-300"><input type="radio" name={`leader-${team._id}`} checked={player.isLeader === true} onChange={() => updateDraft(team, { players: draft.players.map((item, playerIndex) => ({ ...item, isLeader: playerIndex === idx })) })} /> Team leader</label><button type="button" disabled={draft.players.length <= 1} onClick={() => { const players = draft.players.filter((_, playerIndex) => playerIndex !== idx); if (player.isLeader && players.length) players[0] = { ...players[0], isLeader: true }; updateDraft(team, { players }); }} className="rounded-md bg-red-900/70 px-3 py-1.5 text-sm text-red-200 disabled:opacity-40">Remove</button></div>
                </div>)}
              </div>
              <label className="mt-4 grid gap-1 text-xs text-gray-300">Admin key<input type="password" required autoComplete="off" className={inputClass} value={adminSecret} onChange={(event) => setAdminSecret(event.target.value)} /></label>
              <div className="mt-4 flex flex-wrap gap-2"><button type="submit" disabled={savingTeamId === team._id} className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">{savingTeamId === team._id ? 'Saving…' : 'Save team details'}</button><button type="button" onClick={() => { setEditingTeamId(null); setAdminSecret(''); }} className="rounded-md bg-gray-700 px-4 py-2 text-sm text-white">Cancel</button></div>
            </form>;
          })() : <>
          <div className="mt-4 rounded-lg border border-gray-700 bg-gray-900 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Team image URL</div>
            <div className="break-all font-mono text-xs text-gray-300">{team.teamLogo || 'No image URL provided'}</div>
          </div>
          {team.transactionId && <div className="mt-4 rounded-lg border border-amber-500/40 bg-gray-900 px-4 py-3 text-sm text-amber-200"><span className="mr-2 font-semibold">bKash Transaction ID</span><code className="break-all font-mono text-white">{team.transactionId}</code></div>}
          <div className="grid mt-6">
            {team.players.map((player, idx) => (
              <div
                className="rounded-lg text-2xl flex flex-row items-center relative"
                key={idx}
              >
                <div className="grid grid-cols-3 gap-3 w-full mb-4">
                  <div className="flex flex-row items-center bg-gray-900 rounded-lg">
                    <div className="p-2 bg-gray-700 rounded-lg mr-2">
                      <IoGameControllerOutline />
                    </div>{' '}
                    {player.ign}
                  </div>
                  <div className="flex flex-row items-center bg-gray-900 rounded-lg">
                    <div className="p-2 bg-gray-700 rounded-lg mr-2">
                      <LuUser />
                    </div>{' '}
                    {player.fullName}
                  </div>
                  <div className="flex flex-row items-center bg-gray-900 rounded-lg">
                    <div className="p-2 bg-gray-700 rounded-lg mr-2">
                      <TbBrandDiscord />
                    </div>{' '}
                    <div className="overflow-hidden text-ellipsis">
                      {player.discordName}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => startEditing(team)} className="mt-3 rounded-md border border-amber-500/60 px-4 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/10">Edit team and players</button>
          </>}

          {/* Approve / Decline / Delete Buttons */}
          <div className="flex justify-between items-center mt-4">
            {!team.isApproved ? (
              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove(team._id, team.tournamentId)}
                  className="px-5 py-2 bg-green-700 rounded-3xl cursor-pointer hover:bg-green-600 transition-colors"
                >
                  Approve Team
                </button>
                <button
                  onClick={() => handleDelete(team._id, team.tournamentId)}
                  className="px-5 py-2 bg-red-700 rounded-3xl cursor-pointer hover:bg-red-600 transition-colors flex items-center gap-2"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-5 w-5" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                  Delete
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => handleDecline(team._id, team.tournamentId)}
                  className="px-5 py-2 bg-red-500 rounded-3xl cursor-pointer hover:bg-red-400 transition-colors"
                >
                  Remove From Approve List
                </button>
                
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Participents;
