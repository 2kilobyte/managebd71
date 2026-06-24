'use client';

import React, { useState } from 'react';

const AddLiveForm = () => {
  const [videoId, setVideoId] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!videoId) {
      setMessage('Live URL is required.');
      return;
    }

    try {
      const res = await fetch('/api/lives', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('✅ Live stream added successfully!');
        setVideoId('');
      } else {
        setMessage(`❌ ${data.error || 'Failed to add live stream.'}`);
      }
    } catch (error) {
      console.error('Error submitting live stream:', error);
      setMessage('❌ Something went wrong.');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl mx-auto bg-[#1c1c1e] text-white p-6 rounded-2xl shadow-lg space-y-6 border border-[#333]"
    >
      <h2 className="text-2xl font-bold text-center text-yellow-400">Add Facebook Live Stream</h2>

      <div>
        <label className="block text-sm mb-1">Live Video Id *</label>
        <input
          type="text"
          name="videoId"
          value={videoId}
          onChange={(e) => setVideoId(e.target.value)}
          placeholder="live video id"
          required
          className="w-full p-2 rounded bg-[#2c2c2e] text-white outline-none focus:ring-2 focus:ring-yellow-400"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2 px-4 rounded transition duration-200"
      >
        Submit Live Stream
      </button>

      {message && <div className="text-center mt-4 text-sm text-yellow-300">{message}</div>}
    </form>
  );
};

export default AddLiveForm;
