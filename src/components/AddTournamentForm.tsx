'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

export default function AddTournamentForm() {
  const [form, setForm] = useState({
    tournamentName: '',
    startingDate: '',
    endDate: '',
    tier: '',
    region: '',
    tournamentImage: '',
    prize: '',
    totalMatch: '',
    tournamentType: '',
    isScream: false, // ✅ Added field
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement; // ✅ Type narrowing for checkbox
      setForm({ ...form, [name]: target.checked });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading('Adding Tournament...')

    try {
      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          startingDate: new Date(form.startingDate),
          endDate: new Date(form.endDate),
          totalMatch: Number(form.totalMatch),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('✅ Tournament added successfully!', { id: toastId });
        toast.dismiss(toastId);
        setForm({
          tournamentName: '',
          startingDate: '',
          endDate: '',
          tier: '',
          region: '',
          tournamentImage: '',
          prize: '',
          totalMatch: '',
          tournamentType: '',
          isScream: false, // ✅ Reset checkbox
        });
      } else {
        toast.error(`Error: ${data.error || 'Unknown error'}`, { id:toastId });
        toast.dismiss(toastId);
      }
    } catch {
      toast.error('Failed to submit', { id:toastId });
      toast.dismiss(toastId);
    } finally {
      setLoading(false);
      toast.dismiss(toastId);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl mx-auto bg-[#0f1116] p-8 rounded-2xl shadow-lg border border-gray-700 text-white"
    >
      <h2 className="text-2xl font-bold mb-6 text-yellow-400">Add Tournament</h2>

      {/* Text and Date Inputs */}
      {[
        { name: 'tournamentName', label: 'Tournament Name' },
        { name: 'startingDate', label: 'Start Date', type: 'date' },
        { name: 'endDate', label: 'End Date', type: 'date' },
        { name: 'tier', label: 'Tier' },
        { name: 'region', label: 'Region' },
        { name: 'tournamentImage', label: 'Tournament Image' },
        { name: 'prize', label: 'Prize Pool (e.g. $500)' },
        { name: 'totalMatch', label: 'Total Matches', type: 'number' },
      ].map(({ name, label, type = 'text' }) => (
        <div className="mb-4" key={name}>
          <label htmlFor={name} className="block mb-1 font-semibold text-yellow-500">
            {label}
          </label>
          <input
            type={type}
            id={name}
            name={name}
            value={form[name as keyof typeof form] as string}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-md bg-[#1a1c22] border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
        </div>
      ))}

      {/* Tournament Type Select */}
      <div className="mb-4">
        <label htmlFor="tournamentType" className="block mb-1 font-semibold text-yellow-500">
          Tournament Type
        </label>
        <select
          id="tournamentType"
          name="tournamentType"
          value={form.tournamentType}
          onChange={handleChange}
          className="w-full px-4 py-2 rounded-md bg-[#1a1c22] border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          required
        >
          <option value="">Select Type</option>
          <option value="Solo">Solo</option>
          <option value="Duo">Duo</option>
          <option value="Squad">Squad</option>
        </select>
      </div>

      {/* ✅ Scrim Checkbox */}
      <div className="mb-4 flex items-center">
        <input
          type="checkbox"
          id="isScream"
          name="isScream"
          checked={form.isScream}
          onChange={handleChange}
          className="mr-2 h-5 w-5 text-yellow-500 bg-[#1a1c22] border border-gray-600 focus:ring-yellow-500 rounded"
        />
        <label htmlFor="isScream" className="text-yellow-500 font-semibold">
          This is a Scrim Tournament
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 mt-4 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg transition duration-200"
      >
        {loading ? 'Submitting...' : 'Add Tournament'}
      </button>

      
    </form>
  );
}
