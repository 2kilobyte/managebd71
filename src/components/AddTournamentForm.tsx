'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

export default function AddTournamentForm() {
  const [adminSecret, setAdminSecret] = useState('');
  const [createdKeys, setCreatedKeys] = useState<{ tournamentId: string; tournamentName: string; keys: { position: number; key: string }[] } | null>(null);
  const [copyMessage, setCopyMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [form, setForm] = useState({
    tournamentName: '',
    startingDate: '',
    endDate: '',
    tier: '',
    region: '',
    tournamentImage: '',
    prize: '',
    entryFeeAmount: '',
    entryFeeBkashNumber: '',
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
    setSubmitError('');
    const toastId = toast.loading('Adding Tournament...')

    try {
      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-bd71-admin-secret': adminSecret.trim() },
        body: JSON.stringify({
          ...form,
          startingDate: new Date(`${form.startingDate}:00+06:00`),
          endDate: new Date(`${form.endDate}:00+06:00`),
          totalMatch: Number(form.totalMatch),
          entryFeeAmount: form.entryFeeAmount === '' ? null : Number(form.entryFeeAmount),
          entryFeeBkashNumber: form.entryFeeBkashNumber.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setCreatedKeys({ tournamentId: data.insertedId, tournamentName: form.tournamentName, keys: data.scorerKeys || [] });
        setCopyMessage('');
        toast.success('✅ Tournament and both scorer keys created!', { id: toastId });
        setForm({
          tournamentName: '',
          startingDate: '',
          endDate: '',
          tier: '',
          region: '',
          tournamentImage: '',
          prize: '',
          entryFeeAmount: '',
          entryFeeBkashNumber: '',
          totalMatch: '',
          tournamentType: '',
          isScream: false, // ✅ Reset checkbox
        });
      } else {
        const message = `${data.error || 'Tournament could not be created.'} (HTTP ${response.status})`;
        setSubmitError(message);
        toast.error(message, { id: toastId, duration: 10000 });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error while submitting tournament.';
      setSubmitError(`Could not reach the Admin API: ${message}`);
      toast.error('Could not reach the Admin API. See the message on the form.', { id: toastId, duration: 10000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl mx-auto bg-[#0f1116] p-8 rounded-2xl shadow-lg border border-gray-700 text-white"
    >
      <h2 className="text-2xl font-bold mb-6 text-yellow-400">Add Tournament</h2>

      <div className="mb-5">
        <label htmlFor="tournament-admin-secret" className="block mb-1 font-semibold text-yellow-500">Admin access key</label>
        <input id="tournament-admin-secret" type="password" autoComplete="off" minLength={32} required value={adminSecret} onChange={(event) => setAdminSecret(event.target.value)} placeholder="Enter the BD71 admin live-score key" className="w-full px-4 py-2 rounded-md bg-[#1a1c22] border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
        <p className="mt-1 text-xs text-gray-400">Use the value configured as BD71_LIVE_SCORE_ADMIN_SECRET on the Admin server.</p>
      </div>

      {/* Text and Date Inputs */}
      {[
        { name: 'tournamentName', label: 'Tournament Name' },
        { name: 'startingDate', label: 'Start Date and Time (Bangladesh)', type: 'datetime-local' },
        { name: 'endDate', label: 'End Date and Time (Bangladesh)', type: 'datetime-local' },
        { name: 'tier', label: 'Tier' },
        { name: 'region', label: 'Region' },
        { name: 'tournamentImage', label: 'Tournament Image' },
        { name: 'prize', label: 'Prize Pool (e.g. $500)' },
        { name: 'entryFeeAmount', label: 'Entry Fee (BDT, leave blank for free)', type: 'number' },
        { name: 'entryFeeBkashNumber', label: 'Entry Fee bKash Number' },
        { name: 'totalMatch', label: 'Total Matches', type: 'number' },
      ].map(({ name, label, type = 'text' }) => (
        <div className="mb-4" key={name}>
          <label htmlFor={name} className="block mb-1 font-semibold text-yellow-500">
            {label}
          </label>
          <input
            type={type}
            min={name === 'entryFeeAmount' ? '0' : undefined}
            step={name === 'entryFeeAmount' ? 'any' : undefined}
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

      {submitError && <div role="alert" className="mt-4 rounded-lg border border-red-500/70 bg-red-950/50 p-4 text-sm leading-6 text-red-100">
        <strong className="block text-red-300">Tournament creation failed</strong>
        <span>{submitError}</span>
        {submitError.includes('Admin access key') && <p className="mt-2 text-red-200">Check that you entered the value for BD71_LIVE_SCORE_ADMIN_SECRET, and that the same value is saved in the BD71 Admin Vercel project.</p>}
        {submitError.includes('BD71_LIVE_SCORE_ADMIN_SECRET is not configured') && <p className="mt-2 text-red-200">The active deployment does not have the Admin secret yet. Confirm it is enabled for Production and redeploy the BD71 Admin project.</p>}
        {submitError.includes('BD71_LIVE_SCORE_KEY_ENCRYPTION_SECRET') && <p className="mt-2 text-red-200">Add BD71_LIVE_SCORE_KEY_ENCRYPTION_SECRET to the BD71 Admin project, then redeploy it.</p>}
      </div>}

      {createdKeys && <section className="mt-6 rounded-xl border border-yellow-500/70 bg-[#19170e] p-5" aria-live="polite">
        <h3 className="text-lg font-bold text-yellow-300">Scorer keys created for {createdKeys.tournamentName}</h3>
        <p className="mt-1 text-sm text-gray-300">Copy each key and share it only with its assigned scorer. The keys are also available on the tournament’s Scorer Keys page.</p>
        <a href={`/${createdKeys.tournamentId}/live-score`} className="mt-3 inline-block text-sm font-semibold text-yellow-300 underline">Open this tournament’s Scorer Keys page</a>
        <div className="mt-4 grid gap-3">
          {createdKeys.keys.map(({ position, key }) => <div key={position} className="rounded-lg border border-gray-700 bg-black/30 p-3">
            <div className="mb-2 flex items-center justify-between gap-3"><b className="text-yellow-300">Position {position} · Teams {position === 1 ? '01–08' : '09–16'}</b><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(key); setCopyMessage(`Position ${position} key copied.`); } catch { setCopyMessage('Copy was blocked. Select and copy the key manually.'); } }} className="rounded bg-yellow-400 px-3 py-1 text-sm font-bold text-black">Copy</button></div>
            <code className="block break-all rounded bg-black/50 p-2 text-sm text-white">{key}</code>
          </div>)}
        </div>
        {copyMessage && <p role="status" className="mt-3 text-sm text-yellow-200">{copyMessage}</p>}
      </section>}

      
    </form>
  );
}
