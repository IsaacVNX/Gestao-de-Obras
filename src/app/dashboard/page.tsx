
'use client';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { HardHat, Users, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';
import { Skeleton } from '@/components/ui/skeleton';

const StatCard = ({ title, value, icon: Icon, description, loading, variant }: { title: string, value: string | number, icon: React.ElementType, description: string, loading: boolean, variant?: 'default' | 'destructive' }) => {
    const valueClasses = variant === 'destructive' ? 'text-destructive' : 'text-card-foreground';
    const iconClasses = variant === 'destructive' ? 'text-destructive' : 'text-card-foreground/70';

    return (
        <Card className="transition-transform duration-300 ease-in-out hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={`h-4 w-4 ${iconClasses}`} />
            </CardHeader>
            <CardContent>
                {loading ? (
                    <Skeleton className="h-10 w-1/2" />
                ) : (
                    <div className={`text-4xl font-bold ${valueClasses}`}>{value}</div>
                )}
                <p className="text-xs text-card-foreground/90">{description}</p>
            </CardContent>
        </Card>
    )
}


export default function DashboardPage() {
  const { user } = useAuth();
  const { stats, loading } = useDashboardStats();
  
  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Bem-vindo ao Dashboard, {user?.name.split(' ')[0]}!</h1>
        <p className="text-muted-foreground">Este é o resumo da sua atividade no sistema de Gestão de Obras.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
            title="Obras Ativas"
            value={stats.obrasCount}
            icon={HardHat}
            description="Total de obras em andamento"
            loading={loading}
        />
         <StatCard 
            title="Encarregados"
            value={stats.encarregadosCount}
            icon={Users}
            description="Total de encarregados cadastrados"
            loading={loading}
        />
        <StatCard 
            title="Checklists Hoje"
            value={stats.checklistsTodayCount}
            icon={ClipboardCheck}
            description="Checklists preenchidos hoje"
            loading={loading}
        />
        <StatCard 
            title="Não Conformidades"
            value={stats.nonConformitiesCount}
            icon={AlertTriangle}
            description="Itens fora do padrão este mês"
            loading={loading}
            variant='destructive'
        />
      </div>
    </AppLayout>
  );
}
