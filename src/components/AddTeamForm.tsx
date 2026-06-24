'use client';

import { useParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';

const AddTeamForm = () => {
  const { tournamentId } = useParams();

  const [form, setForm] = useState({
    teamName: '',
    teamGameId: '',
    player1: '',
    player2: '',
    player3: '',
    player4: '',
    player5: '',
    player6: '',
    player7: '',
    player8: '',
    leader: '',
    tournamentId: tournamentId || '',
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.teamName || !form.player1 || !form.leader || !form.tournamentId) {
      setMessage('Team Name, Player 1, team id, and Leader are required.');
      return;
    }
    console.log(form);
    

    const res = await fetch('/api/tournaments/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    console.log('Response:', data);
    
    if (res.ok) {
      setMessage('✅ Team added successfully!');
      setForm({
        teamName: '',
        teamGameId: '',
        player1: '',
        player2: '',
        player3: '',
        player4: '',
        player5: '',
        player6: '',
        player7: '',
        player8: '',
        leader: '',
        tournamentId: tournamentId?.toString() || '',
      });
    } else {
      setMessage(`❌ ${data.error}`);
    }
  };

  const playerOptions = [
    form.player1,
    form.player2,
    form.player3,
    form.player4,
    form.player5,
    form.player6,
    form.player7,
    form.player8,
  ].filter(Boolean);

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl mx-auto bg-[#1c1c1e] text-white p-6 rounded-2xl shadow-lg space-y-6 border border-[#333]"
    >
      <h2 className="text-2xl font-bold text-center text-yellow-400">Add New Team</h2>

      <div className="text-yellow-300 text-sm mb-4 text-center">
        Tournament ID: <span className="font-mono">{form.tournamentId}</span>
      </div>

      <div>
        <label className="block text-sm mb-1">Team Name *</label>
        <input
          type="text"
          name="teamName"
          value={form.teamName}
          onChange={handleChange}
          className="w-full p-2 rounded bg-[#2c2c2e] text-white outline-none focus:ring-2 focus:ring-yellow-400"
          required
        />
      </div>

      <div>
        <label className="block text-sm mb-1">Select Team Number</label>
        <select
          name="teamGameId"
          value={form.teamGameId}
          onChange={handleChange}
          className="w-full p-2 rounded bg-[#2c2c2e] text-white outline-none focus:ring-2 focus:ring-yellow-400"
        >
          <option value="">-- Select Team No --</option>
          {Array.from({ length: 100 }, (_, i) => (
            <option key={i + 1} value={i+1}>
              Team {i + 1}
            </option>
          ))}
        </select>
      </div>

      {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
        <div key={num}>
          <label className="block text-sm mb-1">
            Player {num} IGN{num === 1 ? ' *' : ''}
          </label>
          <input
            type="text"
            name={`player${num}`}
            value={form[`player${num}` as keyof typeof form]}
            onChange={handleChange}
            className="w-full p-2 rounded bg-[#2c2c2e] text-white outline-none focus:ring-2 focus:ring-yellow-400"
            required={num === 1}
          />
        </div>
      ))}

      <div>
        <label className="block text-sm mb-1">Select Team Leader *</label>
        <select
          name="leader"
          value={form.leader}
          onChange={handleChange}
          required
          className="w-full p-2 rounded bg-[#2c2c2e] text-white outline-none focus:ring-2 focus:ring-yellow-400"
        >
          <option value="">-- Select Leader --</option>
          {playerOptions.map((player, idx) => (
            <option key={idx} value={player}>
              {player}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2 px-4 rounded transition duration-200"
      >
        Submit Team
      </button>

      {message && (
        <div className="text-center mt-4 text-sm text-yellow-300">{message}</div>
      )}
    </form>
  );
};

export default AddTeamForm;
