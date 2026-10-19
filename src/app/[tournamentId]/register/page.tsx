import Header from '@/components/Header';
import RegisterTeam from '@/components/RegisterTeam';
import React from 'react';


const RegisterPage = () => {
    return (
        <div className="admin-shell">
           <Header />
           <main className="admin-content"><div className="page-heading"><p className="dashboard-kicker">Tournament operations</p><h1>Add team</h1><p>Register a team directly to this tournament.</p></div><RegisterTeam /></main>
        </div>
    );
};

export default RegisterPage;
