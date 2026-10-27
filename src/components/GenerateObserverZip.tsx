'use client';

import React, { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Team } from '@/lib/shareInterface';
import toast from 'react-hot-toast';

type Props = { teams: Team[] };

const FIRST_TEAM_ID = 3;
const LAST_TEAM_ID = 100;

const generateRandomColor = (): string => {
  const r = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
  const g = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
  const b = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
  return `${r}${g}${b}ff`;
};

const getObserverTeamColor = (team: Team): string => {
  const hex = (team.teamColor ?? '').trim().replace(/^#/, '');
  return /^[0-9a-fA-F]{6}$/.test(hex) ? `${hex.toLowerCase()}ff` : generateRandomColor();
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

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not create placeholder team icon')), 'image/png');
  });
};

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function imageExtension(contentType: string, url: string): string {
  const mime = contentType.split(';')[0].trim().toLowerCase();
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';

  try {
    const pathname = new URL(url).pathname;
    const extension = pathname.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
    if (extension === 'jpeg') return 'jpg';
    if (extension && ['jpg', 'png', 'webp', 'gif'].includes(extension)) return extension;
  } catch {
    // Invalid URLs are handled by the download fallback.
  }
  return 'png';
}

async function addTeamImage(folder: JSZip, team: Team, teamGameId: number, onFallback: (teamName: string) => void): Promise<string> {
  const fallbackName = `${teamGameId}.png`;
  if (!team.teamLogo) {
    onFallback(team.teamName || `Team ${teamGameId}`);
    folder.file(fallbackName, await createNumberImage(teamGameId));
    return fallbackName;
  }

  try {
    const response = await fetch(team.teamLogo);
    if (!response.ok) throw new Error(`Image request returned ${response.status}`);
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) throw new Error('The team logo URL did not return an image');

    const extension = imageExtension(blob.type, team.teamLogo);
    const fileName = `${teamGameId}.${extension}`;
    folder.file(fileName, blob);
    return fileName;
  } catch (error) {
    console.warn(`Could not download observer logo for ${team.teamName} (team ${teamGameId}):`, error);
    onFallback(team.teamName || `Team ${teamGameId}`);
    folder.file(fallbackName, await createNumberImage(teamGameId));
    return fallbackName;
  }
}

const GenerateObserverZip: React.FC<Props> = ({ teams }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (isGenerating) return;
    const toastId = toast.loading('Generating observer files...');
    setIsGenerating(true);

    try {
      const missingLogos: string[] = [];
      const sortedTeams = [...teams].sort((a, b) => Number(a.teamGameId) - Number(b.teamGameId));
      const teamsByGameId = new Map<number, Team>();

      for (const team of sortedTeams) {
        const id = Number(team.teamGameId);
        if (!Number.isInteger(id) || id < FIRST_TEAM_ID || id > LAST_TEAM_ID) {
          throw new Error(`${team.teamName} has an invalid Team Game ID (${team.teamGameId}). Expected ${FIRST_TEAM_ID}–${LAST_TEAM_ID}.`);
        }
        if (teamsByGameId.has(id)) {
          throw new Error(`Team Game ID ${id} is assigned to more than one team. Fix the duplicate before exporting.`);
        }
        teamsByGameId.set(id, team);
      }

      const zip = new JSZip();
      const imagesFolder = zip.folder('TeamIcon');
      if (!imagesFolder) throw new Error('Could not create TeamIcon folder.');

      const csvLines: string[] = [
        'TeamNumber,TeamName,TeamShortName,ImageFileName,TeamColor',
        '1,,,1.png,',
        '2,,,2.png,',
      ];
      imagesFolder.file('1.png', await createNumberImage(1));
      imagesFolder.file('2.png', await createNumberImage(2));

      for (let id = FIRST_TEAM_ID; id <= LAST_TEAM_ID; id++) {
        const team = teamsByGameId.get(id);
        if (!team || team.isDisqualified === true) {
          const placeholderName = `${id}.png`;
          csvLines.push([id, '', '', placeholderName, ''].map(csvCell).join(','));
          imagesFolder.file(placeholderName, await createNumberImage(id));
          continue;
        }

        const color = getObserverTeamColor(team);
        const imageFileName = await addTeamImage(imagesFolder, team, id, (teamName) => missingLogos.push(teamName));
        csvLines.push([
          id,
          team.teamName || team.teamShortName || id,
          team.teamShortName || team.teamName || id,
          imageFileName,
          color,
        ].map(csvCell).join(','));
      }

      zip.file('Teaminfo.csv', `${csvLines.join('\r\n')}\r\n`);
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, 'observer-files.zip');
      if (missingLogos.length) {
        toast.error(`Observer files generated. Could not fetch logos for ${missingLogos.join(', ')}; numbered placeholder icons were used.`, { id: toastId, duration: 8000 });
      } else {
        toast.success('Observer files generated successfully!', { id: toastId });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate observer files.', { id: toastId, duration: 7000 });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-sm font-semibold text-violet-200 hover:bg-violet-500/20 disabled:cursor-wait disabled:opacity-60"
      onClick={handleGenerate}
      disabled={isGenerating}
    >
      {isGenerating ? 'Generating…' : 'Generate Observer files'}
    </button>
  );
};

export default GenerateObserverZip;
