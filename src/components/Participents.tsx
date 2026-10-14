'use client';

import { Team } from '@/lib/shareInterface';
import Image from 'next/image';
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

const Participents: React.FC<ParticipentsProps> = ({ teams }) => {
  const [teamList, setTeamList] = useState<Team[]>(teams);

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
          <Image
            src={team.teamLogo}
            alt={team.teamName}
            width={100}
            height={100}
            className="bg-gray-800 aspect-square object-cover rounded -top-18 absolute"
          />
          <div className="ml-22 bg-gray-700 p-2 rounded w-25 -mt-13 text-center rounded-tr-4xl text-orange-300 font-bold">
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
