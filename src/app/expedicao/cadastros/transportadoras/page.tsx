
'use client';
import AppLayout from '@/components/AppLayout';
import { Suspense } from 'react';
import { CarrierManagement } from './components/CarrierManagement';

function CadastrosTransportadorasContent() {
  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Cadastro de Transportadoras (Expedição)</h1>
        <p className="text-muted-foreground">Gerencie suas transportadoras da expedição.</p>
      </div>
      <CarrierManagement />
    </AppLayout>
  );
}

export default function CadastrosTransportadorasPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <CadastrosTransportadorasContent />
        </Suspense>
    );
}
