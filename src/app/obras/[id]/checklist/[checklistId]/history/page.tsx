
'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, GitCommitHorizontal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, getDocs, orderBy, query, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

type Version = {
  id: string;
  savedAt: string;
  savedBy: string;
};

type ChecklistData = {
    formData: {
      numAndaime: string;
    }
};

export default function HistoryPage() {
  const router = useRouter();
  const params = useParams();
  const obraId = params.id as string;
  const checklistId = params.checklistId as string;

  const [versions, setVersions] = useState<Version[]>([]);
  const [checklist, setChecklist] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      if (!obraId || !checklistId) return;
      setLoading(true);
      try {
         // Fetch checklist info
        const checklistDocRef = doc(db, 'obras', obraId, 'checklists', checklistId);
        const checklistSnap = await getDoc(checklistDocRef);
        if (checklistSnap.exists()) {
            setChecklist(checklistSnap.data() as ChecklistData);
        }

        // Fetch versions
        const versionsColRef = collection(db, 'obras', obraId, 'checklists', checklistId, 'versions');
        const versionsQuery = query(versionsColRef, orderBy('savedAt', 'desc'));
        const querySnapshot = await getDocs(versionsQuery);
        
        const versionsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Version));
        setVersions(versionsList);
        
      } catch (error) {
        console.error("Erro ao buscar histórico de versões:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [obraId, checklistId]);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold">Histórico de Versões</h1>
                <p className="text-muted-foreground">
                    Andaime nº {checklist?.formData.numAndaime || '...'}
                </p>
            </div>
            <Button variant="outline" onClick={() => router.push(`/obras/${obraId}`)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para a Obra
            </Button>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Versões Salvas</CardTitle>
                <CardDescription>
                    Cada linha representa uma versão salva do checklist. A mais recente está no topo.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : versions.length > 0 ? (
                    <ul className="space-y-3">
                        {versions.map((version, index) => (
                           <li key={version.id} className="border p-4 rounded-md hover:bg-muted/50 transition-colors bg-background">
                                <Link href={`/obras/${obraId}/checklist/${checklistId}/history/${version.id}`} className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <GitCommitHorizontal className="h-5 w-5 mr-4 text-primary" />
                                        <div>
                                            <p className="font-semibold">
                                                Versão #{versions.length - index} 
                                                <span className="font-normal text-muted-foreground"> (salva em {new Date(version.savedAt).toLocaleString('pt-BR')})</span>
                                            </p>
                                            <p className="text-sm text-muted-foreground">Salvo por: {version.savedBy}</p>
                                        </div>
                                    </div>
                                    <Button variant="secondary" size="sm">Ver Detalhes</Button>
                                </Link>
                           </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-10">
                        <p className="text-muted-foreground">Nenhuma versão anterior encontrada.</p>
                        <p className="text-sm text-muted-foreground">O histórico é criado quando um checklist é editado.</p>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
