'use client';

import React from 'react';

const AddLiveForm = () => (
  <section className="admin-panel space-y-4 text-center text-white">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-2xl text-red-400">▶</div>
    <h2 className="text-2xl font-bold text-yellow-400">Automatic YouTube Live</h2>
    <p className="mx-auto max-w-xl text-gray-300">
      The tournament website now checks the <strong>@bd71esports</strong> channel and displays its active public live stream automatically. You no longer need to enter a video ID here.
    </p>
    <p className="mx-auto max-w-xl text-sm text-gray-400">
      If a broadcast is not embeddable, enable <strong>Allow embedding</strong> in YouTube Studio. The channel API key is configured on the tournament website deployment.
    </p>
    <a href="https://www.youtube.com/@bd71esports/live" target="_blank" rel="noopener noreferrer" className="inline-flex rounded-lg bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-500">
      Open BD71 YouTube channel
    </a>
  </section>
);

export default AddLiveForm;
