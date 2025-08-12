
'use client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Save, Trash2, PlusCircle, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField as RHFormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';


const materialSchema = z.object({
  tipo: z.string().min(1, 'A descrição é obrigatória.'),
  quantidade: z.string().min(1, 'A quantidade é obrigatória.'),
  metroLinear: z.string().min(1, 'O metro linear é obrigatório.'),
});

const checklistSchema = z.object({
    empresa: z.string().min(1, "O nome da empresa é obrigatório."),
    cnpj: z.string().optional(),
    ordemServico: z.string().min(1, "O número da O.S. é obrigatório."),
    solicitante: z.string().min(1, "O nome do solicitante é obrigatório."),
    orcamento: z.string().optional(),
    art: z.string().optional(),
    cliente: z.string().min(1, "O nome do cliente é obrigatório."),
    obra: z.string().min(1, "O nome da obra é obrigatório."),
    tipoAtendimento: z.string().min(1, "O tipo de atendimento é obrigatório."),
    tipoServico: z.string().min(1, "O tipo de serviço é obrigatório."),
    encarregado: z.string().min(1, "O nome do encarregado é obrigatório."),
    equipeResponsavel: z.string().min(1, "A equipe responsável é obrigatória."),
    localAtividade: z.string().min(1, "O local da atividade é obrigatório."),
    unidade: z.string().optional(),
    setor: z.string().optional(),
    equipamento: z.string().optional(),
    codigoEquipamento: z.string().optional(),
    numAndaime: z.string(),
    tipoMaterial: z.string().optional(),
    altura: z.string().optional(),
    largura: z.string().optional(),
    comprimento: z.string().optional(),
    tipoAndaime: z.string().optional(),
    mobilidade: z.string().optional(),
    metragemCubica: z.string().optional(),
    areaOcupada: z.string().optional(),
    inicioMontagem: z.string().optional(),
    fimMontagem: z.string().optional(),
    tempoGasto: z.string().optional(),
    previsaoDesmontagem: z.string().optional(),
    descricao: z.string().optional(),
    observacoes: z.string().optional(),
    materials: z.array(materialSchema).optional()
});


const FormSection = ({ title, children, cols = 4 }: { title: string, children: React.ReactNode, cols?: number }) => (
    <div className="mb-6">
        <h3 className="text-lg font-semibold border-b pb-2 mb-4 text-foreground">{title}</h3>
        <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-4`}>
            {children}
        </div>
    </div>
);

const FormField = ({ control, name, label, placeholder, disabled = false, as: Component = Input }: { control: any, name: any, label: string, placeholder?: string, disabled?: boolean, as?: React.ElementType }) => (
    <RHFormField
        control={control}
        name={name}
        render={({ field }) => (
            <FormItem>
                <FormLabel className="text-foreground">{label}</FormLabel>
                <FormControl>
                    <Component 
                        {...field} 
                        placeholder={placeholder} 
                        disabled={disabled} 
                        className="text-black"
                    />
                </FormControl>
                <FormMessage />
            </FormItem>
        )}
    />
);


interface ChecklistFormProps {
    obraId: string;
    checklistId?: string;
    initialData?: z.infer<typeof checklistSchema>;
    initialMaterials?: {tipo: string; quantidade: string; metroLinear: string;}[];
}

export function ChecklistForm({ obraId, checklistId, initialData, initialMaterials }: ChecklistFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  
  const isEditing = !!checklistId;
  
  const canSave = user?.role === 'admin' || user?.role === 'gestor' || user?.role === 'encarregado';

  const form = useForm<z.infer<typeof checklistSchema>>({
    resolver: zodResolver(checklistSchema),
    defaultValues: initialData || {
      empresa: '',
      cnpj: '',
      ordemServico: '',
      solicitante: '',
      orcamento: '',
      art: '',
      cliente: '',
      obra: '',
      tipoAtendimento: '',
      tipoServico: '',
      encarregado: '',
      equipeResponsavel: '',
      localAtividade: '',
      unidade: '',
      setor: '',
      equipamento: '',
      codigoEquipamento: '',
      numAndaime: '',
      tipoMaterial: '',
      altura: '',
      largura: '',
      comprimento: '',
      tipoAndaime: '',
      mobilidade: '',
      metragemCubica: '',
      areaOcupada: '',
      inicioMontagem: '',
      fimMontagem: '',
      tempoGasto: '',
      previsaoDesmontagem: '',
      descricao: '',
      observacoes: '',
      materials: initialMaterials || [],
    }
  });

  const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: "materials"
  });

  useEffect(() => {
    async function setupForm() {
      if (!isEditing) {
        // Creating new: get next number
        const checklistsColRef = collection(db, 'obras', obraId, 'checklists');
        const querySnapshot = await getDocs(checklistsColRef);
        const nextNumber = querySnapshot.size + 1;
        const formattedNumber = String(nextNumber).padStart(5, '0');
        form.setValue('numAndaime', formattedNumber);
      } else if (initialData) {
          // Editing: set form values
          Object.entries(initialData).forEach(([key, value]) => {
              form.setValue(key as keyof z.infer<typeof checklistSchema>, value);
          });
          if (initialMaterials) {
             form.setValue('materials', initialMaterials);
          }
      }
    }
    setupForm();
  }, [obraId, isEditing, initialData, initialMaterials, form]);


  const handleSave = async (formData: z.infer<typeof checklistSchema>) => {
    if (!canSave) return;
    setSaving(true);
    
    const materialsData = formData.materials || [];

    if (isEditing) {
        // --- EDIT LOGIC ---
        try {
            const batch = writeBatch(db);

            // 1. Get the current document state to move to history
            const checklistDocRef = doc(db, 'obras', obraId, 'checklists', checklistId);
            const currentDocSnap = await getDoc(checklistDocRef);
            if (!currentDocSnap.exists()) {
                throw new Error("Checklist não encontrado para criar versão de histórico.");
            }
            const currentData = currentDocSnap.data();

            // 2. Create a new document in the 'versions' subcollection
            const versionRef = doc(collection(checklistDocRef, 'versions'));
            batch.set(versionRef, {
                ...currentData,
                savedAt: new Date().toISOString(),
                savedBy: user?.name || 'Usuário Desconhecido'
            });

            // 3. Update the main checklist document with the new data
            batch.update(checklistDocRef, {
                formData: formData,
                materials: materialsData,
                data: new Date().toISOString(), // Update modification date
                responsavel: formData.encarregado, // Update responsible person
            });

            await batch.commit();

            toast({
                title: 'Checklist Atualizado!',
                description: 'As alterações foram salvas e uma nova versão foi criada no histórico.',
            });
            router.push(`/obras/${obraId}`);

        } catch (error) {
            console.error("Erro ao atualizar o checklist: ", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao Atualizar',
                description: 'Não foi possível salvar as alterações. Tente novamente.',
            });
        } finally {
            setSaving(false);
        }

    } else {
        // --- CREATE NEW LOGIC ---
        const numAndaime = form.getValues('numAndaime');
        if (!numAndaime) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'O número do andaime é obrigatório.',
            });
            setSaving(false);
            return;
        }

        try {
            const checklistDocRef = doc(db, 'obras', obraId, 'checklists', numAndaime);
            const docSnap = await getDoc(checklistDocRef);

            if (docSnap.exists()) {
                 toast({
                    variant: 'destructive',
                    title: 'Checklist Duplicado',
                    description: 'Um checklist com este número de andaime já existe nesta obra.',
                });
                setSaving(false);
                return;
            }

            await setDoc(checklistDocRef, {
                data: new Date().toISOString(),
                responsavel: formData.encarregado,
                status: 'Conforme', // Placeholder
                formData: formData,
                materials: materialsData
            });

            toast({
                title: 'Ordem de Serviço Salva!',
                description: 'As informações foram registradas com sucesso.',
            });
            router.push(`/obras/${obraId}`);

        } catch (error) {
            console.error("Erro ao salvar no Firestore: ", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao Salvar',
                description: 'Não foi possível salvar a ordem de serviço. Tente novamente.',
            });
        } finally {
            setSaving(false);
        }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSave)}>
        <Card className="w-full max-w-6xl mx-auto">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl text-foreground">{isEditing ? `Editar Ordem de Serviço #${form.getValues('numAndaime')}` : 'Nova Ordem de Serviço de Andaime'}</CardTitle>
                <CardDescription className="text-foreground">
                  {isEditing ? 'Modifique os detalhes abaixo. Suas alterações serão versionadas.' : 'Preencha todos os detalhes da ordem de serviço.'}
                </CardDescription>
              </div>
              {isEditing && (
                <Button variant="outline" onClick={() => router.push(`/obras/${obraId}/checklist/${checklistId}/history`)} className="transition-transform duration-200 hover:scale-105">
                    <History className="mr-2 h-4 w-4" />
                    Ver Histórico
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <FormSection title="Dados do Pedido">
                <FormField control={form.control} name="empresa" label="Empresa" disabled={saving || !canSave} />
                <FormField control={form.control} name="cnpj" label="CNPJ" disabled={saving || !canSave} />
                <FormField control={form.control} name="ordemServico" label="Ordem de Serviço nº" disabled={saving || !canSave} />
                <FormField control={form.control} name="solicitante" label="Solicitante" disabled={saving || !canSave} />
                <FormField control={form.control} name="orcamento" label="Orçamento nº" disabled={saving || !canSave} />
                <FormField control={form.control} name="art" label="ART" disabled={saving || !canSave} />
                <FormField control={form.control} name="cliente" label="Cliente" disabled={saving || !canSave} />
                <FormField control={form.control} name="obra" label="Obra" disabled={saving || !canSave} />
                <FormField control={form.control} name="tipoAtendimento" label="Tipo de atendimento" disabled={saving || !canSave} />
            </FormSection>
            
            <FormSection title="Detalhes do Serviço">
                <FormField control={form.control} name="tipoServico" label="Tipo de Serviço" disabled={saving || !canSave} />
                <FormField control={form.control} name="encarregado" label="Encarregado" disabled={saving || !canSave} />
                <FormField control={form.control} name="equipeResponsavel" label="Equipe Responsável" disabled={saving || !canSave} />
                <FormField control={form.control} name="localAtividade" label="Local da Atividade" disabled={saving || !canSave} />
                <FormField control={form.control} name="unidade" label="Unidade" disabled={saving || !canSave} />
                <FormField control={form.control} name="setor" label="Setor" disabled={saving || !canSave} />
                <FormField control={form.control} name="equipamento" label="Equipamento" disabled={saving || !canSave} />
                <FormField control={form.control} name="codigoEquipamento" label="Código do Equipamento" disabled={saving || !canSave} />
            </FormSection>

            <FormSection title="Informações sobre o andaime" cols={5}>
                <RHFormField
                    control={form.control}
                    name="numAndaime"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-foreground">Nº do Andaime</FormLabel>
                            <FormControl>
                                <Input {...field} disabled={true} className="text-black" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField control={form.control} name="tipoMaterial" label="Tipo de Material" disabled={saving || !canSave} />
                <FormField control={form.control} name="altura" label="Altura" disabled={saving || !canSave} />
                <FormField control={form.control} name="largura" label="Largura" disabled={saving || !canSave} />
                <FormField control={form.control} name="comprimento" label="Comprimento" disabled={saving || !canSave} />
                <FormField control={form.control} name="tipoAndaime" label="Tipo de Andaime" disabled={saving || !canSave} />
                <FormField control={form.control} name="mobilidade" label="Mobilidade" disabled={saving || !canSave} />
                <FormField control={form.control} name="metragemCubica" label="Metragem Cúbica" disabled={saving || !canSave} />
                <FormField control={form.control} name="areaOcupada" label="Área Ocupada (m²)" disabled={saving || !canSave} />
            </FormSection>

            <FormSection title="Previsão de Desmontagem">
                <FormField control={form.control} name="inicioMontagem" label="Inicío de Montagem" disabled={saving || !canSave} />
                <FormField control={form.control} name="fimMontagem" label="Fim da montagem" disabled={saving || !canSave} />
                <FormField control={form.control} name="tempoGasto" label="Tempo Gasto" disabled={saving || !canSave} />
                <FormField control={form.control} name="previsaoDesmontagem" label="Previsão de Desmontagem" disabled={saving || !canSave} />
            </FormSection>

            <FormSection title="Descrição" cols={1}>
                <FormField control={form.control} name="descricao" label="Descrição" as={Textarea} disabled={saving || !canSave} />
                <FormField control={form.control} name="observacoes" label="Observações" as={Textarea} disabled={saving || !canSave} />
            </FormSection>

            <FormSection title="Materiais Utilizados" cols={1}>
                <Card className="border-border">
                    <CardContent className="p-0">
                         <Table>
                            <TableHeader>
                                <TableRow className="border-white/20">
                                    <TableHead className="text-foreground">Descrição</TableHead>
                                    <TableHead className="w-[150px] text-foreground">Metro Linear</TableHead>
                                    <TableHead className="w-[150px] text-foreground">Quantidade</TableHead>
                                    <TableHead className="w-[80px] text-right text-foreground">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((item, index) => (
                                    <TableRow key={item.id} className="border-white/20">
                                        <TableCell>
                                            <RHFormField
                                                control={form.control}
                                                name={`materials.${index}.tipo`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl><Input {...field} className="h-8 text-black" disabled={saving || !canSave} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell>
                                             <RHFormField
                                                control={form.control}
                                                name={`materials.${index}.metroLinear`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl><Input {...field} className="h-8 text-black" disabled={saving || !canSave} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell>
                                             <RHFormField
                                                control={form.control}
                                                name={`materials.${index}.quantidade`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl><Input {...field} className="h-8 text-black" disabled={saving || !canSave} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button type="button" variant="ghost" size="icon" className="text-foreground hover:text-destructive" onClick={() => remove(index)} disabled={saving || !canSave}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <div className="flex justify-end mt-4">
                    <Button type="button" variant="outline" onClick={() => append({ tipo: '', quantidade: '', metroLinear: ''})} disabled={saving || !canSave} className="text-black hover:bg-gray-200 transition-transform duration-200 hover:scale-105">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Material
                    </Button>
                </div>
            </FormSection>
          </CardContent>
        </Card>
        {canSave && (
        <div className="mt-6 flex justify-end gap-4 max-w-6xl mx-auto">
            <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving} className="bg-gray-500 text-white hover:bg-gray-600 transition-all duration-200 hover:scale-105">Cancelar</Button>
            
            <Button type="submit" disabled={saving} className="transition-transform duration-200 hover:scale-105 bg-card text-card-foreground hover:bg-card/80">
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Salvar Ordem de Serviço')}
            </Button>
        </div>
        )}
      </form>
    </Form>
  );
}
