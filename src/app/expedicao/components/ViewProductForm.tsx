'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Info, ChevronUp, Edit, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { Produto } from './ProductManagement';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EditProductForm, type EditFormHandle } from './EditProductForm';
import { Card, CardContent, CardHeader, CardTitle as CardTitleComponent } from '@/components/ui/card';

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

const InputWithUnit = ({ value, unit, disabled, id }: { value: any, unit: string, disabled?: boolean, id: string }) => (
    <div className="relative">
        <Input 
            type="number" 
            id={id}
            value={value ?? ''}
            disabled={disabled} 
            className="pr-12 text-black bg-background border-border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
        />
        <div className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-sm text-muted-foreground bg-gray-100 rounded-r-md border-l">
            {unit}
        </div>
    </div>
);

interface ViewProductFormProps {
    product: Produto;
    setOpen: (open: boolean) => void;
    onSaveSuccess: () => void;
}

export function ViewProductForm({ product: initialProduct, setOpen, onSaveSuccess }: ViewProductFormProps) {
    const { toast } = useToast();
    const [product, setProduct] = useState<Produto & { fotos?: any[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [isClosing, setIsClosing] = useState(false);
    const [isEditModeOpen, setEditModeOpen] = useState(false);
    const editFormRef = useRef<EditFormHandle>(null);
    
    const fetchProductData = useCallback(async () => {
        setLoading(true);
        try {
            const docRef = doc(db, 'produtos', initialProduct.id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setProduct({ id: docSnap.id, ...docSnap.data() } as Produto & { fotos?: any[] });
            } else {
                toast({ variant: 'destructive', title: 'Erro', description: 'Produto não encontrado.' });
                setOpen(false);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os dados do produto.' });
        } finally {
            setLoading(false);
        }
    }, [initialProduct.id, setOpen, toast]);

    useEffect(() => {
        fetchProductData();
    }, [fetchProductData]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setOpen(false);
        }, 500); 
    };

    const handleEditSaveSuccess = () => {
        onSaveSuccess();
        fetchProductData();
        setEditModeOpen(false);
    };

    const formatFileSize = (bytes?: number) => {
        if (bytes === undefined) return '';
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    
    if (loading || !product) {
        return (
            <div className="flex flex-col h-full bg-[#ededed]">
                <div className="p-6 flex-row items-center justify-between border-b bg-white shadow-md">
                    <h2 className="text-2xl font-semibold text-foreground">Carregando Dados...</h2>
                    <p className="text-sm text-muted-foreground">Aguarde enquanto carregamos as informações.</p>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <Skeleton className="h-32 w-full rounded-lg" />
                    <Skeleton className="h-64 w-full rounded-lg" />
                    <Skeleton className="h-64 w-full rounded-lg" />
                </div>
            </div>
        );
    }

    return (
        <div className={cn('h-full w-full flex flex-col', isClosing ? 'animate-slide-down' : 'animate-slide-up')}>
             <div className="w-full flex flex-col h-full bg-[#ededed]">
                <div className="p-6 flex flex-row items-center justify-between border-b bg-white shadow-md sticky top-0 z-10">
                    <div>
                        <h2 className="text-2xl font-semibold text-foreground">Visualizar Produto</h2>
                        <p className="text-sm text-muted-foreground">
                             Visualize os detalhes do produto. Clique em Editar para modificar.
                        </p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={handleClose} className="rounded-full text-foreground hover:bg-muted">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <CollapsibleCard title="Informações Básicas">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="col-span-3 sm:col-span-1">
                                <label className="text-sm font-medium leading-none text-black">Nome do Produto</label>
                                <Input id="nome" value={product.nome} disabled className="bg-background text-black border-border mt-2" />
                            </div>
                             <div>
                                <label className="text-sm font-medium leading-none text-black">SKU (Código)</label>
                                <Input id="sku" value={product.sku} disabled className="bg-background text-black border-border mt-2" />
                            </div>
                            <div>
                                <label className="text-sm font-medium leading-none text-black">Valor (R$)</label>
                                <Input id="valor" type="number" value={product.valor} disabled className="bg-background text-black border-border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none mt-2"/>
                            </div>
                            <div>
                                <label className="text-sm font-medium leading-none text-black">Unidade de Medida</label>
                                <Input id="unidadeMedida" value={(product as any).unidadeMedida || ''} disabled className="bg-background text-black border-border mt-2" />
                            </div>
                            <div>
                                <label className="text-sm font-medium leading-none text-black">Status</label>
                                <Select value={product.status} disabled>
                                    <SelectTrigger id="status" className="bg-background text-black border-border mt-2"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ativo">Ativo</SelectItem>
                                        <SelectItem value="inativo">Inativo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-3">
                                <label className="text-sm font-medium leading-none text-black">Observações do Produto</label>
                                <Textarea id="observacoes" value={(product as any).observacoes || ''} disabled className="bg-background text-black border-border mt-2"/>
                            </div>
                        </div>
                    </CollapsibleCard>

                    <CollapsibleCard title="Dados Fiscais">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                           <div>
                                <label className="text-sm font-medium leading-none text-black">CEST</label>
                                <Input id="cest" value={(product as any).cest || ''} disabled className="bg-background text-black border-border mt-2"/>
                            </div>
                            <div>
                                <label className="text-sm font-medium leading-none text-black">NCM</label>
                                <Input id="ncm" value={(product as any).ncm || ''} disabled className="bg-background text-black border-border mt-2"/>
                            </div>
                            <div>
                                <label className="text-sm font-medium leading-none text-black">Tipo de Produto</label>
                                <Input id="tipoProduto" value={(product as any).tipoProduto || ''} disabled className="bg-background text-black border-border mt-2"/>
                            </div>
                            <div>
                                <label className="text-sm font-medium leading-none text-black">Origem</label>
                                <Input id="origem" value={(product as any).origem || ''} disabled className="bg-background text-black border-border mt-2"/>
                            </div>
                        </div>
                    </CollapsibleCard>

                    <CollapsibleCard title="Pesos e Dimensões">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                            <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-sm font-medium leading-none text-black">Altura</label>
                                    <InputWithUnit id="altura" value={(product as any).altura} unit="cm" disabled/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium leading-none text-black">Largura</label>
                                    <InputWithUnit id="largura" value={(product as any).largura} unit="cm" disabled/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium leading-none text-black">Profundidade</label>
                                    <InputWithUnit id="profundidade" value={(product as any).profundidade} unit="cm" disabled/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium leading-none text-black">Volumes</label>
                                    <Input id="volumes" type="number" value={(product as any).volumes} disabled className="bg-background text-black border-border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium leading-none text-black">Peso Líquido</label>
                                    <InputWithUnit id="pesoLiquido" value={(product as any).pesoLiquido} unit="kg" disabled/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium leading-none text-black">Peso Bruto</label>
                                    <InputWithUnit id="pesoBruto" value={(product as any).pesoBruto} unit="kg" disabled/>
                                </div>
                            </div>
                            <div className="md:col-span-3 flex items-center justify-center">
                                <img src="https://placehold.co/200x150.png" width={200} height={150} alt="Ilustração de uma caixa com dimensões" data-ai-hint="package box" className="w-48 h-auto"/>
                            </div>
                        </div>
                    </CollapsibleCard>
                    
                    <CollapsibleCard title="Fotos">
                        <div className="p-4 rounded-md border bg-white text-black">
                            <div className="grid grid-cols-12 gap-4 px-2 py-1 text-sm font-medium text-black">
                                <div className="col-span-6 flex items-center">Foto</div>
                                <div className="col-span-6">Descrição</div>
                            </div>
                            <hr className="my-2 border-border" />
                            <div className="space-y-2">
                                {product.fotos && product.fotos.length > 0 ? product.fotos.map((foto, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-4 items-center p-2 rounded-md bg-black/5">
                                        <div className="col-span-6 flex items-center gap-2 text-sm text-black">
                                            <Paperclip className="h-4 w-4" />
                                            <span className="truncate">{foto.name || 'Foto Carregada'}</span>
                                            {foto.size && <span className="text-xs text-muted-foreground">({formatFileSize(foto.size)})</span>}
                                        </div>
                                        <div className="col-span-6">
                                            <Input value={foto.description || ''} disabled className="bg-background text-black border-border h-9" />
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-4 text-sm text-muted-foreground">
                                        Nenhuma foto adicionada.
                                    </div>
                                )}
                            </div>
                        </div>
                    </CollapsibleCard>
                </div>

                <div className="p-4 flex justify-end gap-2 mt-auto bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] border-t">
                    <Button type="button" variant="outline" onClick={handleClose}>
                        Fechar
                    </Button>
                    <Button type="button" variant="default" className="transition-transform duration-200 hover:scale-105" onClick={() => setEditModeOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                    </Button>
                </div>
            </div>
             <Dialog open={isEditModeOpen} onOpenChange={setEditModeOpen}>
                <DialogContent 
                    className="p-0 border-0 inset-0 h-full rounded-none"
                    onEscapeKeyDown={(e) => {
                         e.preventDefault();
                         editFormRef.current?.handleAttemptClose();
                    }}
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <EditProductForm ref={editFormRef} product={product} onSaveSuccess={handleEditSaveSuccess} setOpen={setEditModeOpen} />
                </DialogContent>
            </Dialog>
        </div>
    );
}
