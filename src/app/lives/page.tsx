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
    <div className="bg-[#18191D] text-white min-h-screen">
      <Header />
      <div className="container mx-auto min-h-[90vh] flex items-center justify-center p-4">
        {loading ? (
          <div className="text-gray-400 text-lg">Loading...</div>
        ) : liveUrl ? (
          <div className="w-full max-w-[800px]">
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
          <div className="text-xl text-center text-gray-400">
            No stream running.
          </div>
        )}
      </div>
    </div>
  );
}
