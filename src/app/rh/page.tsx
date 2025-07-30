
'use client';
import AppLayout from '@/components/AppLayout';
import { Suspense } from 'react';
import { UserManagement } from './components/UserManagement';


function RhContent() {

    return (
        <AppLayout>
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Recursos Humanos (RH)</h1>
                <p className="text-muted-foreground">Gerencie as informações e cadastros da sua equipe.</p>
            </div>
            <UserManagement />
        </AppLayout>
    );
}


export default function RHPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <RhContent />
        </Suspense>
    );
}
