
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Separator } from '@/components/ui/separator';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { IMaskInput } from 'react-imask';
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { X, AlertTriangle } from 'lucide-react';
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
    
    // Endereço
    cep: z.string().min(1, "O CEP é obrigatório.").refine(val => val.replace(/\D/g, '').length === 8, "CEP deve ter 8 dígitos."),
    logradouro: z.string().min(1, "O logradouro é obrigatório."),
    numero: z.string().min(1, "O número é obrigatório."),
    complemento: z.string().optional(),
    bairro: z.string().min(1, "O bairro é obrigatório."),
    cidade: z.string().min(1, "A cidade é obrigatória."),
    estado: z.string().min(1, "O estado é obrigatório."),

    // Contato
    responsavel: z.string().optional(),
    responsavelEmail: z.string().email("E-mail do responsável inválido.").optional().or(z.literal('')),
    responsavelTelefone: z.string().optional(),
});


const FormSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <>
        <Separator className="my-6" />
        <h3 className="text-lg font-semibold mb-4 text-primary-foreground">{title}</h3>
        {children}
    </>
);

const MaskedInput = React.forwardRef<HTMLInputElement, any>(
  ({ onChange, ...props }, ref) => {
    return (
      <IMaskInput
        {...props}
        inputRef={ref as React.Ref<HTMLInputElement>}
        onAccept={(value: any) => onChange({ target: { name: props.name, value } })}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-black ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
    );
  }
);
MaskedInput.displayName = "MaskedInput";

interface NewSupplierFormProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    onSaveSuccess: () => void;
    isClosing: boolean;
    handleClose: () => void;
}

export function NewSupplierForm({ open, setOpen, onSaveSuccess, isClosing, handleClose }: NewSupplierFormProps) {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const [isAlertOpen, setAlertOpen] = useState(false);

    const form = useForm<z.infer<typeof supplierSchema>>({
        resolver: zodResolver(supplierSchema),
        defaultValues: {
            razaoSocial: '',
            nomeFantasia: '',
            cnpj: '',
            inscricaoEstadual: '',
            email: '',
            telefone: '',
            cep: '',
            logradouro: '',
            numero: '',
            complemento: '',
            bairro: '',
            cidade: '',
            estado: '',
            responsavel: '',
            responsavelEmail: '',
            responsavelTelefone: '',
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

    const handleCreate = async (formData: z.infer<typeof supplierSchema>) => {
        setSaving(true);
        const cnpjDigits = formData.cnpj.replace(/\D/g, '');
        
        try {
            const cnpjQuery = query(collection(db, 'fornecedores'), where('cnpj', '==', cnpjDigits));
            const cnpjQuerySnapshot = await getDocs(cnpjQuery);
            if (!cnpjQuerySnapshot.empty) {
                toast({ variant: 'destructive', title: 'Erro de Criação', description: 'Este CNPJ já está cadastrado.' });
                setSaving(false);
                return;
            }

            const docRef = doc(db, 'fornecedores', cnpjDigits);
            await setDoc(docRef, {
                ...formData,
                cnpj: cnpjDigits,
                status: 'ativo',
                responsavel: formData.responsavel || '',
                responsavelEmail: formData.responsavelEmail || '',
                responsavelTelefone: formData.responsavelTelefone || '',
            });
            
            toast({ title: 'Fornecedor Criado!', description: 'O novo fornecedor foi adicionado com sucesso.' });
            onSaveSuccess();
            handleClose();

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro de Criação', description: 'Ocorreu um erro ao criar o fornecedor.' });
        } finally {
            setSaving(false);
        }
    };
    
    useEffect(() => {
        if (!open) {
            form.reset();
        }
    }, [open, form]);

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
                    <DialogTitle className="text-2xl">Adicionar Novo Fornecedor</DialogTitle>
                    <DialogDescription>Preencha os detalhes abaixo para criar um novo fornecedor.</DialogDescription>
                 </div>
                <Button type="button" variant="ghost" size="icon" onClick={handleAttemptClose} className="rounded-full text-card-foreground hover:bg-card-foreground/10">
                    <X className="h-5 w-5" />
                </Button>
            </DialogHeader>
            <ScrollArea className="flex-grow h-[calc(100%-160px)]">
                <CardContent className="p-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleCreate)}>
                            <FormSection title="Dados da Empresa">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="razaoSocial" render={({ field }) => (
                                        <FormItem><FormLabel>Razão Social</FormLabel><FormControl><Input {...field} disabled={saving} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="nomeFantasia" render={({ field }) => (
                                        <FormItem><FormLabel>Nome Fantasia</FormLabel><FormControl><Input {...field} disabled={saving} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <FormField control={form.control} name="cnpj" render={({ field }) => (
                                        <FormItem><FormLabel>CNPJ</FormLabel><FormControl><MaskedInput {...field} mask="00.000.000/0000-00" disabled={saving} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="inscricaoEstadual" render={({ field }) => (
                                        <FormItem><FormLabel>Inscrição Estadual</FormLabel><FormControl><Input {...field} disabled={saving} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <FormField control={form.control} name="email" render={({ field }) => (
                                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} disabled={saving} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="telefone" render={({ field }) => (
                                        <FormItem><FormLabel>Telefone</FormLabel><FormControl><MaskedInput {...field} mask={[{mask: '(00) 0000-0000'}, {mask: '(00) 00000-0000'}]} disabled={saving} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                            </FormSection>
                            
                            <FormSection title="Endereço">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <FormField control={form.control} name="cep" render={({ field }) => (
                                        <FormItem className="sm:col-span-1"><FormLabel>CEP</FormLabel><FormControl><MaskedInput {...field} mask="00000-000" disabled={saving} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="logradouro" render={({ field }) => (
                                        <FormItem className="sm:col-span-2"><FormLabel>Logradouro</FormLabel><FormControl><Input {...field} disabled={saving} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                    <FormField control={form.control} name="numero" render={({ field }) => (
                                        <FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} disabled={saving} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="complemento" render={({ field }) => (
                                        <FormItem><FormLabel>Complemento</FormLabel><FormControl><Input {...field} disabled={saving} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="bairro" render={({ field }) => (
                                        <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} disabled={saving} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <FormField control={form.control} name="cidade" render={({ field }) => (
                                        <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} disabled={saving} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="estado" render={({ field }) => (
                                        <FormItem><FormLabel>Estado (UF)</FormLabel><FormControl><Input {...field} disabled={saving} maxLength={2} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                            </FormSection>
                            
                            <FormSection title="Contato">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField control={form.control} name="responsavel" render={({ field }) => (
                                        <FormItem><FormLabel>Nome do Responsável</FormLabel><FormControl><Input {...field} disabled={saving} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="responsavelEmail" render={({ field }) => (
                                        <FormItem><FormLabel>E-mail do Responsável</FormLabel><FormControl><Input type="email" {...field} disabled={saving} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="responsavelTelefone" render={({ field }) => (
                                        <FormItem><FormLabel>Contato do Responsável</FormLabel><FormControl><MaskedInput {...field} mask={[{mask: '(00) 0000-0000'}, {mask: '(00) 00000-0000'}]} disabled={saving} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                            </FormSection>
                        </form>
                    </Form>
                </CardContent>
            </ScrollArea>
             <div className="p-6 flex justify-end gap-2 absolute bottom-0 w-full bg-card border-t">
                <Button type="button" variant="ghost" onClick={handleAttemptClose} disabled={saving}>
                    Cancelar
                </Button>
                <Button type="button" onClick={form.handleSubmit(handleCreate)} variant="secondary" className="text-black transition-transform duration-200 hover:scale-105" disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar Fornecedor'}
                </Button>
            </div>
        </div>
    );
}
