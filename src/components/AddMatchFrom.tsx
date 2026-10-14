'use client';

import { useParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';

const pubgMaps = [
  'Erangel',
  'Miramar',
  'Sanhok',
  'Vikendi',
  'Deston',
  'Taego',
  'Paramo',
  'Haven',
  'Rondo'
];

const AddMatchForm = () => {
  const { tournamentId } = useParams();
  const [form, setForm] = useState({
    matchName: '',
    map: '',
    matchId: '',
    tournamentId: tournamentId?.toString() || '',
  });

  const [playerName, setPlayerName] = useState('');
  const [matchIds, setMatchIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (tournamentId) {
      setForm((prev) => ({ ...prev, tournamentId: tournamentId.toString() }));
    }
  }, [tournamentId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const fetchMatchIdsByPlayer = async () => {
    if (!playerName) return alert('Enter a player name first.');

    try {
      const res = await fetch(`/api/match/ids?playerName=${encodeURIComponent(playerName.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch matches');
      setMatchIds(data.ids || []);
      setMessage('✅ Match IDs fetched successfully!');
    } catch (error) {
      console.error('Error fetching match IDs:', error);
      setMessage('❌ Failed to fetch match IDs.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.matchName || !form.map || !form.matchId) {
      setMessage('All fields are required.');
      return;
    }

    try {
      const res = await fetch('/api/tournaments/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('✅ Match added successfully!');
        setForm({ matchName: '', map: '', matchId: '', tournamentId: tournamentId?.toString() || '' });
        setPlayerName('');
        setMatchIds([]);
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch {
      setMessage('❌ Something went wrong.');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl mx-auto bg-[#1c1c1e] text-white p-6 rounded-2xl shadow-lg space-y-6 border border-[#333]"
    >
      <h2 className="text-2xl font-bold text-center text-yellow-400">Add New Match</h2>

      <div>
        <label className="block text-sm mb-1">Match Name *</label>
        <input
          type="text"
          name="matchName"
          value={form.matchName}
          onChange={handleChange}
          required
          className="w-full p-2 rounded bg-[#2c2c2e] text-white outline-none focus:ring-2 focus:ring-yellow-400"
        />
      </div>

      <div>
        <label className="block text-sm mb-1">Map *</label>
        <select
          name="map"
          value={form.map}
          onChange={handleChange}
          required
          className="w-full p-2 rounded bg-[#2c2c2e] text-white outline-none focus:ring-2 focus:ring-yellow-400"
        >
          <option value="">-- Select Map --</option>
          {pubgMaps.map((map, idx) => (
            <option key={idx} value={map}>
              {map}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm mb-1">Player Name</label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter PUBG Player Name"
            className="flex-1 p-2 rounded bg-[#2c2c2e] text-white outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <button
            type="button"
            onClick={fetchMatchIdsByPlayer}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 px-4 rounded"
          >
            Get Matches
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1">Select Match ID *</label>
        <select
          name="matchId"
          value={form.matchId}
          onChange={handleChange}
          className="w-full p-2 rounded bg-[#2c2c2e] text-white outline-none focus:ring-2 focus:ring-yellow-400"
        >
          <option value="">-- Select Match ID --</option>
          {matchIds.map((id, idx) => (
            <option key={idx} value={id}>
              {id}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="manualMatchId" className="block text-sm mb-1">Or enter a Match ID manually</label>
        <input id="manualMatchId" name="matchId" value={form.matchId} onChange={handleChange}
          className="w-full p-2 rounded bg-[#2c2c2e] text-white" placeholder="PUBG Match ID" />
      </div>
      <button
        type="submit"
        className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2 px-4 rounded transition duration-200"
      >
        Submit Match
      </button>

      {message && <div className="text-center mt-4 text-sm text-yellow-300">{message}</div>}
    </form>
  );
};

export default AddMatchForm;
