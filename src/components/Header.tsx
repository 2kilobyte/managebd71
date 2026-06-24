"use client"
import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'
interface LiveData {
  _id: string;
  videoId: string; // can be full YouTube URL, channel ID, or plain video ID
  isEnded: boolean;
  createdAt: string;
}

const Header = () => {
    const [live, setLive] = useState<LiveData | null>(null);
      useEffect(() => {
    const fetchLive = async () => {
      try {
        const res = await fetch("/api/lives"); // ✅ updated to /api/lives
        if (res.ok) {
          const data = await res.json();
          setLive(data);
        }
      } catch (error) {
        console.error("Error fetching live:", error);
      } 
    };
    fetchLive();
  }, []);


  const handleSubmit = async () => {
    try {
      const res = await fetch('/api/lives/end', {
        method: 'PUT',
      });
      const data = await res.json(); 
        if (res.ok) {  
        setLive(null); // Clear the live state
      }
    } catch (error) {
      console.error('Error ending live stream:', error);
    }
  }

    return (
        <div className="flex items-center justify-between p-4 bg-[#202229] text-white">
            <div className="flex items-center">
                <Image width={100} height={100} src="/img/bd71.png" alt="BD71" className="h-10 w-10 mr-2" />
                <Link href="/">
                    <span className="text-xl font-bold">BD71 Esports Tournaments</span>
                </Link>
            </div>
            <nav className="space-x-4">
                <Link href="/lives" className="hover:underline">Lives</Link>
                <Link href="/add-tournament" className="p-3 bg-amber-700 rounded mr-2">Add Tournaments</Link>
                {
                    live && !live.isEnded ? (
                        <button onClick={handleSubmit} className='px-4 py-2 bg-red-500 cursor-pointer rounded'>End live</button>
                    )
                    :
                    <Link href="/add-live" className="p-3 bg-amber-700 rounded">Add Live</Link>
                }
                
            </nav>
        </div>
    )
}

export default Header