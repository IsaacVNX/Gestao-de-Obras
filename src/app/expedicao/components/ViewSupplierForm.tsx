'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { IMaskInput } from 'react-imask';
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { X, ChevronUp, Edit } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle as CardTitleComponent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { Fornecedor } from './SupplierManagement';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EditSupplierForm, type EditFormHandle } from './EditSupplierForm';

const MaskedInput = React.forwardRef<HTMLInputElement, any>(
  ({ onChange, ...props }, ref) => {
    return (
      <IMaskInput
        {...props}
        inputRef={ref as React.Ref<HTMLInputElement>}
        onAccept={(value: any) => onChange?.({ target: { name: props.name, value } })}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-black ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
    );
  }
);
MaskedInput.displayName = "MaskedInput";

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

interface ViewSupplierFormProps {
    supplier: Fornecedor;
    setOpen: (open: boolean) => void;
    onSaveSuccess: () => void;
}

export function ViewSupplierForm(props: ViewSupplierFormProps) {
    const { supplier: initialSupplier } = props;
    const { toast } = useToast();
    const [supplier, setSupplier] = useState<(Fornecedor & { [key: string]: any }) | null>(initialSupplier);
    const [loading, setLoading] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [isEditModeOpen, setEditModeOpen] = useState(false);
    const editFormRef = useRef<EditFormHandle>(null);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            props.setOpen(false);
        }, 500); 
    };
    
    const fetchSupplierData = useCallback(async () => {
        if (!initialSupplier.id) return;
        setLoading(true);
        try {
            const docRef = doc(db, 'fornecedores', initialSupplier.id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setSupplier({ id: docSnap.id, ...docSnap.data() } as Fornecedor);
            } else {
                toast({ variant: 'destructive', title: 'Erro', description: 'Fornecedor não encontrado.' });
                props.setOpen(false);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os dados.' });
        } finally {
            setLoading(false);
        }
    }, [initialSupplier.id, props, toast]);

    const handleEditSaveSuccess = () => {
        props.onSaveSuccess();
        fetchSupplierData();
        setEditModeOpen(false); 
    };

    useEffect(() => {
        fetchSupplierData();
    }, [fetchSupplierData]);


    if (loading || !supplier) {
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
                        <h2 className="text-2xl font-semibold text-foreground">Visualizar Fornecedor</h2>
                        <p className="text-sm text-muted-foreground">
                             Visualize os detalhes do fornecedor. Clique em Editar para modificar.
                        </p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={handleClose} className="rounded-full text-foreground hover:bg-muted">
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <CollapsibleCard title="Dados Principais" defaultOpen={true}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="text-sm font-medium">Razão Social</label><Input value={supplier.razaoSocial || ''} disabled className="mt-2 bg-background text-black" /></div>
                            <div><label className="text-sm font-medium">Nome Fantasia</label><Input value={supplier.nomeFantasia || ''} disabled className="mt-2 bg-background text-black" /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div><label className="text-sm font-medium">CNPJ</label><MaskedInput value={supplier.cnpj || ''} mask="00.000.000/0000-00" disabled className="mt-2" /></div>
                            <div><label className="text-sm font-medium">Inscrição Estadual</label><Input value={supplier.inscricaoEstadual || ''} disabled className="mt-2 bg-background text-black" /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                             <div><label className="text-sm font-medium">Email</label><Input value={supplier.email || ''} disabled className="mt-2 bg-background text-black" /></div>
                            <div><label className="text-sm font-medium">Telefone</label><MaskedInput value={supplier.telefone || ''} mask={[{mask: '(00) 0000-0000'}, {mask: '(00) 00000-0000'}]} disabled className="mt-2" /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div><label className="text-sm font-medium">Status</label>
                                <Select value={supplier.status || 'ativo'} disabled>
                                    <SelectTrigger className="mt-2 text-black bg-background"><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="ativo">Ativo</SelectItem><SelectItem value="inativo">Inativo</SelectItem></SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CollapsibleCard>

                    <CollapsibleCard title="Endereço">
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-1"><label className="text-sm font-medium">CEP</label><MaskedInput value={supplier.cep || ''} mask="00000-000" disabled className="mt-2" /></div>
                            <div className="sm:col-span-2"><label className="text-sm font-medium">Logradouro</label><Input value={supplier.logradouro || ''} disabled className="mt-2 bg-background text-black" /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                             <div><label className="text-sm font-medium">Número</label><Input value={supplier.numero || ''} disabled className="mt-2 bg-background text-black" /></div>
                             <div><label className="text-sm font-medium">Complemento</label><Input value={supplier.complemento || ''} disabled className="mt-2 bg-background text-black" /></div>
                             <div><label className="text-sm font-medium">Bairro</label><Input value={supplier.bairro || ''} disabled className="mt-2 bg-background text-black" /></div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                             <div><label className="text-sm font-medium">Cidade</label><Input value={supplier.cidade || ''} disabled className="mt-2 bg-background text-black" /></div>
                             <div><label className="text-sm font-medium">Estado (UF)</label><Input value={supplier.estado || ''} disabled maxLength={2} className="mt-2 bg-background text-black" /></div>
                        </div>
                    </CollapsibleCard>

                    <CollapsibleCard title="Contato do Responsável">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div><label className="text-sm font-medium">Nome</label><Input value={supplier.responsavel || ''} disabled className="mt-2 bg-background text-black" /></div>
                            <div><label className="text-sm font-medium">E-mail</label><Input value={supplier.responsavelEmail || ''} disabled className="mt-2 bg-background text-black" /></div>
                            <div><label className="text-sm font-medium">Telefone</label><MaskedInput value={supplier.responsavelTelefone || ''} mask={[{mask: '(00) 0000-0000'}, {mask: '(00) 00000-0000'}]} disabled className="mt-2" /></div>
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
                     <EditSupplierForm ref={editFormRef} supplier={supplier} onSaveSuccess={handleEditSaveSuccess} setOpen={setEditModeOpen}/>
                </DialogContent>
            </Dialog>
        </div>
    );
}
