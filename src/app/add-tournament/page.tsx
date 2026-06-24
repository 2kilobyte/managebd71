import AddTournamentForm from '@/components/AddTournamentForm'
import Header from '@/components/Header'
import StickyButton from '@/components/StickyButton'
import React from 'react'

const AddTournament = () => {
  return (
    <div>
        <Header />
        <div className="container mx-auto p-4">
            <AddTournamentForm />
            <div className='w-full flex justify-center items-center mt-8'>
                <StickyButton title='Back' link={`/`} classNames='bg-[#463e3e] p-4 text-center rounded' />
            </div>
        </div>
    </div>
  )
}

export default AddTournament