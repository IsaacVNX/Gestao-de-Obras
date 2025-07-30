
'use client';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { PlusCircle, User, HardHat, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogTrigger, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useRouter } from 'next/navigation';
import { useLoading } from '@/hooks/use-loading';

type Obra = {
  id: string;
  nome: string;
  cliente: string;
  encarregadoId: string;
  encarregadoNome: string;
  montadores?: { id: string; nome: string }[];
  checklistCount?: number;
};

const obraSchema = z.object({
  nomeCliente: z.string().min(1, { message: "O nome do cliente é obrigatório." }),
  nomeObra: z.string().min(1, { message: "O nome da obra é obrigatório." }),
  encarregadoId: z.string().min(1, { message: "Selecione um encarregado." }),
  selectedMontadores: z.array(z.string()).optional(),
});

type UserSelection = {
    id: string;
    nome: string;
};

// Função para criar um 'slug' a partir de uma string
const createSlug = (text: string) => {
    return text
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '');
};

function NovaObraForm({ setDialogOpen, refreshObras }: { setDialogOpen: (open: boolean) => void, refreshObras: () => void }) {
    const { toast } = useToast();
    
    const [encarregados, setEncarregados] = useState<UserSelection[]>([]);
    const [montadores, setMontadores] = useState<UserSelection[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const form = useForm<z.infer<typeof obraSchema>>({
        resolver: zodResolver(obraSchema),
        defaultValues: {
            nomeCliente: '',
            nomeObra: '',
            encarregadoId: '',
            selectedMontadores: [],
        }
    });

    useEffect(() => {
        async function fetchUsers() {
            setLoading(true);
            try {
                const usersQuery = query(
                    collection(db, 'usuarios'), 
                    where('status', '==', 'ativo')
                );
                const querySnapshot = await getDocs(usersQuery);
                
                const encarregadosList: UserSelection[] = [];
                const montadoresList: UserSelection[] = [];

                querySnapshot.forEach(doc => {
                    const data = doc.data();
                    const user = { id: doc.id, nome: `${data.firstName} ${data.lastName}` };
                    if (data.role === 'encarregado') {
                        encarregadosList.push(user);
                    } else if (data.role === 'montador') {
                        montadoresList.push(user);
                    }
                });
                
                setEncarregados(encarregadosList);
                setMontadores(montadoresList);

            } catch (error) {
                console.error("Erro ao buscar usuários: ", error);
                toast({
                    variant: 'destructive',
                    title: 'Erro',
                    description: 'Não foi possível carregar la lista de usuários.'
                })
            } finally {
                setLoading(false);
            }
        }
        fetchUsers();
    }, [toast]);
    
    const handleSubmit = async (formData: z.infer<typeof obraSchema>) => {
        setSaving(true);
        const encarregadoSelecionado = encarregados.find(enc => enc.id === formData.encarregadoId);
        const montadoresSelecionados = montadores.filter(m => formData.selectedMontadores?.includes(m.id));
        
        const obraSlug = createSlug(formData.nomeCliente);
        if (!obraSlug) {
             toast({
                variant: 'destructive',
                title: 'Nome do Cliente Inválido',
                description: 'O nome do cliente não pode ficar vazio ou conter apenas caracteres especiais.'
            });
            setSaving(false);
            return;
        }

        try {
            // Verificar se já existe uma obra com este slug/ID
            const obraDocRef = doc(db, 'obras', obraSlug);
            const docSnap = await getDoc(obraDocRef);
            if (docSnap.exists()) {
                toast({
                    variant: 'destructive',
                    title: 'Obra Duplicada',
                    description: 'Uma obra com este nome de cliente já existe. Por favor, use um nome diferente ou adicione um diferenciador.'
                });
                setSaving(false);
                return;
            }

            // Se não existe, cria a nova obra com o ID customizado
            await setDoc(obraDocRef, {
                cliente: formData.nomeCliente,
                nome: formData.nomeObra,
                encarregadoId: formData.encarregadoId,
                encarregadoNome: encarregadoSelecionado?.nome,
                montadores: montadoresSelecionados,
            });

            toast({
                title: "Sucesso!",
                description: "A nova obra foi criada e adicionada à lista."
            });
            refreshObras();
            setDialogOpen(false);
        } catch (error) {
            console.error("Erro ao criar obra: ", error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível salvar a nova obra.'
            });
        } finally {
            setSaving(false);
        }
    };
    
    const inputStyle = "bg-transparent border-primary-foreground/50 text-primary-foreground placeholder:text-primary-foreground/70";
    const selectTriggerStyle = "bg-transparent border-primary-foreground/50 text-primary-foreground";


    return (
        <div className="pt-0 max-h-[80vh] overflow-y-auto custom-scrollbar p-1 nova-obra-form-autofill">
            {loading ? (
                <div className="space-y-6 p-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ) : (
            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField control={form.control} name="nomeCliente" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-primary-foreground">Nome do Cliente</FormLabel>
                        <FormControl><Input {...field} className={inputStyle} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="nomeObra" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-primary-foreground">Nome da Obra</FormLabel>
                        <FormControl><Input {...field} className={inputStyle} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="encarregadoId" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-primary-foreground">Encarregado Responsável</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger className={selectTriggerStyle}>
                                    <SelectValue placeholder="Selecione um encarregado" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white text-black">
                                {encarregados.map((enc) => (
                                    <SelectItem key={enc.id} value={enc.id} className="focus:text-black">{enc.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}/>
                
                <Separator className="bg-primary-foreground/20" />
                
                <FormField control={form.control} name="selectedMontadores" render={() => (
                    <FormItem>
                        <div>
                            <FormLabel className="text-primary-foreground">Equipe de Montadores</FormLabel>
                              <p className="text-sm text-primary-foreground/80">Selecione os montadores que farão parte desta obra.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-60 overflow-y-auto p-4 border rounded-md custom-scrollbar border-primary-foreground/50">
                            {montadores.length > 0 ? montadores.map(montador => (
                                <FormField
                                    key={montador.id}
                                    control={form.control}
                                    name="selectedMontadores"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    className="border-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:text-primary"
                                                    checked={field.value?.includes(montador.id)}
                                                    onCheckedChange={(checked) => {
                                                        return checked
                                                        ? field.onChange([...(field.value || []), montador.id])
                                                        : field.onChange(field.value?.filter(id => id !== montador.id))
                                                    }}
                                                />
                                            </FormControl>
                                            <FormLabel className="font-normal text-primary-foreground">{montador.nome}</FormLabel>
                                        </FormItem>
                                    )}
                                />
                            )) : (
                                <p className="text-sm text-primary-foreground/80 col-span-2 text-center">Nenhum montador ativo encontrado.</p>
                            )}
                        </div>
                        <FormMessage />
                    </FormItem>
                )}/>

                <div className="flex justify-end gap-2 pt-4">
                    <DialogClose asChild>
                       <Button type="button" variant="ghost" className="hover:bg-primary-foreground/10 hover:text-black text-primary-foreground" disabled={saving}>Cancelar</Button>
                    </DialogClose>
                    <Button type="submit" variant="secondary" className="text-black" disabled={saving}>
                        {saving ? "Salvando..." : "Salvar Obra"}
                    </Button>
                </div>
            </form>
            </Form>
            )}
        </div>
    )
}

function ObrasPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { setIsLoading } = useLoading();
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);

  const fetchObras = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const obrasCollection = collection(db, 'obras');
      let obrasQuery;

      if (user.role === 'admin' || user.role === 'gestor' || user.role === 'escritorio') {
        obrasQuery = query(obrasCollection);
      } else if (user.role === 'encarregado') {
        obrasQuery = query(obrasCollection, where('encarregadoId', '==', user.id));
      } else {
          const q1 = query(obrasCollection, where('montadores', 'array-contains', { id: user.id, nome: user.name }));
          const q2 = query(obrasCollection, where('encarregadoId', '==', user.id)); 

          const [montadorObrasSnap, encarregadoObrasSnap] = await Promise.all([getDocs(q1), getDocs(q2)]);
          
          const obrasMap = new Map();
          montadorObrasSnap.forEach(doc => obrasMap.set(doc.id, { id: doc.id, ...doc.data() }));
          encarregadoObrasSnap.forEach(doc => obrasMap.set(doc.id, { id: doc.id, ...doc.data() }));
          
          const combinedObras = Array.from(obrasMap.values()) as Obra[];
          
          const obrasWithChecklistCount = await Promise.all(combinedObras.map(async (obra) => {
              const checklistsSnapshot = await getDocs(collection(db, 'obras', obra.id, 'checklists'));
              return { ...obra, checklistCount: checklistsSnapshot.size };
          }));

          setObras(obrasWithChecklistCount);
          setLoading(false);
          return;
      }
      
      const querySnapshot = await getDocs(obrasQuery);
      const obrasList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Obra));

      const obrasWithChecklistCount = await Promise.all(obrasList.map(async (obra) => {
          const checklistsSnapshot = await getDocs(collection(db, 'obras', obra.id, 'checklists'));
          return { ...obra, checklistCount: checklistsSnapshot.size };
      }));
      
      setObras(obrasWithChecklistCount);

    } catch (error) {
      console.error("Erro ao buscar obras: ", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      fetchObras();
    }
  }, [user]);

  const canCreateObra = user?.role === 'admin' || user?.role === 'gestor';

  return (
    <>
        <div className="flex items-center justify-between mb-6">
            <div>
            <h1 className="text-3xl font-bold">Gerenciamento de Obras</h1>
            <p className="text-muted-foreground">Visualize e gerencie as obras em andamento.</p>
            </div>
            {canCreateObra && (
            <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                    <Button onClick={() => setDialogOpen(true)} className="transition-all duration-300 ease-in-out hover:scale-105 bg-card text-card-foreground hover:bg-card/90">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Criar Nova Obra
                    </Button>
                </DialogTrigger>
                <DialogContent className="p-0 max-w-2xl bg-card text-card-foreground border-border/20">
                    <DialogHeader className="p-6 pb-0">
                        <DialogTitle className="text-card-foreground">Criar Nova Obra</DialogTitle>
                        <DialogDescription className="text-card-foreground/80">
                            Preencha os detalhes da nova obra abaixo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="p-6 pt-4">
                    <NovaObraForm setDialogOpen={setDialogOpen} refreshObras={fetchObras} />
                    </div>
                </DialogContent>
            </Dialog>
            )}
        </div>

        {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                <Card key={i}>
                    <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                    </CardContent>
                    <CardFooter>
                    <Skeleton className="h-10 w-full" />
                    </CardFooter>
                </Card>
                ))}
            </div>
        ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {obras.map((obra) => (
                <Card key={obra.id} className="flex flex-col hover:shadow-xl transition-transform duration-300 ease-in-out hover:scale-105">
                <CardHeader>
                    <CardTitle className="leading-tight text-card-foreground font-bold">{obra.cliente}</CardTitle>
                    <CardDescription className="text-card-foreground">{obra.nome}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-3 text-sm">
                    <div className="flex items-start">
                    <User className="mr-3 mt-1 h-4 w-4 flex-shrink-0 opacity-80" />
                    <span className="flex-1">Responsável: {obra.encarregadoNome}</span>
                    </div>
                    {obra.montadores && obra.montadores.length > 0 && (
                        <div className="flex items-start">
                            <HardHat className="mr-3 mt-1 h-4 w-4 flex-shrink-0 opacity-80" />
                            <span className="flex-1">{obra.montadores.length} montador(es) na equipe</span>
                        </div>
                    )}
                    <div className="flex items-start">
                        <FileText className="mr-3 mt-1 h-4 w-4 flex-shrink-0 opacity-80" />
                        <span className="flex-1">{obra.checklistCount} checklist(s)</span>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button variant="secondary" className="w-full text-black hover:bg-primary hover:text-primary-foreground hover:border hover:border-white hover:border hover:border-primary-foreground" onClick={() => { setIsLoading(true); router.push(`/obras/${obra.id}`) }}>
                        Ver Detalhes
                    </Button>
                </CardFooter>
                </Card>
            ))}
            </div>
        )}

        {!loading && obras.length === 0 && (
            <div className="text-center text-muted-foreground py-16">
                <p className="text-lg">Nenhuma obra encontrada.</p>
                {canCreateObra ? 
                <p>Crie uma nova obra para começar.</p> :
                <p>Nenhuma obra foi atribuída a você ainda.</p>
                }
            </div>
        )}
    </>
  );
}

export default function ObrasPage() {
    return (
        <AppLayout>
            <ObrasPageContent />
        </AppLayout>
    );
}
