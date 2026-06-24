'use client';

import React from 'react';
import toast from 'react-hot-toast';

type DownloadKeysProps = {
  data: string[];
};

const DownloadKeys: React.FC<DownloadKeysProps> = ({ data }) => {
  const handleDownload = () => {
    const toastId = toast.loading('Preparing download...');

    try {
      const fileContent = data.join('\n');
      const blob = new Blob([fileContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'keys.txt';
      a.click();

      URL.revokeObjectURL(url);

      toast.success('Download started!', { id: toastId });
    } catch (error) {
      console.error('Error downloading keys file:', error);
      toast.error('Failed to download file.', { id: toastId });
    }
  };

  return (
    <button
      onClick={handleDownload}
      className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-3xl cursor-pointer transition'
    >
      Download Team Codes
    </button>
  );
};

export default DownloadKeys;
