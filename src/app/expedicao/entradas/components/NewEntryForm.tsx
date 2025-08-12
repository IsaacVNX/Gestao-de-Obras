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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { X, AlertTriangle, Save, ChevronUp, PlusCircle, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle as CardTitleComponent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { Cliente } from '@/app/expedicao/cadastros/clientes/components/ClientManagement';
import type { Produto } from '@/app/expedicao/cadastros/produtos/components/ProductManagement';

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

const CollapsibleCard = ({ title, children, defaultOpen = true }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => (
    <Card className="shadow-lg bg-white text-black border-border">
        <Collapsible defaultOpen={defaultOpen}>
            <CollapsibleTrigger className="w-full group">
                <CardHeader className="flex flex-row items-center justify-between py-4">
                    <CardTitleComponent className="text-black">{title}</CardTitleComponent>
                    <ChevronUp className="h-5 w-5 text-black transition-transform duration-300 group-data-[state=open]:rotate-180" />
                </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <CardContent>{children}</CardContent>
            </CollapsibleContent>
        </Collapsible>
    </Card>
);


export const NewEntryForm = forwardRef<NewEntryFormHandle, NewEntryFormProps>(({ open, setOpen, onSaveSuccess, isClosing, handleClose }, ref) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [isAlertOpen, setAlertOpen] = useState(false);
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  // States for custom client search
  const [clientSearch, setClientSearch] = useState('');
  const [filteredClients, setFilteredClients] = useState<Cliente[]>([]);
  const [isClientListVisible, setClientListVisible] = useState(false);
  const clientSearchRef = useRef<HTMLDivElement>(null);

  // States for custom product search
  const [productSearch, setProductSearch] = useState<{ [index: number]: string }>({});
  const [filteredProducts, setFilteredProducts] = useState<{ [index: number]: Produto[] }>({});
  const [isProductListVisible, setProductListVisible] = useState<{ [index: number]: boolean }>({});
  
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
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
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

  // Click outside handler for client search
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (clientSearchRef.current && !clientSearchRef.current.contains(event.target as Node)) {
        setClientListVisible(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
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

  const handleClientSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setClientSearch(value);
    form.setValue('clienteId', ''); // Clear selection if search changes
    if (value) {
      const filtered = clientes.filter(c => 
        (c.nomeCompleto?.toLowerCase().includes(value.toLowerCase())) ||
        (c.razaoSocial?.toLowerCase().includes(value.toLowerCase())) ||
        (c.cnpj?.includes(value)) ||
        (c.cpf?.includes(value))
      );
      setFilteredClients(filtered);
      setClientListVisible(true);
    } else {
      setFilteredClients([]);
      setClientListVisible(false);
    }
  };

  const handleClientSelect = (cliente: Cliente) => {
    form.setValue('clienteId', cliente.id, { shouldDirty: true });
    setClientSearch(cliente.nomeCompleto || cliente.razaoSocial || '');
    form.setValue('cnpj', cliente.cnpj || cliente.cpf || '', { shouldDirty: true });
    form.setValue('cidade', (cliente as any).cidade || '', { shouldDirty: true });
    form.setValue('uf', (cliente as any).estado || '', { shouldDirty: true });
    setClientListVisible(false);
  };
  
  const handleProductSearchChange = (index: number, value: string) => {
    setProductSearch(prev => ({...prev, [index]: value}));
    form.setValue(`items.${index}.produtoId`, ''); // Clear on new search
    if (value) {
      const filtered = produtos.filter(p => p.nome.toLowerCase().includes(value.toLowerCase()));
      setFilteredProducts(prev => ({ ...prev, [index]: filtered }));
    } else {
      setFilteredProducts(prev => ({ ...prev, [index]: [] }));
    }
  }

  const handleProductSelect = (index: number, produto: Produto) => {
    update(index, {
        ...fields[index],
        produtoId: produto.id,
        descricao: produto.nome,
        metroLinearUnitario: produto.metroLinear || 0,
        pesoBrutoUnitario: produto.pesoBruto || 0,
    });
    setProductSearch(prev => ({...prev, [index]: produto.nome}));
    calculateTotals(index);
    setProductListVisible(prev => ({ ...prev, [index]: false }));
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

        <div className="p-6 flex flex-row items-center justify-between border-b bg-white shadow-md sticky top-0 z-10">
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
              <CollapsibleCard title="Cabeçalho do Romaneio">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField name="clienteId" control={form.control} render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-black">Cliente</FormLabel>
                        <div ref={clientSearchRef} className="relative">
                            <FormControl>
                                <Input 
                                    placeholder="Busque o cliente pelo nome ou CNPJ/CPF"
                                    value={clientSearch}
                                    onChange={handleClientSearchChange}
                                    className="text-black bg-background border-border"
                                />
                            </FormControl>
                            {isClientListVisible && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {filteredClients.length > 0 ? (
                                filteredClients.map(c => (
                                    <div
                                    key={c.id}
                                    className="p-2 hover:bg-gray-100 cursor-pointer text-black"
                                    onClick={() => handleClientSelect(c)}
                                    >
                                    {c.nomeCompleto || c.razaoSocial}
                                    </div>
                                ))
                                ) : (
                                <div className="p-2 text-gray-500">Nenhum cliente encontrado.</div>
                                )}
                            </div>
                            )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <FormField name="cnpj" control={form.control} render={({ field }) => (<FormItem><FormLabel className="text-black">CNPJ/CPF</FormLabel><FormControl><Input {...field} disabled className="bg-gray-100 text-black border-border" /></FormControl></FormItem>)}/>
                  <FormField name="nomeObra" control={form.control} render={({ field }) => (<FormItem><FormLabel className="text-black">Nome da Obra</FormLabel><FormControl><Input {...field} className="text-black bg-background border-border"/></FormControl><FormMessage /></FormItem>)}/>
                  <FormField name="orcamento" control={form.control} render={({ field }) => (<FormItem><FormLabel className="text-black">Nº Orçamento</FormLabel><FormControl><Input {...field} className="text-black bg-background border-border"/></FormControl></FormItem>)}/>
                  <FormField name="notaFiscal" control={form.control} render={({ field }) => (<FormItem><FormLabel className="text-black">Nota Fiscal</FormLabel><FormControl><Input {...field} className="text-black bg-background border-border"/></FormControl><FormMessage /></FormItem>)}/>
                  <FormField name="cidade" control={form.control} render={({ field }) => (<FormItem><FormLabel className="text-black">Cidade</FormLabel><FormControl><Input {...field} disabled className="bg-gray-100 text-black border-border"/></FormControl></FormItem>)}/>
                  <FormField name="uf" control={form.control} render={({ field }) => (<FormItem><FormLabel className="text-black">UF</FormLabel><FormControl><Input {...field} disabled className="bg-gray-100 text-black border-border"/></FormControl></FormItem>)}/>
                </div>
              </CollapsibleCard>
              <CollapsibleCard title="Itens do Romaneio">
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
                                         <FormField name={`items.${index}.produtoId`} control={form.control} render={({ field }) => (
                                            <div className="relative">
                                                <FormControl>
                                                    <Input
                                                        placeholder="Buscar produto..."
                                                        value={productSearch[index] || ''}
                                                        onChange={(e) => handleProductSearchChange(index, e.target.value)}
                                                        onFocus={() => setProductListVisible(prev => ({...prev, [index]: true}))}
                                                        onBlur={() => setTimeout(() => setProductListVisible(prev => ({...prev, [index]: false})), 150)}
                                                        className="text-black bg-background border-border"
                                                    />
                                                </FormControl>
                                                {isProductListVisible[index] && (
                                                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                                    {(filteredProducts[index] || []).length > 0 ? (
                                                    (filteredProducts[index] || []).map(p => (
                                                        <div key={p.id} className="p-2 hover:bg-gray-100 cursor-pointer text-black" onClick={() => handleProductSelect(index, p)}>
                                                            {p.nome}
                                                        </div>
                                                    ))
                                                    ) : (
                                                    <div className="p-2 text-gray-500">Nenhum produto encontrado.</div>
                                                    )}
                                                </div>
                                                )}
                                                <FormMessage />
                                            </div>
                                         )}/>
                                    </TableCell>
                                    <TableCell>
                                        <FormField name={`items.${index}.quantidade`} control={form.control} render={({ field }) => (
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
              </CollapsibleCard>
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
    </div>
  );
});
NewEntryForm.displayName = "NewEntryForm";
