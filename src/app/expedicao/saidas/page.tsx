
'use client';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { LogOut } from 'lucide-react';

export default function SaidasPage() {
  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Registro de Saídas no Estoque</h1>
          <p className="text-muted-foreground">Módulo em desenvolvimento.</p>
        </div>
      </div>
      <Card className="flex-grow">
        <CardContent className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <LogOut className="w-24 h-24 text-muted-foreground/50 scale-x-[-1]" />
            <h2 className="text-2xl font-semibold">Módulo de Saídas</h2>
            <p className="text-muted-foreground max-w-md">
                Esta seção será dedicada ao registro de todas as saídas de materiais, ferramentas e equipamentos do estoque para as obras.
            </p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
