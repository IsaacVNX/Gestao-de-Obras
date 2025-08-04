
'use client';
import AppLayout from '@/components/AppLayout';
import { Suspense } from 'react';
import { UserManagement } from '@/app/rh/components/UserManagement';

function UsuariosContent() {
  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gerenciamento de Usuários</h1>
        <p className="text-muted-foreground">Adicione, edite e gerencie os usuários do sistema.</p>
      </div>
      <UserManagement />
    </AppLayout>
  );
}

export default function UsuariosPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <UsuariosContent />
        </Suspense>
    );
}
