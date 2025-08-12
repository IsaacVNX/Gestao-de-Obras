
'use client';
import AppLayout from '@/components/AppLayout';
import { Suspense } from 'react';
import { SupplierManagement } from './components/SupplierManagement';

function CadastrosFornecedoresContent() {
  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Cadastro de Fornecedores (Almoxarifado)</h1>
        <p className="text-muted-foreground">Gerencie seus fornecedores do almoxarifado.</p>
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
