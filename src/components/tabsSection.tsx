"use client"
import React, { useState } from 'react'
import LeaderBoardCardHeader from './leaderBoardCardHeader'


const tabItems = ['LEADERBOARDS', 'TEAMS', 'MATCHES', 'TEAM STATS', 'PLAYER STATS']

const TabsSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState('LEADERBOARDS')
  const leaderboardData = [
  { rank: "1", team: "Team Alpha", match: "5", placePTS: "100", kill: "30", totalPoints: "130" },
  { rank: "2", team: "Team Bravo", match: "5", placePTS: "90", kill: "25", totalPoints: "115" },
  { rank: "3", team: "Team Charlie", match: "5", placePTS: "80", kill: "20", totalPoints: "100" },
]


  return (
    <div className="w-full bg-[#1A1A1A]">
      {/* Tab Navigation */}
      <div className="flex justify-between px-6 md:px-10 text-sm font-semibold text-white border-b border-yellow-500">
        {tabItems.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 text-center transition-all duration-300 ${
              activeTab === tab
                ? 'text-yellow-500 border-b-2 border-yellow-500'
                : 'text-gray-400 hover:text-yellow-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6 text-white">
        {   activeTab === 'LEADERBOARDS' && 
            <div>
                <LeaderBoardCardHeader data={leaderboardData} />
            </div>
        }
        {activeTab === 'MATCHES' && <div>📅 Match schedule/details here...</div>}
        {activeTab === 'TEAMS' && <div>📊 Team statistics go here...</div>}
        {activeTab === 'TEAM STATS' && <div>📊 Team statistics go here...</div>}
        {activeTab === 'PLAYER STATS' && <div>👤 Player data and stats...</div>}
      </div>
    </div>
  )
}

export default TabsSection
