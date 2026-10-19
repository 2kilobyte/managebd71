'use client';

import { useParams } from 'next/navigation';
import LiveScoreKeyManager from '@/components/LiveScoreKeyManager';
import Header from '@/components/Header';

export default function LiveScoreKeysPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  return <div className="admin-shell">
    <Header />
    <LiveScoreKeyManager tournamentId={String(tournamentId)} />
  </div>;
}
