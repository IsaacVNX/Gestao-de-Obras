
'use client';
import AppLayout from '@/components/AppLayout';
import { Suspense } from 'react';
import { CarrierManagement } from '@/app/expedicao/components/CarrierManagement';

function CadastrosTransportadorasContent() {
  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Cadastro de Transportadoras</h1>
        <p className="text-muted-foreground">Gerencie suas transportadoras.</p>
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
