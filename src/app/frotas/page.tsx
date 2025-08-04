
'use client';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Truck } from 'lucide-react';

export default function FrotasPage() {
  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Frotas</h1>
          <p className="text-muted-foreground">Módulo em desenvolvimento.</p>
        </div>
      </div>
      <Card className="flex-grow">
        <CardContent className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <Truck className="w-24 h-24 text-muted-foreground/50" />
            <h2 className="text-2xl font-semibold">Módulo de Frotas</h2>
            <p className="text-muted-foreground max-w-md">
                Esta seção será dedicada ao gerenciamento e controle da frota de veículos e equipamentos.
            </p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
