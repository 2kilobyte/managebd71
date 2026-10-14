'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import LiveScoreKeyManager from '@/components/LiveScoreKeyManager';

export default function LiveScoreKeysPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  return <div className="min-h-screen bg-[#101113]">
    <header className="border-b border-gray-800 px-4 py-4">
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <strong className="tracking-widest text-yellow-400">BD71 ADMIN</strong>
        <Link href={`/${tournamentId}`} className="rounded border border-gray-700 px-3 py-2 text-sm text-gray-200 hover:border-yellow-400">Back to tournament</Link>
      </div>
    </header>
    <LiveScoreKeyManager tournamentId={String(tournamentId)} />
  </div>;
}
