'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'

const loadFacebookSDK = () => {
  if (document.getElementById('facebook-jssdk')) return;

  const script = document.createElement('script');
  script.id = 'facebook-jssdk';
  script.src = 'https://connect.facebook.net/en_GB/sdk.js#xfbml=1&version=v23.0';
  document.body.appendChild(script);
}

export default function Lives() {
  const [liveUrl, setLiveUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    const fetchLive = async () => {
      try {
        const res = await fetch('/api/lives');
        const data = await res.json();

        if (data?.url) {
          setLiveUrl(data.url);
          loadFacebookSDK();
        }
      } catch (error) {
        console.error('Failed to fetch live URL:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLive();
  }, []);

  const handleEndStream = async () => {
    if (!confirm('Are you sure you want to end the live stream?')) return;

    setEnding(true);
    try {
      const res = await fetch('/api/lives/end', {
        method: 'PUT',
      });
      if (res.ok) {

        setLiveUrl(''); 
        window.location.reload(); // Clear live URL to show "No stream running"
      } else {
        console.error('Failed to end live stream');
      }
    } catch (error) {
      console.error('Error ending live stream:', error);
    } finally {
      setEnding(false);
    }
  };

  return (
    <div className="admin-shell text-white">
      <Header />
      <main className="admin-content">
        <div className="page-heading"><p className="dashboard-kicker">Broadcast</p><h1>Live stream</h1><p>Monitor and manage the current Facebook live stream.</p></div>
        {loading ? (
          <div className="empty-state">Loading stream…</div>
        ) : liveUrl ? (
          <div className="admin-panel mx-auto w-full max-w-[900px] overflow-hidden p-4 sm:p-6">
            {/* Facebook Live Video */}
            <div
              className="fb-video rounded"
              data-href={liveUrl}
              data-width="800"
              data-show-text="true"
              data-autoplay="true"
              data-allowfullscreen="true"
            ></div>

            {/* Like & Share Buttons */}
            <div className="mt-4 flex gap-4 items-center">
              <div
                className="fb-like"
                data-href={liveUrl}
                data-width=""
                data-layout="button"
                data-action="like"
                data-size="large"
                data-share="true"
              ></div>
            </div>

            {/* End Stream Button */}
            <div className="mt-4 flex justify-center items-center">
              <button
                disabled={ending}
                onClick={handleEndStream}
                className={`inline-block bg-orange-800 hover:bg-orange-700 text-white font-semibold px-6 py-2 rounded transition duration-200 ${
                  ending ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {ending ? 'Ending...' : 'End Stream'}
              </button>
            </div>

            {/* Facebook Comments */}
            <div
              className="fb-comments mt-6"
              data-href={liveUrl}
              data-width="100%"
              data-numposts="5"
            ></div>
          </div>
        ) : (
          <div className="empty-state">
            No stream running.
          </div>
        )}
      </main>
    </div>
  );
}
