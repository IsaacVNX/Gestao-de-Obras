
'use client';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

type Stats = {
    obrasCount: number;
    encarregadosCount: number;
    checklistsTodayCount: number;
    nonConformitiesCount: number;
};

export function useDashboardStats() {
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats>({
      obrasCount: 0,
      encarregadosCount: 0,
      checklistsTodayCount: 0,
      nonConformitiesCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        // Fetch Obras Count
        const obrasCollection = collection(db, 'obras');
        const obrasSnapshot = await getDocs(obrasCollection);
        const obrasCount = obrasSnapshot.size;

        // Fetch Encarregados Count (active users with 'encarregado' role)
        const usersCollection = collection(db, 'usuarios');
        const encarregadosQuery = query(
            usersCollection, 
            where('role', '==', 'encarregado'),
            where('status', '==', 'ativo')
        );
        const encarregadosSnapshot = await getDocs(encarregadosQuery);
        const encarregadosCount = encarregadosSnapshot.size;

        // Note: The following are placeholders as the data model doesn't support them yet.
        // We will set them to static values for now.
        const checklistsTodayCount = 0; // Placeholder
        const nonConformitiesCount = 0; // Placeholder

        setStats({
          obrasCount,
          encarregadosCount,
          checklistsTodayCount,
          nonConformitiesCount,
        });

      } catch (error) {
        console.error("Erro ao buscar estatísticas do dashboard: ", error);
        toast({
            variant: 'destructive',
            title: 'Erro no Dashboard',
            description: 'Não foi possível carregar as estatísticas.'
        })
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [toast]);

  return { stats, loading };
}
