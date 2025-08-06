
'use client';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Trash2, Paperclip, Info, ChevronUp, Save, X, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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


const CollapsibleFormSection = ({ title, children, defaultOpen = true }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => (
    <>
      <Separator className="my-4" />
      <Collapsible defaultOpen={defaultOpen}>
        <CollapsibleTrigger className="w-full flex justify-between items-center group py-2">
            <h3 className="text-lg font-semibold text-primary-foreground">{title}</h3>
            <ChevronUp className="h-5 w-5 text-primary-foreground group-data-[state=closed]:rotate-180 transition-transform"/>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
            {children}
        </CollapsibleContent>
      </Collapsible>
    </>
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
            className="pr-12 text-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
            step="any"
        />
        <div className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-sm text-muted-foreground bg-gray-100 rounded-r-md border-l">
            {unit}
        </div>
    </div>
);

interface NewProductFormProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    onSaveSuccess: () => void;
    isClosing: boolean;
    handleClose: () => void;
}


export function NewProductForm({ open, setOpen, onSaveSuccess, isClosing, handleClose }: NewProductFormProps) {
    const { toast } = useToast();
    
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isAlertOpen, setAlertOpen] = useState(false);

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
            const q = query(collection(db, 'produtos'), where('sku', '==', sku));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                 toast({ variant: 'destructive', title: 'Erro de Criação', description: 'Este SKU já está cadastrado.' });
                 setSaving(false);
                 return;
            }

            const docRef = doc(db, 'produtos', sku);
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
        <div 
            onKeyDown={(e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    handleAttemptClose();
                }
            }}
            className={cn('h-full w-full bg-card', isClosing ? 'animate-slide-down' : 'animate-slide-up')}
        >
             <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                           <AlertTriangle className="text-destructive" /> Descartar alterações?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Você tem alterações não salvas. Tem certeza de que deseja fechar o formulário e descartar as alterações?
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
            <DialogHeader className="p-6 flex-row items-center justify-between">
                <div>
                    <DialogTitle className="text-2xl">Adicionar Novo Produto</DialogTitle>
                    <DialogDescription className="text-card-foreground">Preencha os detalhes abaixo.</DialogDescription>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={handleAttemptClose} className="rounded-full text-card-foreground hover:bg-card-foreground/10">
                    <X className="h-5 w-5" />
                </Button>
            </DialogHeader>
            <ScrollArea className="flex-grow h-[calc(100%-160px)]">
                <CardContent className="p-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleCreate)} onKeyDown={checkEnter}>
                            <CollapsibleFormSection title="Informações Básicas">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField control={form.control} name="nome" render={({ field }) => (
                                        <FormItem className="col-span-3 sm:col-span-1">
                                            <FormLabel htmlFor="nome">Nome do Produto</FormLabel>
                                            <FormControl><Input id="nome" {...field} disabled={saving} className="text-black" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="sku" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="sku">SKU (Código)</FormLabel>
                                            <FormControl><Input id="sku" {...field} disabled={saving} className="text-black" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="valor" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="valor">Valor (R$)</FormLabel>
                                            <FormControl><Input id="valor" type="number" {...field} disabled={saving} step="0.01" className="text-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" onChange={e => field.onChange(e.target.valueAsNumber)}/></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="unidadeMedida" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="unidadeMedida">Unidade de Medida</FormLabel>
                                            <FormControl><Input id="unidadeMedida" {...field} placeholder="Ex: Peça, Metro, Kg" disabled={saving} className="text-black" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="status" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="status">Status</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={true}>
                                                <FormControl>
                                                    <SelectTrigger id="status" className="text-black"><SelectValue placeholder="Selecione um status" /></SelectTrigger>
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
                                            <FormLabel htmlFor="observacoes">Observações do Produto</FormLabel>
                                            <FormControl><Textarea id="observacoes" {...field} disabled={saving} className="text-black"/></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                </div>
                            </CollapsibleFormSection>

                            <CollapsibleFormSection title="Dados Fiscais">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <FormField control={form.control} name="cest" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="cest">CEST</FormLabel>
                                            <FormControl><Input id="cest" {...field} disabled={saving} className="text-black"/></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="ncm" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="ncm">NCM</FormLabel>
                                            <FormControl><Input id="ncm" {...field} disabled={saving} className="text-black"/></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="tipoProduto" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="tipoProduto">Tipo de Produto</FormLabel>
                                            <FormControl><Input id="tipoProduto" {...field} disabled={saving} className="text-black"/></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="origem" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="origem">Origem</FormLabel>
                                            <FormControl><Input id="origem" {...field} disabled={saving} className="text-black"/></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                </div>
                            </CollapsibleFormSection>

                            <CollapsibleFormSection title="Pesos e Dimensões">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                    <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField control={form.control} name="altura" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel htmlFor="altura">Altura</FormLabel>
                                                <FormControl><InputWithUnit id="altura" field={field} unit="cm" disabled={saving}/></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <FormField control={form.control} name="largura" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel htmlFor="largura">Largura</FormLabel>
                                                <FormControl><InputWithUnit id="largura" field={field} unit="cm" disabled={saving}/></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <FormField control={form.control} name="profundidade" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel htmlFor="profundidade">Profundidade</FormLabel>
                                                <FormControl><InputWithUnit id="profundidade" field={field} unit="cm" disabled={saving}/></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <FormField control={form.control} name="volumes" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel htmlFor="volumes">Volumes</FormLabel>
                                                <FormControl><Input id="volumes" type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? '' : e.target.valueAsNumber)} disabled={saving} className="text-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <FormField control={form.control} name="pesoLiquido" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel htmlFor="pesoLiquido">Peso Líquido</FormLabel>
                                                <FormControl><InputWithUnit id="pesoLiquido" field={field} unit="kg" disabled={saving}/></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <FormField control={form.control} name="pesoBruto" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel htmlFor="pesoBruto">Peso Bruto</FormLabel>
                                                <FormControl><InputWithUnit id="pesoBruto" field={field} unit="kg" disabled={saving}/></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                    </div>
                                    <div className="md:col-span-3 flex items-center justify-center">
                                        <img src="https://placehold.co/200x150.png" width={200} height={150} alt="Ilustração de uma caixa com dimensões" data-ai-hint="package box" className="w-48 h-auto"/>
                                    </div>
                                </div>
                            </CollapsibleFormSection>
                            
                            <CollapsibleFormSection title="Fotos">
                                <div className="p-4 rounded-md border bg-card text-card-foreground">
                                    <div className="grid grid-cols-12 gap-4 px-2 py-1 text-sm font-medium text-card-foreground">
                                        <div className="col-span-6 flex items-center text-white">
                                            Foto
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button type="button" className="ml-1.5 cursor-help p-1 rounded-full hover:bg-white/10">
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
                                        <div className="col-span-6 text-white">Descrição</div>
                                    </div>
                                    <Separator className="my-2 bg-card-foreground/20" />
                                    <div className="space-y-2">
                                        {fields.map((field, index) => (
                                            <div key={field.id} className="grid grid-cols-12 gap-4 items-center p-2 rounded-md bg-card-foreground/10">
                                                <div className="col-span-6 flex items-center gap-2 text-sm text-card-foreground">
                                                    <Paperclip className="h-4 w-4" />
                                                    <span className="truncate">{field.name}</span>
                                                    <span className="text-xs text-card-foreground/70">({formatFileSize(field.size)})</span>
                                                </div>
                                                <div className="col-span-5">
                                                    <FormField
                                                        control={form.control}
                                                        name={`fotos.${index}.description`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl><Input {...field} placeholder="Ex: Vista frontal" disabled={saving} className="bg-card text-card-foreground border-card-foreground/50 h-9" /></FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                                <div className="col-span-1 flex justify-end gap-1">
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
                                            <div className="text-center py-4 text-sm text-card-foreground/70">
                                                Nenhuma foto adicionada.
                                            </div>
                                        )}
                                    </div>
                                    <Separator className="my-2 bg-card-foreground/20" />
                                    <div className="pt-2">
                                        <Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()} className="text-card-foreground hover:bg-card-foreground/10 hover:text-card-foreground">
                                            <Upload className="mr-2 h-4 w-4" />
                                            Adicionar Foto
                                        </Button>
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/jpeg,image/png,image/webp,image/jpg" />
                                    </div>
                                </div>
                            </CollapsibleFormSection>
                        </form>
                    </Form>
                </CardContent>
            </ScrollArea>
             <div className="p-6 flex justify-end gap-2 absolute bottom-0 w-full bg-card border-t">
                <Button type="button" variant="ghost" onClick={handleAttemptClose} disabled={saving}>
                    Cancelar
                </Button>
                <Button type="button" onClick={form.handleSubmit(handleCreate)} variant="secondary" className="text-black transition-transform duration-200 hover:scale-105" disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Salvando...' : 'Salvar Produto'}
                </Button>
            </div>
        </div>
    );
}
