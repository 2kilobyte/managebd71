export interface Tournament {
    _id: string;
    tournamentName: string;
    startingDate: string;
    endDate: string;
    tier: string;
    region: string;
    tournamentImage: string;
    prize: string;
    status: string;
    tournamentType: string; // Added tournamentType
    teamCodes: string[];
    totalMatch: number;
  };

export interface Player {
  ign: string;
  isLeader: boolean;
  discordName: string;
  fullName: string;
};

export interface Team {
  _id: string;
  teamName: string;
  isApproved: boolean;
  teamShortName: string;
  teamLogo: string;
  teamCode: string;
  mobileNumber: string;
  teamGameId: number;
  players: Player[];
  tournamentId: string;
  createdAt: string;
}