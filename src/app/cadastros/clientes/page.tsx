
'use client';
import AppLayout from '@/components/AppLayout';
import { Suspense } from 'react';
import { ClientManagement } from '@/app/expedicao/components/ClientManagement';

function CadastrosClientesContent() {
  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Cadastro de Clientes</h1>
        <p className="text-muted-foreground">Gerencie seus clientes.</p>
      </div>
      <ClientManagement />
    </AppLayout>
  );
}

export default function CadastrosClientesPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <CadastrosClientesContent />
        </Suspense>
    );
}
