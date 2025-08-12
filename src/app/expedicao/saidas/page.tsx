
'use client';
import AppLayout from '@/components/AppLayout';
import { Suspense } from 'react';
import { ExitManagement } from './components/ExitManagement';


export default function SaidasPage() {
  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Registro de Saídas do Estoque</h1>
          <p className="text-muted-foreground">Acompanhe todos os produtos que saem do estoque da expedição.</p>
        </div>
      </div>
       <Suspense fallback={<div>Carregando...</div>}>
        <ExitManagement />
      </Suspense>
    </AppLayout>
  );
}
