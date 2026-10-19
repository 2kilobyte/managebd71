import AddTournamentForm from '@/components/AddTournamentForm'
import Header from '@/components/Header'
import StickyButton from '@/components/StickyButton'
import React from 'react'

const AddTournament = () => {
  return (
    <div className="admin-shell">
        <Header />
        <main className="admin-content">
            <div className="page-heading"><p className="dashboard-kicker">Event setup</p><h1>Create tournament</h1><p>Configure the event details and scorer access keys.</p></div>
            <AddTournamentForm />
            <div className='w-full flex justify-center items-center mt-8'>
                <StickyButton title='Back' link={`/`} classNames='bg-[#463e3e] p-4 text-center rounded' />
            </div>
        </main>
    </div>
  )
}

export default AddTournament
