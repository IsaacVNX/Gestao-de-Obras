
'use client';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Truck, Building } from 'lucide-react';
import { Suspense } from 'react';
import { useRouter } from 'next/navigation';


function ExpedicaoContent() {
  const router = useRouter();

  // Redirect to the client page for now as it's the main function here
  // In the future, this can be a dashboard.
  // router.push('/cadastros/clientes');

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Painel de Expedição</h1>
        <p className="text-muted-foreground">Visão geral da logística e cadastros.</p>
      </div>

       <Card className="flex-grow mt-4">
          <CardContent className="flex flex-col items-center justify-center h-full gap-4 text-center p-6">
              <Truck className="w-24 h-24 text-muted-foreground/50" />
              <h2 className="text-2xl font-semibold">Módulo de Expedição</h2>
              <p className="text-muted-foreground max-w-md">
                  Esta seção será dedicada ao controle de expedição de materiais e equipamentos para as obras, incluindo logística e rastreamento.
              </p>
          </CardContent>
        </Card>
    </AppLayout>
  );
}

export default function ExpedicaoPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <ExpedicaoContent />
        </Suspense>
    );
}
