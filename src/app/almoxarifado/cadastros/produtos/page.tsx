
'use client';
import AppLayout from '@/components/AppLayout';
import { Suspense } from 'react';
import { ProductManagement } from './components/ProductManagement';

function CadastrosProdutosContent() {
  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Cadastro de Produtos (Almoxarifado)</h1>
        <p className="text-muted-foreground">Gerencie os produtos do estoque do almoxarifado.</p>
      </div>
      <ProductManagement />
    </AppLayout>
  );
}

export default function CadastrosProdutosPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <CadastrosProdutosContent />
        </Suspense>
    );
}
