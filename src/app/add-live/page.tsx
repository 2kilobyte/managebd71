"use client";
import AddLiveForm from '@/components/AddLiveForm';
import Header from '@/components/Header';
import StickyButton from '@/components/StickyButton';
import { useParams } from 'next/navigation';

export default function AddLive() {
    const { tournamentId } = useParams()
    return (
        <div className="bg-[#18191D] text-white min-h-screen">
        <Header />
        <div className="container mx-auto p-4">
            <AddLiveForm />
            <div className='w-full flex justify-center items-center mt-8'>
                <StickyButton title='Back' link={`/${tournamentId}`} classNames='bg-[#463e3e] p-4 text-center rounded' />
            </div>
        </div>
        </div>
    );
}
