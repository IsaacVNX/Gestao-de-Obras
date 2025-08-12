'use client';
import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle as CardTitleComponent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Trash2, Paperclip, Info, ChevronUp, Save, X, AlertTriangle, Download } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PhotoViewer } from '@/components/PhotoViewer';

const photoSchema = z.object({
  url: z.string().min(1, "A URL da foto é obrigatória."),
  description: z.string().optional(),
  name: z.string().optional(),
  size: z.number().optional(),
});

const productSchema = z.object({
    nome: z.string().min(1, "O nome do produto é obrigatório."),
    sku: z.string().min(1, "O SKU é obrigatório."),
    valor: z.coerce.number().min(0.01, "O valor deve ser maior que zero."),
    unidadeMedida: z.string().min(1, "A unidade de medida é obrigatória."),
    status: z.enum(['ativo', 'inativo']).optional(),
    observacoes: z.string().optional(),
    
    cest: z.string().optional(),
    ncm: z.string().optional(),
    tipoProduto: z.string().optional(),
    origem: z.string().optional(),

    altura: z.union([z.string(), z.number()]).optional(),
    largura: z.union([z.string(), z.number()]).optional(),
    profundidade: z.union([z.string(), z.number()]).optional(),
    volumes: z.union([z.string(), z.number()]).optional(),
    pesoLiquido: z.union([z.string(), z.number()]).optional(),
    pesoBruto: z.union([z.string(), z.number()]).optional(),
    
    fotos: z.array(photoSchema).optional(),
});

const CollapsibleCard = ({ title, children, defaultOpen = true }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => (
    <Card className="shadow-lg bg-white text-black border-border">
        <Collapsible defaultOpen={defaultOpen}>
            <CollapsibleTrigger className="w-full group">
                <CardHeader className="flex flex-row items-center justify-between py-4">
                    <CardTitleComponent className="text-black">{title}</CardTitleComponent>
                    <ChevronUp className="h-5 w-5 text-black transition-transform duration-300 group-data-[state=open]:rotate-180" />
                </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent className="data-[state=open]:animate-slide-down-slow">
                <CardContent>{children}</CardContent>
            </CollapsibleContent>
        </Collapsible>
    </Card>
);

const InputWithUnit = ({ field, unit, disabled, id }: { field: any, unit: string, disabled?: boolean, id: string }) => (
    <div className="relative">
        <Input 
            type="number" 
            id={id}
            {...field} 
            value={field.value ?? ''}
            onChange={e => field.onChange(e.target.value === '' ? '' : e.target.valueAsNumber)}
            disabled={disabled} 
            className="pr-12 text-black bg-background border-border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
            step="any"
        />
        <div className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-sm text-muted-foreground bg-gray-100 rounded-r-md border-l">
            {unit}
        </div>
    </div>
);

export interface NewProductFormHandle {
    handleAttemptClose: () => void;
}

interface NewProductFormProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    onSaveSuccess: () => void;
    isClosing: boolean;
    handleClose: () => void;
}


export const NewProductForm = forwardRef<NewProductFormHandle, NewProductFormProps>(({ open, setOpen, onSaveSuccess, isClosing, handleClose }, ref) => {
    const { toast } = useToast();
    
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isAlertOpen, setAlertOpen] = useState(false);
    const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);


    const form = useForm<z.infer<typeof productSchema>>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            nome: '',
            sku: '',
            valor: 0,
            unidadeMedida: '',
            status: 'ativo',
            observacoes: '',
            cest: '',
            ncm: '',
            tipoProduto: '',
            origem: '',
            altura: '',
            largura: '',
            profundidade: '',
            volumes: '',
            pesoLiquido: '',
            pesoBruto: '',
            fotos: [],
        },
    });

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

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'fotos',
    });

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
            append({ url: dataUrl, name: file.name, size: file.size, description: '' });
        };
        reader.readAsDataURL(file);
    };

    const handleDownload = (url: string, name?: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = name || 'foto-produto';
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

    const handleCreate = async (formData: z.infer<typeof productSchema>) => {
        setSaving(true);
        try {
            const sku = formData.sku;
            const q = query(collection(db, 'produtos_almoxarifado'), where('sku', '==', sku));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                 toast({ variant: 'destructive', title: 'Erro de Criação', description: 'Este SKU já está cadastrado.' });
                 setSaving(false);
                 return;
            }

            const docRef = doc(db, 'produtos_almoxarifado', sku);
            await setDoc(docRef, {
                ...formData,
                status: 'ativo',
                altura: formData.altura || null,
                largura: formData.largura || null,
                profundidade: formData.profundidade || null,
                volumes: formData.volumes || null,
                pesoLiquido: formData.pesoLiquido || null,
                pesoBruto: formData.pesoBruto || null,
            });
            
            toast({ title: 'Produto Criado!', description: 'O novo produto foi adicionado com sucesso.' });
            onSaveSuccess();
            handleClose();

        } catch (error: any) {
            console.error("Create error: ", error);
            toast({ variant: 'destructive', title: 'Erro de Criação', description: 'Ocorreu um erro ao criar o produto.' });
        } finally {
            setSaving(false);
        }
    };

    const checkEnter = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
            e.preventDefault();
        }
    }
    
    useEffect(() => {
        if (!open) {
            form.reset();
            remove(); // Clear photos array
        }
    }, [open, form, remove]);


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
                        <h2 className="text-2xl font-semibold text-foreground">Adicionar Novo Produto</h2>
                        <p className="text-sm text-muted-foreground">Preencha os detalhes abaixo para criar um novo produto.</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={handleAttemptClose} className="rounded-full text-foreground hover:bg-muted">
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleCreate)} onKeyDown={checkEnter} className="flex flex-col flex-1 overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <CollapsibleCard title="Informações Básicas">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField control={form.control} name="nome" render={({ field }) => (
                                        <FormItem className="col-span-3 sm:col-span-1">
                                            <FormLabel htmlFor="nome" className="text-black">Nome do Produto</FormLabel>
                                            <FormControl><Input id="nome" {...field} disabled={saving} className="bg-background text-black border-border" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="sku" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="sku" className="text-black">SKU (Código)</FormLabel>
                                            <FormControl><Input id="sku" {...field} disabled={saving} className="bg-background text-black border-border" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="valor" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="valor" className="text-black">Valor (R$)</FormLabel>
                                            <FormControl><Input id="valor" type="number" {...field} disabled={saving} step="0.01" className="bg-background text-black border-border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" onChange={e => field.onChange(e.target.valueAsNumber)}/></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="unidadeMedida" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="unidadeMedida" className="text-black">Unidade de Medida</FormLabel>
                                            <FormControl><Input id="unidadeMedida" {...field} placeholder="Ex: Peça, Metro, Kg" disabled={saving} className="bg-background text-black border-border" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="status" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="status" className="text-black">Status</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={true}>
                                                <FormControl>
                                                    <SelectTrigger id="status" className="bg-background text-black border-border"><SelectValue placeholder="Selecione um status" /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="ativo">Ativo</SelectItem>
                                                    <SelectItem value="inativo">Inativo</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="observacoes" render={({ field }) => (
                                        <FormItem className="col-span-3">
                                            <FormLabel htmlFor="observacoes" className="text-black">Observações do Produto</FormLabel>
                                            <FormControl><Textarea id="observacoes" {...field} disabled={saving} className="bg-background text-black border-border"/></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                </div>
                            </CollapsibleCard>

                            <CollapsibleCard title="Dados Fiscais">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <FormField control={form.control} name="cest" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="cest" className="text-black">CEST</FormLabel>
                                            <FormControl><Input id="cest" {...field} disabled={saving} className="bg-background text-black border-border"/></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="ncm" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="ncm" className="text-black">NCM</FormLabel>
                                            <FormControl><Input id="ncm" {...field} disabled={saving} className="bg-background text-black border-border"/></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="tipoProduto" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="tipoProduto" className="text-black">Tipo de Produto</FormLabel>
                                            <FormControl><Input id="tipoProduto" {...field} disabled={saving} className="bg-background text-black border-border"/></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="origem" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="origem" className="text-black">Origem</FormLabel>
                                            <FormControl><Input id="origem" {...field} disabled={saving} className="bg-background text-black border-border"/></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                </div>
                            </CollapsibleCard>

                            <CollapsibleCard title="Pesos e Dimensões">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                    <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField control={form.control} name="altura" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel htmlFor="altura" className="text-black">Altura</FormLabel>
                                                <FormControl><InputWithUnit id="altura" field={field} unit="cm" disabled={saving}/></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <FormField control={form.control} name="largura" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel htmlFor="largura" className="text-black">Largura</FormLabel>
                                                <FormControl><InputWithUnit id="largura" field={field} unit="cm" disabled={saving}/></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <FormField control={form.control} name="profundidade" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel htmlFor="profundidade" className="text-black">Profundidade</FormLabel>
                                                <FormControl><InputWithUnit id="profundidade" field={field} unit="cm" disabled={saving}/></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <FormField control={form.control} name="volumes" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel htmlFor="volumes" className="text-black">Volumes</FormLabel>
                                                <FormControl><Input id="volumes" type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? '' : e.target.valueAsNumber)} disabled={saving} className="bg-background text-black border-border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <FormField control={form.control} name="pesoLiquido" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel htmlFor="pesoLiquido" className="text-black">Peso Líquido</FormLabel>
                                                <FormControl><InputWithUnit id="pesoLiquido" field={field} unit="kg" disabled={saving}/></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <FormField control={form.control} name="pesoBruto" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel htmlFor="pesoBruto" className="text-black">Peso Bruto</FormLabel>
                                                <FormControl><InputWithUnit id="pesoBruto" field={field} unit="kg" disabled={saving}/></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                    </div>
                                    <div className="md:col-span-3 flex items-center justify-center">
                                        <img src="https://placehold.co/200x150.png" width={200} height={150} alt="Ilustração de uma caixa com dimensões" data-ai-hint="package box" className="w-48 h-auto"/>
                                    </div>
                                </div>
                            </CollapsibleCard>
                            
                            <CollapsibleCard title="Fotos">
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
                                        {fields.map((field, index) => (
                                            <div key={field.id} className="grid grid-cols-12 gap-4 items-center p-2 rounded-md bg-black/5">
                                                <div className="col-span-5 flex items-center gap-2 text-sm text-black">
                                                    <Paperclip className="h-4 w-4" />
                                                    <button type="button" onClick={() => setViewingPhotoUrl(field.url)} className="truncate hover:underline">
                                                      {field.name}
                                                    </button>
                                                    <span className="text-xs text-muted-foreground">({formatFileSize(field.size)})</span>
                                                </div>
                                                <div className="col-span-5">
                                                    <FormField
                                                        control={form.control}
                                                        name={`fotos.${index}.description`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl><Input {...field} placeholder="Ex: Vista frontal" disabled={saving} className="bg-background text-black border-border h-9" /></FormControl>
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
                                                                    <Download className="h-4 w-4"/>
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="bg-background text-foreground"><p>Baixar</p></TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/20 hover:text-destructive" onClick={() => remove(index)}>
                                                                    <Trash2 className="h-4 w-4"/>
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="bg-background text-foreground"><p>Excluir</p></TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </div>
                                        ))}
                                        {fields.length === 0 && (
                                            <div className="text-center py-4 text-sm text-muted-foreground">
                                                Nenhuma foto adicionada.
                                            </div>
                                        )}
                                    </div>
                                    <hr className="my-2 border-border" />
                                    <div className="pt-2">
                                        <Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()} className="text-black hover:bg-black/10 hover:text-black">
                                            <Upload className="mr-2 h-4 w-4" />
                                            Adicionar Foto
                                        </Button>
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/jpeg,image/png,image/webp,image/jpg" />
                                    </div>
                                </div>
                            </CollapsibleCard>
                        </div>
                        <div className="p-4 flex justify-end gap-2 mt-auto bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] border-t">
                            <Button type="button" variant="ghost" onClick={handleAttemptClose} disabled={saving}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant="default" className="transition-transform duration-200 hover:scale-105" disabled={saving}>
                                <Save className="mr-2 h-4 w-4" />
                                {saving ? 'Salvando...' : 'Salvar Produto'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
            
            <PhotoViewer imageUrl={viewingPhotoUrl} onClose={() => setViewingPhotoUrl(null)} />
        </div>
    );
});
NewProductForm.displayName = 'NewProductForm';
