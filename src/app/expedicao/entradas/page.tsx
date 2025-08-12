
'use client';
import AppLayout from '@/components/AppLayout';
import { Suspense } from 'react';
import { EntryManagement } from './components/EntryManagement';


export default function EntradasPage() {
  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Registro de Entradas no Estoque</h1>
          <p className="text-muted-foreground">Acompanhe todos os produtos que entram no estoque da expedição.</p>
        </div>
      </div>
      <Suspense fallback={<div>Carregando...</div>}>
        <EntryManagement />
      </Suspense>
    </AppLayout>
  );
}
