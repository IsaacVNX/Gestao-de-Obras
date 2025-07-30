
'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { ChecklistForm } from '@/components/checklists/ChecklistForm';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

type ChecklistData = {
    id: string;
    formData: any;
    materials: any[];
};


export default function EditChecklistPage() {
  const params = useParams();
  const obraId = params.id as string;
  const checklistId = params.checklistId as string;
  const [checklistData, setChecklistData] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();


  useEffect(() => {
    async function fetchChecklist() {
        if (!obraId || !checklistId) return;
        setLoading(true);
        try {
            const checklistDocRef = doc(db, 'obras', obraId, 'checklists', checklistId);
            const docSnap = await getDoc(checklistDocRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setChecklistData({ 
                    id: docSnap.id, 
                    formData: data.formData,
                    materials: data.materials
                });
            } else {
                setChecklistData(null);
            }
        } catch (error) {
            console.error("Erro ao buscar checklist para edição:", error);
        } finally {
            setLoading(false);
        }
    }
    fetchChecklist();
  }, [obraId, checklistId]);

  if (loading) {
    return (
        <AppLayout>
            <Skeleton className="h-10 w-1/3 mb-4" />
            <Skeleton className="h-[80vh] w-full" />
        </AppLayout>
    )
  }

  if (!checklistData) {
     return (
        <AppLayout>
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Checklist não encontrado</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>O checklist que você está tentando editar não foi encontrado.</p>
                    <Button onClick={() => router.back()} className="mt-4">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                    </Button>
                </CardContent>
            </Card>
        </AppLayout>
    );
  }


  return (
    <AppLayout>
      <ChecklistForm 
        obraId={obraId} 
        checklistId={checklistId}
        initialData={checklistData.formData}
        initialMaterials={checklistData.materials}
      />
    </AppLayout>
  );
}
