'use client';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, FileText, Building, User, Trash2, MoreHorizontal, Eye, Edit, History, HardHat, ArrowLeft, ArrowDownUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, collection, getDocs, deleteDoc, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useLoading } from '@/hooks/use-loading';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


type Obra = {
  id: string;
  nome: string;
  cliente: string;
  encarregadoNome: string;
  montadores?: { id: string; nome: string }[];
};

type Checklist = {
  id: string;
  data: string;
  responsavel: string;
  status: string;
  formData: {
    numAndaime: string;
  }
};

type SortOption = 'num-asc' | 'num-desc' | 'date-desc' | 'date-asc';


function ObraDetailContent() {
  const router = useRouter();
  const params = useParams();
  const obraId = params.id as string;
  const { user } = useAuth();
  const { setIsLoading } = useLoading();
  const [obra, setObra] = useState<Obra | null>(null);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [sortOption, setSortOption] = useState<SortOption>('num-asc');

  
  const canCreateChecklist = user?.role === 'admin' || user?.role === 'gestor' || user?.role === 'encarregado';
  const canEditChecklist = user?.role === 'admin' || user?.role === 'gestor' || user?.role === 'encarregado';
  const canDeleteChecklist = user?.role === 'admin';


  const fetchObraDetails = useCallback(async () => {
    if (!obraId) return;
    setLoading(true);
    try {
      const obraDocRef = doc(db, 'obras', obraId);
      const obraDocSnap = await getDoc(obraDocRef);

      if (obraDocSnap.exists()) {
        setObra({ id: obraDocSnap.id, ...obraDocSnap.data() } as Obra);
      } else {
        toast({ variant: 'destructive', title: "Erro", description: "Obra não encontrada." });
        router.push('/obras');
        return;
      }

      const checklistsColRef = collection(db, 'obras', obraId, 'checklists');
      const querySnapshot = await getDocs(checklistsColRef);
      const checklistsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Checklist));
      
      setChecklists(checklistsList);

    } catch (error) {
      console.error("Erro ao buscar detalhes da obra: ", error);
      toast({ variant: 'destructive', title: "Erro", description: "Não foi possível carregar os dados da obra." });
    } finally {
      setLoading(false);
    }
  }, [obraId, router, toast]);

  useEffect(() => {
    fetchObraDetails();
  }, [fetchObraDetails]);
  
  const sortedChecklists = useMemo(() => {
    return [...checklists].sort((a, b) => {
      switch (sortOption) {
        case 'num-asc':
          return parseInt(a.formData.numAndaime, 10) - parseInt(b.formData.numAndaime, 10);
        case 'num-desc':
          return parseInt(b.formData.numAndaime, 10) - parseInt(a.formData.numAndaime, 10);
        case 'date-desc':
          return new Date(b.data).getTime() - new Date(a.data).getTime();
        case 'date-asc':
          return new Date(a.data).getTime() - new Date(b.data).getTime();
        default:
          return 0;
      }
    });
  }, [checklists, sortOption]);


  const handleDeleteChecklist = async (checklistId: string) => {
    try {
      const checklistDocRef = doc(db, 'obras', obraId, 'checklists', checklistId);
      await deleteDoc(checklistDocRef);
      
      const updatedChecklists = checklists.filter(c => c.id !== checklistId);
      setChecklists(updatedChecklists);

      toast({
          title: "Checklist Excluído",
          description: "O checklist foi removido com sucesso.",
      });
    } catch (error) {
        console.error("Erro ao excluir checklist: ", error);
        toast({
            variant: "destructive",
            title: "Erro",
            description: "Não foi possível excluir o checklist.",
        });
    }
  };
  
  const handleNavigate = (path: string) => {
      setIsLoading(true);
      router.push(path);
  }


  if (loading) {
      return (
          <>
            <Skeleton className="h-8 w-1/2 mb-2" />
            <Skeleton className="h-4 w-1/3 mb-6" />
            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-1 space-y-6">
                    <Card>
                        <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                        <CardContent className="space-y-4">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-2">
                     <Card>
                        <CardHeader><Skeleton className="h-8 w-full" /></CardHeader>
                        <CardContent className="space-y-3">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </CardContent>
                    </Card>
                </div>
            </div>
          </>
      );
  }

  if (!obra) {
      return <p>Obra não encontrada.</p>
  }

  return (
        <>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-primary">{obra.cliente}</h1>
                    <p className="text-muted-foreground">{obra.nome}</p>
                </div>
                <Button variant="default" onClick={() => router.push('/obras')} className="transition-transform duration-300 ease-in-out hover:scale-105 bg-card hover:bg-card/90">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para Obras
                </Button>
            </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Informações</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="flex items-start">
                            <Building className="mr-3 mt-1 h-5 w-5 flex-shrink-0 opacity-80"/>
                            <div>
                                <p className="font-semibold">Obra</p>
                                <p>{obra.nome}</p>
                            </div>
                        </div>
                        <div className="flex items-start">
                            <User className="mr-3 mt-1 h-5 w-5 flex-shrink-0 opacity-80"/>
                            <div>
                                <p className="font-semibold">Encarregado</p>
                                <p>{obra.encarregadoNome}</p>
                            </div>
                        </div>
                        {obra.montadores && obra.montadores.length > 0 && (
                            <div className="flex items-start">
                                 <HardHat className="mr-3 mt-1 h-5 w-5 flex-shrink-0 opacity-80"/>
                                 <div>
                                    <p className="font-semibold">Equipe de Montadores</p>
                                    <ul className="list-disc list-inside">
                                        {obra.montadores.map(m => <li key={m.id}>{m.nome}</li>)}
                                    </ul>
                                 </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="md:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Ordens de Serviço / Checklists</CardTitle>
                    <CardDescription className="text-card-foreground">Lista de inspeções e ordens de serviço realizadas.</CardDescription>
                  </div>
                  {canCreateChecklist && (
                    <Button onClick={() => handleNavigate(`/obras/${obraId}/checklist/new`)} className="transition-transform duration-300 ease-in-out hover:scale-105 bg-primary-foreground text-black hover:bg-primary-foreground/80">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nova Ordem de Serviço
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                    <div className="flex justify-end mb-4">
                        <Select onValueChange={(value: SortOption) => setSortOption(value)} defaultValue={sortOption}>
                            <SelectTrigger className="w-[240px] bg-card text-card-foreground border-card-foreground/50">
                                <ArrowDownUp className="mr-2 h-4 w-4" />
                                <SelectValue placeholder="Ordenar por..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="num-asc">Número (Crescente)</SelectItem>
                                <SelectItem value="num-desc">Número (Decrescente)</SelectItem>
                                <SelectItem value="date-desc">Data (Mais Recente)</SelectItem>
                                <SelectItem value="date-asc">Data (Mais Antiga)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <ul className="space-y-3">
                        {sortedChecklists.map((checklist) => (
                            <li key={checklist.id} className="flex items-center justify-between rounded-lg border border-white bg-card text-white transition-colors hover:bg-white/10">
                               <div className='p-4 flex-grow flex items-center justify-between'>
                                    <div className="flex items-center">
                                        <FileText className="mr-4 h-6 w-6 text-white"/>
                                        <div>
                                            <p className="font-semibold text-white">Andaime #{checklist.formData.numAndaime} - {new Date(checklist.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                                            <p className="text-sm text-white/80">por {checklist.responsavel}</p>
                                        </div>
                                    </div>
                                    <Badge 
                                        variant={checklist.status === 'Não Conforme' ? 'destructive' : 'secondary'}
                                        className={cn(checklist.status !== 'Não Conforme' && 'text-black')}
                                    >
                                        {checklist.status}
                                    </Badge>
                               </div>
                               
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0 mr-2 text-white hover:bg-white/10 hover:text-white">
                                            <span className="sr-only">Abrir menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => handleNavigate(`/obras/${obraId}/checklist/${checklist.id}`)}>
                                            <Eye className="mr-2 h-4 w-4" /> Visualizar
                                        </DropdownMenuItem>
                                        {canEditChecklist && (
                                            <DropdownMenuItem onClick={() => handleNavigate(`/obras/${obraId}/checklist/${checklist.id}/edit`)}>
                                                <Edit className="mr-2 h-4 w-4" /> Editar
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem onClick={() => handleNavigate(`/obras/${obraId}/checklist/${checklist.id}/history`)}>
                                            <History className="mr-2 h-4 w-4" /> Histórico
                                        </DropdownMenuItem>
                                        {canDeleteChecklist && (
                                            <>
                                            <DropdownMenuSeparator />
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                                      <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                                    </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Esta ação não pode ser desfeita. Isso excluirá permanentemente o checklist e todo o seu histórico.
                                                    </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteChecklist(checklist.id)}>
                                                        Excluir
                                                    </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                            </>
                                         )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </li>
                        ))}
                        {sortedChecklists.length === 0 && (
                            <div className="text-center text-muted-foreground py-8">
                                <p>Nenhuma ordem de serviço criada ainda.</p>
                            </div>
                        )}
                    </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
  );
}

export default function ObraDetailPage() {
    return (
        <AppLayout>
            <ObraDetailContent />
        </AppLayout>
    );
}
