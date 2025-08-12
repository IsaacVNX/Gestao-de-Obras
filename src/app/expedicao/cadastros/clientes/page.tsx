
'use client';
import AppLayout from '@/components/AppLayout';
import { Suspense } from 'react';
import { ClientManagement } from './components/ClientManagement';

function CadastrosClientesContent() {
  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Cadastro de Clientes (Expedição)</h1>
        <p className="text-muted-foreground">Gerencie seus clientes da expedição.</p>
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

    