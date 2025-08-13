'use client';
import { useState, useEffect, forwardRef, useImperativeHandle, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField as RHFormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { X, AlertTriangle, Save, ChevronUp, PlusCircle, Trash2, ChevronDown, Upload, Paperclip, Info, Download } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle as CardTitleComponent } from '@/components/ui/card';
import type { Cliente } from '@/app/expedicao/cadastros/clientes/components/ClientManagement';
import type { Produto } from '@/app/expedicao/cadastros/produtos/components/ProductManagement';
import { Textarea } from '@/components/ui/textarea';
import { PhotoViewer } from '@/components/PhotoViewer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SearchableSelect } from '@/components/ui/searchable-select';

const photoSchema = z.object({
  url: z.string().min(1, "A URL da foto é obrigatória."),
  description: z.string().optional(),
  name: z.string().optional(),
  size: z.number().optional(),
});

const itemSchema = z.object({
  id: z.string(),
  produtoId: z.string().min(1, "Selecione um produto."),
  descricao: z.string(),
  quantidade: z.coerce.number().min(1, "A quantidade deve ser maior que zero."),
  metroLinearUnitario: z.number(),
  pesoBrutoUnitario: z.number(),
  metroLinearTotal: z.number(),
  pesoTotal: z.number(),
});

const romaneioSchema = z.object({
  clienteId: z.string().min(1, "Selecione um cliente."),
  cnpj: z.string(),
  nomeObra: z.string().min(1, "O nome da obra é obrigatório."),
  orcamento: z.string().optional(),
  notaFiscal: z.string().min(1, "O número da nota fiscal é obrigatório."),
  cidade: z.string(),
  uf: z.string(),
  items: z.array(itemSchema).min(1, "Adicione pelo menos um item ao romaneio."),
  fotos: z.array(photoSchema).optional(),
  observacoes: z.string().optional(),
});

export interface NewEntryFormHandle {
  handleAttemptClose: () => void;
}

interface NewEntryFormProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onSaveSuccess: () => void;
  isClosing: boolean;
  handleClose: () => void;
}

const StaticCard = ({ title, children, className }: { title: string, children: React.ReactNode, className?: string }) => (
    <Card className={cn("shadow-lg bg-white text-black border-border", className)}>
        <CardHeader className="flex flex-row items-center justify-between py-4">
            <CardTitleComponent className="text-black">{title}</CardTitleComponent>
        </CardHeader>
        <CardContent>{children}</CardContent>
    </Card>
);

export const NewEntryForm = forwardRef<NewEntryFormHandle, NewEntryFormProps>(({ open, setOpen, onSaveSuccess, isClosing, handleClose }, ref) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [isAlertOpen, setAlertOpen] = useState(false);
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  const [clienteDisplayValue, setClienteDisplayValue] = useState('');
  
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  
  const form = useForm<z.infer<typeof romaneioSchema>>({
    resolver: zodResolver(romaneioSchema),
    defaultValues: {
      clienteId: '',
      cnpj: '',
      nomeObra: '',
      orcamento: '',
      notaFiscal: '',
      cidade: '',
      uf: '',
      items: [],
      fotos: [],
      observacoes: '',
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const { fields: photoFields, append: appendPhoto, remove: removePhoto } = useFieldArray({
    control: form.control,
    name: "fotos",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [clientesSnapshot, produtosSnapshot] = await Promise.all([
        getDocs(collection(db, 'clientes_expedicao')),
        getDocs(collection(db, 'produtos_expedicao')),
      ]);
      const clientesList = clientesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cliente));
      const produtosList = produtosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Produto));
      setClientes(clientesList);
      setProdutos(produtosList);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao carregar dados', description: 'Não foi possível buscar clientes e produtos.' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const { formState: { isDirty } } = form;

  const handleAttemptClose = () => {
    if (isDirty) {
      setAlertOpen(true);
    } else {
      handleClose();
    }
  };

  useImperativeHandle(ref, () => ({
    handleAttemptClose,
  }));

  const handleClientSelect = (cliente: Cliente) => {
    form.setValue('clienteId', cliente.id, { shouldDirty: true });
    form.setValue('cnpj', cliente.cnpj || cliente.cpf || '', { shouldDirty: true });
    form.setValue('cidade', (cliente as any).cidade || '', { shouldDirty: true });
    form.setValue('uf', (cliente as any).estado || '', { shouldDirty: true });
    setClienteDisplayValue(cliente.razaoSocial || cliente.nomeCompleto || '');
  };
  
  const handleProductSelect = (index: number, produto: Produto) => {
    update(index, {
        ...fields[index],
        produtoId: produto.id,
        descricao: produto.nome,
        metroLinearUnitario: produto.metroLinear || 0,
        pesoBrutoUnitario: produto.pesoBruto || 0,
    });
    calculateTotals(index);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    update(index, { ...fields[index], quantidade: quantity });
    calculateTotals(index);
  };
  
  const calculateTotals = (index: number) => {
    const item = form.getValues(`items.${index}`);
    const metroLinearTotal = (item.quantidade || 0) * (item.metroLinearUnitario || 0);
    const pesoTotal = metroLinearTotal * (item.pesoBrutoUnitario || 0);

    update(index, {
        ...item,
        metroLinearTotal,
        pesoTotal,
    });
  };

  const addNewItem = () => {
    append({
        id: (fields.length + 1).toString(),
        produtoId: '',
        descricao: '',
        quantidade: 1,
        metroLinearUnitario: 0,
        pesoBrutoUnitario: 0,
        metroLinearTotal: 0,
        pesoTotal: 0,
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const maxSize = 3 * 1024 * 1024; // 3MB

    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Tipo de arquivo inválido',
        description: 'Por favor, selecione um arquivo JPG, JPEG, PNG ou WEBP.',
      });
      return;
    }

    if (file.size > maxSize) {
      toast({
        variant: 'destructive',
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo do arquivo é de 3MB.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      appendPhoto({ url: dataUrl, name: file.name, size: file.size, description: '' });
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = (url: string, name?: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name || 'foto-romaneio';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const formatFileSize = (bytes?: number) => {
    if (bytes === undefined) return '';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCreate = async (formData: z.infer<typeof romaneioSchema>) => {
    setSaving(true);
    console.log(formData);
    toast({ title: 'Romaneio Criado (Simulado)!', description: 'A lógica de salvar será implementada.' });
    onSaveSuccess();
    handleClose();
    setSaving(false);
  };
  
    useEffect(() => {
        if (!open) {
            form.reset();
        }
    }, [open, form]);

  return (
    <div className={cn('h-full w-full flex flex-col', isClosing ? 'animate-slide-down' : 'animate-slide-up')}>
      <div className="w-full flex flex-col h-full bg-[#ededed]">
        <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="text-destructive" /> Descartar alterações?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Você tem alterações não salvas. Tem certeza de que deseja fechar e descartar as alterações?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Continuar Editando</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClose} className="bg-destructive hover:bg-destructive/80">
                        Descartar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <div className="p-6 flex flex-row items-center justify-between border-b bg-white shadow-md sticky top-0 z-20">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Registrar Entrada (Romaneio)</h2>
            <p className="text-sm text-muted-foreground">Preencha os detalhes do romaneio de entrada.</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={handleAttemptClose} className="rounded-full text-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleCreate)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <StaticCard title="Cabeçalho do Romaneio">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <RHFormField control={form.control} name="clienteId" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-black">Cliente</FormLabel>
                        <SearchableSelect
                            items={clientes}
                            onSelectItem={handleClientSelect}
                            displayValue={clienteDisplayValue}
                            setDisplayValue={setClienteDisplayValue}
                            renderItem={(item) => (
                                <div className="flex justify-between w-full">
                                    <span>{item.razaoSocial || item.nomeCompleto}</span>
                                    <span className="text-xs text-muted-foreground">{item.cnpj || item.cpf}</span>
                                </div>
                            )}
                            filterFunction={(item, query) => (
                                (item.razaoSocial || '').toLowerCase().includes(query.toLowerCase()) ||
                                (item.nomeCompleto || '').toLowerCase().includes(query.toLowerCase()) ||
                                (item.cnpj || '').includes(query) ||
                                (item.cpf || '').includes(query)
                            )}
                            placeholder="Busque o cliente pelo nome ou CNPJ/CPF"
                        />
                        <FormMessage />
                    </FormItem>
                  )}/>
                  <RHFormField name="cnpj" control={form.control} render={({ field }) => (<FormItem><FormLabel className="text-black">CNPJ/CPF</FormLabel><FormControl><Input {...field} disabled className="bg-gray-100 text-black border-border" /></FormControl></FormItem>)}/>
                  <RHFormField name="nomeObra" control={form.control} render={({ field }) => (<FormItem><FormLabel className="text-black">Nome da Obra</FormLabel><FormControl><Input {...field} className="text-black bg-background border-border"/></FormControl><FormMessage /></FormItem>)}/>
                  <RHFormField name="orcamento" control={form.control} render={({ field }) => (<FormItem><FormLabel className="text-black">Nº Orçamento</FormLabel><FormControl><Input {...field} className="text-black bg-background border-border"/></FormControl></FormItem>)}/>
                  <RHFormField name="notaFiscal" control={form.control} render={({ field }) => (<FormItem><FormLabel className="text-black">Nota Fiscal</FormLabel><FormControl><Input {...field} className="text-black bg-background border-border"/></FormControl><FormMessage /></FormItem>)}/>
                  <RHFormField name="cidade" control={form.control} render={({ field }) => (<FormItem><FormLabel className="text-black">Cidade</FormLabel><FormControl><Input {...field} disabled className="bg-gray-100 text-black border-border"/></FormControl></FormItem>)}/>
                  <RHFormField name="uf" control={form.control} render={({ field }) => (<FormItem><FormLabel className="text-black">UF</FormLabel><FormControl><Input {...field} disabled className="bg-gray-100 text-black border-border"/></FormControl></FormItem>)}/>
                </div>
              </StaticCard>
              <StaticCard title="Itens do Romaneio">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12 text-black">ID</TableHead>
                                <TableHead className="text-black">Descrição</TableHead>
                                <TableHead className="w-28 text-black">Qtd</TableHead>
                                <TableHead className="w-40 text-black">M. Linear (Total)</TableHead>
                                <TableHead className="w-40 text-black">Peso Total (kg)</TableHead>
                                <TableHead className="w-16 text-black"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((item, index) => (
                                <TableRow key={item.id}>
                                    <TableCell className="text-black">{index + 1}</TableCell>
                                    <TableCell>
                                         <RHFormField name={`items.${index}.produtoId`} control={form.control} render={({ field }) => (
                                            <FormItem>
                                                <SearchableSelect
                                                    items={produtos}
                                                    onSelectItem={(p) => handleProductSelect(index, p as Produto)}
                                                    displayValue={item.descricao}
                                                    renderItem={(p) => (
                                                        <div className="flex justify-between w-full">
                                                            <span>{p.nome}</span>
                                                            <span className="text-xs text-muted-foreground">{p.sku}</span>
                                                        </div>
                                                    )}
                                                    filterFunction={(p, query) => 
                                                        p.nome.toLowerCase().includes(query.toLowerCase()) || 
                                                        p.sku.toLowerCase().includes(query.toLowerCase())
                                                    }
                                                    placeholder="Buscar produto por nome ou SKU"
                                                />
                                                <FormMessage />
                                            </FormItem>
                                         )}/>
                                    </TableCell>
                                    <TableCell>
                                        <RHFormField name={`items.${index}.quantidade`} control={form.control} render={({ field }) => (
                                            <Input type="number" {...field} onChange={e => { field.onChange(e); handleQuantityChange(index, e.target.valueAsNumber); }} className="text-black bg-background border-border"/>
                                        )}/>
                                    </TableCell>
                                    <TableCell><Input value={form.watch(`items.${index}.metroLinearTotal`).toFixed(2)} disabled className="bg-gray-100 text-black border-border"/></TableCell>
                                    <TableCell><Input value={(form.watch(`items.${index}.pesoTotal`) || 0).toFixed(2)} disabled className="bg-gray-100 text-black border-border"/></TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <Button type="button" variant="outline" onClick={addNewItem} className="mt-4 text-black hover:bg-black/10">
                        <PlusCircle className="mr-2 h-4 w-4"/> Adicionar Item
                    </Button>
              </StaticCard>
              <StaticCard title="Anexar Fotos">
                <div className="p-4 rounded-md border bg-white text-black">
                  <div className="grid grid-cols-12 gap-4 px-2 py-1 text-sm font-medium text-black">
                    <div className="col-span-5 flex items-center">
                      Foto
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="ml-1.5 cursor-help p-1 rounded-full hover:bg-black/10">
                              <Info className="h-5 w-5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-background text-foreground">
                            <p>Arquivos aceitos: jpg, jpeg, png, webp.</p>
                            <p>Tamanho máximo por arquivo: 3MB.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="col-span-5">Descrição</div>
                    <div className="col-span-2 text-right">Ações</div>
                  </div>
                  <hr className="my-2 border-border" />
                  <div className="space-y-2">
                    {photoFields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-12 gap-4 items-center p-2 rounded-md bg-black/5">
                        <div className="col-span-5 flex items-center gap-2 text-sm text-black">
                          <Paperclip className="h-4 w-4" />
                          <button type="button" onClick={() => setViewingPhotoUrl(field.url)} className="truncate hover:underline">
                            {field.name || 'Visualizar Foto'}
                          </button>
                          {field.size && <span className="text-xs text-muted-foreground">({formatFileSize(field.size)})</span>}
                        </div>
                        <div className="col-span-5">
                          <RHFormField
                            control={form.control}
                            name={`fotos.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl><Input {...field} placeholder="Ex: Nota fiscal" disabled={saving} className="bg-background text-black border-border h-9" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-2 flex justify-end gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-black hover:text-black hover:bg-black/10" onClick={() => handleDownload(field.url, field.name)} disabled={saving}>
                                  <Download className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-background text-foreground"><p>Baixar</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/20 hover:text-destructive" onClick={() => removePhoto(index)} disabled={saving}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-background text-foreground"><p>Excluir</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    ))}
                    {photoFields.length === 0 && (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        Nenhuma foto adicionada.
                      </div>
                    )}
                  </div>
                  <hr className="my-2 border-border" />
                  <div className="pt-2">
                    <Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()} className="text-black hover:bg-black/10 hover:text-black" disabled={saving}>
                      <Upload className="mr-2 h-4 w-4" />
                      Adicionar Foto
                    </Button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/jpeg,image/png,image/webp,image/jpg" />
                  </div>
                </div>
              </StaticCard>

              <StaticCard title="Observações">
                 <RHFormField control={form.control} name="observacoes" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-black sr-only">Observações</FormLabel>
                        <FormControl><Textarea {...field} placeholder="Adicione qualquer observação relevante sobre esta entrada..." disabled={saving} className="bg-background text-black border-border min-h-[100px]"/></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
              </StaticCard>

            </div>
            <div className="p-4 flex justify-end gap-2 mt-auto bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] border-t">
              <Button type="button" variant="ghost" onClick={handleAttemptClose} disabled={saving}>Cancelar</Button>
              <Button type="submit" variant="default" className="transition-transform duration-200 hover:scale-105" disabled={saving}>
                <Save className="mr-2 h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar Romaneio'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
       <PhotoViewer imageUrl={viewingPhotoUrl} onClose={() => setViewingPhotoUrl(null)} />
    </div>
  );
});
NewEntryForm.displayName = "NewEntryForm";
