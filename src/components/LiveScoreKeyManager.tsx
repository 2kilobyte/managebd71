'use client';

import { useState } from 'react';

type ScorerKey = { position: number; active: boolean; lastFour: string | null; createdAt: string | null; key: string | null };

export default function LiveScoreKeyManager({ tournamentId }: { tournamentId: string }) {
  const [adminSecret, setAdminSecret] = useState('');
  const [connected, setConnected] = useState(false);
  const [tournamentName, setTournamentName] = useState('');
  const [keys, setKeys] = useState<ScorerKey[]>([]);
  const [message, setMessage] = useState('');

  async function connect(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');
    try {
      const response = await fetch(`/api/tournaments/live-score-keys?tournamentId=${encodeURIComponent(tournamentId)}`, {
        headers: { 'x-bd71-admin-secret': adminSecret }, cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load scorer keys.');
      setKeys(data.keys || []);
      setTournamentName(data.tournament?.name || 'Tournament');
      setConnected(true);
    } catch (error) {
      setConnected(false);
      setMessage(error instanceof Error ? error.message : 'Could not load scorer keys.');
    }
  }

  async function copyKey(key: string, position: number) {
    try { await navigator.clipboard.writeText(key); setMessage(`Position ${position} key copied. Share it only with that scorer.`); }
    catch { setMessage('Copy was blocked. Select and copy the key manually.'); }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-white">
      <p className="mb-2 text-xs font-bold uppercase tracking-[.22em] text-yellow-400">BD71 · Live scoring</p>
      <h1 className="mb-3 text-3xl font-bold">Scorer keys</h1>
      <p className="mb-7 max-w-2xl text-sm leading-6 text-gray-300">Two keys are created automatically with every new tournament. Use one key for Position 1 and one for Position 2. Each scorer can only update their assigned eight teams.</p>

      {!connected && <form onSubmit={connect} className="mb-7 rounded-xl border border-gray-700 bg-[#17191d] p-5">
        <label className="mb-2 block text-sm font-semibold text-gray-200" htmlFor="admin-secret">Admin access key</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input id="admin-secret" type="password" required minLength={32} autoComplete="off" value={adminSecret} onChange={(event) => setAdminSecret(event.target.value)} placeholder="Enter the BD71 live-score admin key" className="min-w-0 flex-1 rounded-md border border-gray-600 bg-[#0e1013] px-3 py-2 outline-none focus:border-yellow-400" />
          <button className="rounded-md bg-yellow-400 px-5 py-2 font-bold text-black hover:bg-yellow-300">Show keys</button>
        </div>
        <p className="mt-2 text-xs text-gray-500">The Admin access key is only held in this page session.</p>
      </form>}

      {connected && <>
        <h2 className="mb-4 text-xl font-bold text-gray-100">{tournamentName}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((position) => {
            const key = keys.find((item) => item.position === position);
            return <section key={position} className="rounded-xl border border-gray-700 bg-[#17191d] p-5">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-yellow-400">Position {position}</p>
              <p className="my-2 text-sm text-gray-300">Teams {position === 1 ? '01–08' : '09–16'}</p>
              {key?.active && key.key ? <>
                <code className="mb-3 block break-all rounded bg-black/40 p-3 text-sm text-white">{key.key}</code>
                <button type="button" onClick={() => copyKey(key.key!, position)} className="w-full rounded-md bg-yellow-400 px-4 py-2 text-sm font-bold text-black">Copy Position {position} key</button>
              </> : <p className="rounded-md border border-amber-700/50 bg-amber-950/30 p-3 text-sm text-amber-200">This tournament predates automatic keys. New tournaments receive both keys during creation.</p>}
              {key?.lastFour && <p className="mt-3 text-xs text-gray-500">Active key ends …{key.lastFour}</p>}
            </section>;
          })}
        </div>
      </>}
      {message && <p role="status" className="mt-4 rounded-md border border-gray-700 bg-[#17191d] p-3 text-sm text-gray-200">{message}</p>}
    </main>
  );
}
