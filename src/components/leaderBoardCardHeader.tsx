import React from 'react'

interface LeaderBoardCardRow {
  rank: string
  team: string
  match: string
  placePTS: string
  kill: string
  totalPoints: string
}

interface LeaderBoardCardHeaderProps {
  data: LeaderBoardCardRow[]
}

const LeaderBoardCardHeader: React.FC<LeaderBoardCardHeaderProps> = ({ data }) => {
  return (
    <div className="overflow-x-auto rounded-lg shadow mb-4">
      <table className="min-w-full table-auto bg-[#24272c] text-white text-sm text-left">
        <thead>
          <tr className="bg-[#2c2f35]">
            <th className="px-4 py-3">Rank</th>
            <th className="px-4 py-3">Team</th>
            <th className="px-4 py-3">Matches</th>
            <th className="px-4 py-3">Place PTS</th>
            <th className="px-4 py-3">Kill</th>
            <th className="px-4 py-3">Total Points</th>
          </tr>
        </thead>
        <tbody>
          {data.map(({ rank, team, match, placePTS, kill, totalPoints }, index) => (
            <tr key={index} className="hover:bg-[#32363e] transition">
              <td className="px-4 py-3">{rank}</td>
              <td className="px-4 py-3">{team}</td>
              <td className="px-4 py-3">{match}</td>
              <td className="px-4 py-3">{placePTS}</td>
              <td className="px-4 py-3">{kill}</td>
              <td className="px-4 py-3">{totalPoints}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default LeaderBoardCardHeader
