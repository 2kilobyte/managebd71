import type { Team, Tournament } from '@/lib/shareInterface';
import SafeAdminImage from './SafeAdminImage';
import Link from 'next/link';
import GenerateObserverZip from './GenerateObserverZip';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface BasicInfoProps {
  tournament: Tournament;
  teams: Team[];
}

const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not set' : date.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function BasicInfo({ tournament, teams }: BasicInfoProps) {
  const [adminSecret, setAdminSecret] = useState('');
  const [discordBusy, setDiscordBusy] = useState(false);
  const [discordHistory, setDiscordHistory] = useState<Array<{ id: string; status: string; createdAt: string; channelCount: number; createdRoleCount: number; roleGrantCount: number; error?: string }>>([]);
  const approved = teams.filter((team) => team.isApproved).length;
  const pending = teams.length - approved;

  const loadDiscordHistory = async () => {
    if (!adminSecret.trim()) return toast.error('Enter the Admin access key first.');
    try {
      const response = await fetch(`/api/tournaments/discord?tournamentId=${tournament._id}`, {
        headers: { 'x-bd71-admin-secret': adminSecret.trim() }, cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load Discord history.');
      setDiscordHistory(data.runs ?? []);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not load Discord history.'); }
  };

  const runDiscordAction = async (action: 'setup' | 'cleanup') => {
    if (!adminSecret.trim()) return toast.error('Enter the Admin access key first.');
    if (action === 'cleanup' && !window.confirm('Remove Discord channels and team roles generated for this tournament, and revoke only the role grants that setup added?')) return;
    setDiscordBusy(true);
    const toastId = toast.loading(action === 'setup' ? 'Setting up Discord channels…' : 'Cleaning generated Discord items…');
    try {
      const response = await fetch(`/api/tournaments/discord?tournamentId=${tournament._id}`, {
        method: action === 'setup' ? 'POST' : 'DELETE',
        headers: { 'x-bd71-admin-secret': adminSecret.trim() },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Discord action failed.');
      toast.success(data.message || 'Discord action completed.', { id: toastId });
      await loadDiscordHistory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Discord action failed.', { id: toastId, duration: 9000 });
    } finally { setDiscordBusy(false); }
  };

  return (
    <section className="admin-panel mb-6 overflow-hidden">
      <div className="flex flex-col gap-5 border-b border-white/10 p-5 sm:p-6 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-2 sm:h-24 sm:w-24">
            <SafeAdminImage priority src={tournament.tournamentImage} width={100} height={100} alt={`${tournament.tournamentName} logo`} className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-xs font-bold uppercase tracking-[.18em] text-amber-400">Tournament workspace</p>
            <h1 className="break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">{tournament.tournamentName}</h1>
            <p className="mt-2 text-sm text-gray-400">{tournament.region} <span className="px-1 text-gray-600">·</span> {tournament.tournamentType} <span className="px-1 text-gray-600">·</span> {tournament.tier}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:ml-auto lg:justify-end">
          <Link href="/" className="rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-gray-300 hover:border-white/25 hover:text-white">← All tournaments</Link>
          <Link href={`/${tournament._id}/add-match`} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10">Add match</Link>
          <Link href={`/${tournament._id}/live-score`} className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-bold text-black hover:bg-amber-300">Scorer keys</Link>
          <GenerateObserverZip teams={teams.filter((team) => team.isApproved)} />
          <Link href={`/${tournament._id}/register`} className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20">＋ Add team</Link>
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-white/10 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ['Start date', dateLabel(tournament.startingDate)],
          ['End date', dateLabel(tournament.endDate)],
          ['Tier', tournament.tier || '—'],
          ['Region', tournament.region || '—'],
          ['Prize pool', tournament.prize || '—'],
          ['Teams', `${approved} approved${pending ? ` · ${pending} pending` : ''}`],
        ].map(([label, value]) => <div key={label} className="min-w-0 border-t border-white/10 px-4 py-3 sm:px-5 lg:border-t-0"><p className="text-[.68rem] font-bold uppercase tracking-wider text-gray-500">{label}</p><p className="mt-1 break-words text-sm font-semibold text-gray-200">{value}</p></div>)}
      </div>
      <div className="border-t border-white/10 bg-black/15 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="grid min-w-0 flex-1 gap-1 text-xs font-semibold text-gray-400">Admin access key
            <input type="password" autoComplete="off" value={adminSecret} onChange={(event) => setAdminSecret(event.target.value)} placeholder="Enter BD71 admin key" className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/60" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button disabled={discordBusy} type="button" onClick={() => runDiscordAction('setup')} className="rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-sm font-semibold text-indigo-200 hover:bg-indigo-500/20 disabled:opacity-50">Setup Discord</button>
            <button disabled={discordBusy} type="button" onClick={() => runDiscordAction('cleanup')} className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-50">Cleanup Discord</button>
            <button disabled={discordBusy} type="button" onClick={loadDiscordHistory} className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-white/5 disabled:opacity-50">Setup history</button>
          </div>
        </div>
        {discordHistory.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{discordHistory.map((run) => <div key={run.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-300">
          <div className="flex items-center justify-between gap-2"><strong className="uppercase tracking-wide text-amber-300">{run.status}</strong><span>{new Date(run.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}</span></div>
          <p className="mt-1">{run.channelCount} channels · {run.createdRoleCount} created roles · {run.roleGrantCount} role grants</p>
          {run.error && <p className="mt-1 break-words text-red-300">{run.error}</p>}
        </div>)}</div>}
      </div>
    </section>
  );
}
