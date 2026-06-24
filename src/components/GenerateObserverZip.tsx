'use client';

import React from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Team } from '@/lib/shareInterface';
import toast from 'react-hot-toast'; // ✅ import toast

type Props = {
  teams: Team[];
};

const generateRandomColor = (): string => {
  const r = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
  const g = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
  const b = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
  return `${r}${g}${b}ff`;
};

const createNumberImage = async (number: number): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 290px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(number.toString(), canvas.width / 2, canvas.height / 2);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
    }, 'image/png');
  });
};

const GenerateObserverZip: React.FC<Props> = ({ teams }) => {
  const handleGenerate = async () => {
    const toastId = toast.loading('Generating observer files...');

    try {
      const zip = new JSZip();
      const imagesFolder = zip.folder('TeamIcon');

      const csvLines: string[] = [
        'TeamNumber,TeamName,TeamShortName,ImageFileName,TeamColor',
        '1,1,1,1.png,',
        '2,2,2,2.png,',
      ];

      const placeholder1 = await createNumberImage(1);
      const placeholder2 = await createNumberImage(2);
      imagesFolder?.file('1.png', placeholder1);
      imagesFolder?.file('2.png', placeholder2);

      const totalSlots = 100;

      for (let i = 3; i <= totalSlots; i++) {
        const teamIndex = i - 3;
        const hasTeam = teamIndex < teams.length;
        const imageFileName = `${i}.png`;
        const teamColor = generateRandomColor();

        if (hasTeam) {
          const team = teams[teamIndex];
          csvLines.push(`${i},${team.teamName},${team.teamShortName},${imageFileName},${teamColor}`);

          try {
            const res = await fetch(team.teamLogo);
            if (!res.ok) throw new Error('Image fetch failed');
            const blob = await res.blob();
            imagesFolder?.file(imageFileName, blob);
          } catch (err) {
            toast.error(`Failed to fetch logo for ${team.teamName}`, { id: toastId });
            const placeholder = await createNumberImage(i);
            imagesFolder?.file(imageFileName, placeholder);
          }
        } else {
          csvLines.push(`${i},${i},${i},${imageFileName},${teamColor}`);
          const placeholder = await createNumberImage(i);
          imagesFolder?.file(imageFileName, placeholder);
        }
      }

      zip.file('Teaminfo.csv', csvLines.join('\n'));

      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, 'observer-files.zip');

      toast.success('Observer files generated successfully!', { id: toastId });
    } catch (error) {
      toast.error('Failed to generate observer files.', { id: toastId });
    }
  };

  return (
    <button
      className='bg-purple-700 px-6 py-2 rounded-3xl cursor-pointer'
      onClick={handleGenerate}
    >
      Generate Observer files
    </button>
  );
};

export default GenerateObserverZip;
