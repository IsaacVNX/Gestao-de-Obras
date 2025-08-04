
'use client';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { Suspense } from 'react';

function RhContent() {
  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Painel de RH</h1>
        <p className="text-muted-foreground">Visão geral dos recursos humanos.</p>
      </div>
      <Card className="flex-grow mt-4">
        <CardContent className="flex flex-col items-center justify-center h-full gap-4 text-center p-6">
            <Users className="w-24 h-24 text-muted-foreground/50" />
            <h2 className="text-2xl font-semibold">Módulo de Recursos Humanos</h2>
            <p className="text-muted-foreground max-w-md">
                Esta seção será dedicada ao gerenciamento de funcionários, permissões, folhas de ponto e outras funcionalidades relacionadas ao RH.
            </p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}

export default function RHPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <RhContent />
        </Suspense>
    );
}
