
'use client';
import AppLayout from '@/components/AppLayout';
import { Suspense } from 'react';
import { SupplierManagement } from '@/app/expedicao/components/SupplierManagement';

function CadastrosFornecedoresContent() {
  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Cadastro de Fornecedores</h1>
        <p className="text-muted-foreground">Gerencie seus fornecedores.</p>
      </div>
      <SupplierManagement />
    </AppLayout>
  );
}

export default function CadastrosFornecedoresPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <CadastrosFornecedoresContent />
        </Suspense>
    );
}
