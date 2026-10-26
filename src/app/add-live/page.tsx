"use client";
import AddLiveForm from '@/components/AddLiveForm';
import Header from '@/components/Header';
import StickyButton from '@/components/StickyButton';
import { useParams } from 'next/navigation';

export default function AddLive() {
    const { tournamentId } = useParams()
    return (
        <div className="admin-shell text-white">
        <Header />
        <main className="admin-content">
            <div className="page-heading"><p className="dashboard-kicker">Broadcast</p><h1>YouTube live</h1><p>The tournament website automatically finds the active BD71 Esports broadcast.</p></div>
            <AddLiveForm />
            <div className='w-full flex justify-center items-center mt-8'>
                <StickyButton title='Back' link={`/${tournamentId}`} classNames='bg-[#463e3e] p-4 text-center rounded' />
            </div>
        </main>
        </div>
    );
}
