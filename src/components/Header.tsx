'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface LiveData {
  _id: string;
  videoId: string;
  isEnded: boolean;
  createdAt: string;
}

const Header = () => {
  const [live, setLive] = useState<LiveData | null>(null);

  useEffect(() => {
    const fetchLive = async () => {
      try {
        const response = await fetch('/api/lives');
        if (response.ok) setLive(await response.json());
      } catch (error) {
        console.error('Error fetching live:', error);
      }
    };
    void fetchLive();
  }, []);

  const endLive = async () => {
    try {
      const response = await fetch('/api/lives/end', { method: 'PUT' });
      if (response.ok) setLive(null);
    } catch (error) {
      console.error('Error ending live stream:', error);
    }
  };

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-inner">
        <Link className="admin-brand" href="/" aria-label="BD71 Admin home">
          <Image width={100} height={100} src="/img/bd71.png" alt="BD71" />
          <span className="admin-brand-copy">
            <strong>BD71 Esports</strong>
            <span>Tournament admin</span>
          </span>
        </Link>
        <nav className="admin-nav" aria-label="Main navigation">
          <Link href="/">Tournaments</Link>
          <Link href="/lives">Live stream</Link>
          <Link className="nav-primary" href="/add-tournament">＋ Add tournament</Link>
          {live && !live.isEnded ? (
            <button className="nav-danger" type="button" onClick={endLive}>End live</button>
          ) : (
            <Link href="/add-live">＋ Add live</Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
