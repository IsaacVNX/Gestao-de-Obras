
'use client';
import AppLayout from '@/components/AppLayout';
import { ChecklistForm } from '@/components/checklists/ChecklistForm';
import { useParams } from 'next/navigation';

export default function NovoChecklistPage() {
  const params = useParams();
  const obraId = params.id as string;
  return (
    <AppLayout>
      <ChecklistForm obraId={obraId} />
    </AppLayout>
  );
}
