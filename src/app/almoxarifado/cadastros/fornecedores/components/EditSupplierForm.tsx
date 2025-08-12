'use client';
import { useState, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { IMaskInput } from 'react-imask';
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { X, AlertTriangle, Save, ChevronUp } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle as CardTitleComponent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { Fornecedor } from './SupplierManagement';

const supplierSchema = z.object({
    razaoSocial: z.string().min(1, "A razão social é obrigatória."),
    nomeFantasia: z.string().min(1, "O nome fantasia é obrigatório."),
    cnpj: z.string().min(1, "O CNPJ é obrigatório.").refine(val => val.replace(/\D/g, '').length === 14, "CNPJ deve ter 14 dígitos."),
    inscricaoEstadual: z.string().optional(),
    email: z.string().email("E-mail inválido.").optional().or(z.literal('')),
    telefone: z.string().min(1, "O telefone é obrigatório.").refine(val => {
        const digits = val.replace(/\D/g, '');
        return digits.length === 10 || digits.length === 11;
    }, "Telefone deve ter 10 ou 11 dígitos."),
    status: z.enum(['ativo', 'inativo']),
    
    cep: z.string().min(1, "O CEP é obrigatório.").refine(val => val.replace(/\D/g, '').length === 8, "CEP deve ter 8 dígitos."),
    logradouro: z.string().min(1, "O logradouro é obrigatório."),
    numero: z.string().min(1, "O número é obrigatório."),
    complemento: z.string().optional(),
    bairro: z.string().min(1, "O bairro é obrigatório."),
    cidade: z.string().min(1, "A cidade é obrigatória."),
    estado: z.string().min(1, "O estado é obrigatório."),

    responsavel: z.string().optional(),
    responsavelEmail: z.string().email("E-mail do responsável inválido.").optional().or(z.literal('')),
    responsavelTelefone: z.string().optional(),
});


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
            <CollapsibleContent>
                <CardContent>{children}</CardContent>
            </CollapsibleContent>
        </Collapsible>
    </Card>
);

export interface EditFormHandle {
    handleAttemptClose: () => void;
}

interface EditSupplierFormProps {
    supplier: Fornecedor;
    setOpen: (open: boolean) => void;
    onSaveSuccess: () => void;
}

export const EditSupplierForm = forwardRef<EditFormHandle, EditSupplierFormProps>(({ supplier, onSaveSuccess, setOpen }, ref) => {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const [isAlertOpen, setAlertOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const form = useForm<z.infer<typeof supplierSchema>>({
        resolver: zodResolver(supplierSchema),
        defaultValues: {
            ...supplier,
            status: supplier.status || 'ativo',
        },
    });

    const { formState: { isDirty } } = form;
    
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setOpen(false);
        }, 500); 
    };

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

    const handleUpdate = async (formData: z.infer<typeof supplierSchema>) => {
        setSaving(true);
        try {
            const dataToUpdate = {
                ...formData,
                cnpj: formData.cnpj.replace(/\D/g, ''),
                responsavel: formData.responsavel || '',
                responsavelEmail: formData.responsavelEmail || '',
                responsavelTelefone: formData.responsavelTelefone || '',
            };

            const docRef = doc(db, 'fornecedores_almoxarifado', supplier.id);
            await updateDoc(docRef, dataToUpdate);
            
            toast({ title: 'Fornecedor Atualizado!', description: 'Os dados foram atualizados com sucesso.' });
            onSaveSuccess();
            handleClose();

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro de Atualização', description: 'Ocorreu um erro ao atualizar os dados.' });
        } finally {
            setSaving(false);
        }
    };
    
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
                        <h2 className="text-2xl font-semibold text-foreground">Editar Fornecedor</h2>
                        <p className="text-sm text-muted-foreground">
                             Modifique os detalhes do fornecedor abaixo.
                        </p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={handleAttemptClose} className="rounded-full text-foreground hover:bg-muted">
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                
                <Form {...form}>
                    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(handleUpdate)(); }} className="flex flex-col flex-1 overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <CollapsibleCard title="Dados Principais" defaultOpen={true}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="razaoSocial" render={({ field }) => (
                                        <FormItem><FormLabel className="text-black">Razão Social</FormLabel><FormControl><Input {...field} disabled={saving} className="bg-background text-black border-border placeholder:text-muted-foreground" /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="nomeFantasia" render={({ field }) => (
                                        <FormItem><FormLabel className="text-black">Nome Fantasia</FormLabel><FormControl><Input {...field} disabled={saving} className="bg-background text-black border-border placeholder:text-muted-foreground" /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <FormField control={form.control} name="cnpj" render={({ field }) => (
                                        <FormItem><FormLabel className="text-black">CNPJ</FormLabel><FormControl><MaskedInput {...field} mask="00.000.000/0000-00" disabled={true} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="inscricaoEstadual" render={({ field }) => (
                                        <FormItem><FormLabel className="text-black">Inscrição Estadual</FormLabel><FormControl><Input {...field} disabled={saving} className="bg-background text-black border-border placeholder:text-muted-foreground"/></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <FormField control={form.control} name="email" render={({ field }) => (
                                        <FormItem><FormLabel className="text-black">Email</FormLabel><FormControl><Input type="email" {...field} disabled={saving} className="bg-background text-black border-border placeholder:text-muted-foreground"/></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="telefone" render={({ field }) => (
                                        <FormItem><FormLabel className="text-black">Telefone</FormLabel><FormControl><MaskedInput {...field} mask={[{mask: '(00) 0000-0000'}, {mask: '(00) 00000-0000'}]} disabled={saving} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <FormField control={form.control} name="status" render={({ field }) => (
                                        <FormItem><FormLabel className="text-black">Status</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={saving}>
                                                <FormControl>
                                                    <SelectTrigger className="text-black bg-background border-border"><SelectValue placeholder="Selecione um status" /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="ativo">Ativo</SelectItem>
                                                    <SelectItem value="inativo">Inativo</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        <FormMessage /></FormItem>
                                    )}/>
                                </div>
                            </CollapsibleCard>
                            
                            <CollapsibleCard title="Endereço">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <FormField control={form.control} name="cep" render={({ field }) => (
                                        <FormItem className="sm:col-span-1"><FormLabel className="text-black">CEP</FormLabel><FormControl><MaskedInput {...field} mask="00000-000" disabled={saving} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="logradouro" render={({ field }) => (
                                        <FormItem className="sm:col-span-2"><FormLabel className="text-black">Logradouro</FormLabel><FormControl><Input {...field} disabled={saving} className="bg-background text-black border-border placeholder:text-muted-foreground"/></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                    <FormField control={form.control} name="numero" render={({ field }) => (
                                        <FormItem><FormLabel className="text-black">Número</FormLabel><FormControl><Input {...field} disabled={saving} className="bg-background text-black border-border placeholder:text-muted-foreground"/></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="complemento" render={({ field }) => (
                                        <FormItem><FormLabel className="text-black">Complemento</FormLabel><FormControl><Input {...field} disabled={saving} className="bg-background text-black border-border placeholder:text-muted-foreground"/></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="bairro" render={({ field }) => (
                                        <FormItem><FormLabel className="text-black">Bairro</FormLabel><FormControl><Input {...field} disabled={saving} className="bg-background text-black border-border placeholder:text-muted-foreground"/></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <FormField control={form.control} name="cidade" render={({ field }) => (
                                        <FormItem><FormLabel className="text-black">Cidade</FormLabel><FormControl><Input {...field} disabled={saving} className="bg-background text-black border-border placeholder:text-muted-foreground"/></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="estado" render={({ field }) => (
                                        <FormItem><FormLabel className="text-black">Estado (UF)</FormLabel><FormControl><Input {...field} disabled={saving} maxLength={2} className="bg-background text-black border-border placeholder:text-muted-foreground"/></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                            </CollapsibleCard>
                            
                            <CollapsibleCard title="Contato do Responsável">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField control={form.control} name="responsavel" render={({ field }) => (
                                        <FormItem><FormLabel className="text-black">Nome do Responsável</FormLabel><FormControl><Input {...field} disabled={saving} className="bg-background text-black border-border placeholder:text-muted-foreground"/></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="responsavelEmail" render={({ field }) => (
                                        <FormItem><FormLabel className="text-black">E-mail do Responsável</FormLabel><FormControl><Input type="email" {...field} disabled={saving} className="bg-background text-black border-border placeholder:text-muted-foreground"/></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="responsavelTelefone" render={({ field }) => (
                                        <FormItem><FormLabel className="text-black">Contato do Responsável</FormLabel><FormControl><MaskedInput {...field} mask={[{mask: '(00) 0000-0000'}, {mask: '(00) 00000-0000'}]} disabled={saving} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                            </CollapsibleCard>
                        </div>
                        <div className="p-4 flex justify-end gap-2 mt-auto bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] border-t">
                            <Button type="button" variant="ghost" onClick={handleAttemptClose} disabled={saving}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant="default" className="transition-transform duration-200 hover:scale-105" disabled={saving || !isDirty}>
                                <Save className="mr-2 h-4 w-4" />
                                {saving ? 'Salvando...' : 'Salvar Alterações'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
});
EditSupplierForm.displayName = 'EditSupplierForm';
