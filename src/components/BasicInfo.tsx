import type { Team, Tournament } from '@/lib/shareInterface';
import SafeAdminImage from './SafeAdminImage';
import Link from 'next/link';
import GenerateObserverZip from './GenerateObserverZip';

interface BasicInfoProps {
  tournament: Tournament;
  teams: Team[];
  onDiscordSetup: () => void;
}

const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not set' : date.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function BasicInfo({ tournament, teams, onDiscordSetup }: BasicInfoProps) {
  const approved = teams.filter((team) => team.isApproved).length;
  const pending = teams.length - approved;

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
          <button type="button" onClick={onDiscordSetup} className="rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-sm font-semibold text-indigo-200 hover:bg-indigo-500/20">Setup Discord</button>
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
    </section>
  );
}
