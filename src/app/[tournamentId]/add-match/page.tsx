"use client";
import AddMatchForm from '@/components/AddMatchFrom';
import Header from '@/components/Header';
import StickyButton from '@/components/StickyButton';
import { useParams } from 'next/navigation';

export default function AddMatch() {
    const { tournamentId } = useParams()
    return (
        <div className="admin-shell text-white">
        <Header />
        <main className="admin-content">
            <div className="page-heading"><p className="dashboard-kicker">Tournament setup</p><h1>Add match</h1><p>Link a PUBG match to this tournament.</p></div>
            <AddMatchForm />
            <div className='w-full flex justify-center items-center mt-8'>
                <StickyButton title='Back' link={`/${tournamentId}`} classNames='bg-[#463e3e] p-4 text-center rounded' />
            </div>
        </main>
        </div>
    );
}
