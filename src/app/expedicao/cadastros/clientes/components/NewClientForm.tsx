'use client';
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { IMaskInput } from 'react-imask';
import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle as CardTitleComponent } from '@/components/ui/card';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const baseSchema = z.object({
    inscricaoEstadual: z.string().optional(),
    email: z.string().email("E-mail inválido.").optional().or(z.literal('')),
    telefone: z.string().min(1, "O telefone é obrigatório.").refine(val => {
        const digits = val.replace(/\D/g, '');
        return digits.length === 10 || digits.length === 11;
    }, "Telefone deve ter 10 ou 11 dígitos."),
    
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

const clientSchema = z.discriminatedUnion("tipoPessoa", [
    z.object({
        tipoPessoa: z.literal('juridica'),
        razaoSocial: z.string().min(1, "A razão social é obrigatória."),
        nomeFantasia: z.string().min(1, "O nome fantasia é obrigatório."),
        cnpj: z.string().min(1, "O CNPJ é obrigatório.").refine(val => val.replace(/\D/g, '').length === 14, "CNPJ deve ter 14 dígitos."),
        cpf: z.string().optional(),
        nomeCompleto: z.string().optional(),
    }).merge(baseSchema),
    z.object({
        tipoPessoa: z.literal('fisica'),
        nomeCompleto: z.string().min(1, "O nome completo é obrigatório."),
        cpf: z.string().min(1, "O CPF é obrigatório.").refine(val => val.replace(/\D/g, '').length === 11, "CPF deve ter 11 dígitos."),
        razaoSocial: z.string().optional(),
        nomeFantasia: z.string().optional(),
        cnpj: z.string().optional(),
    }).merge(baseSchema),
]);


const MaskedInput = React.forwardRef<HTMLInputElement, any>(
  ({ onChange, ...props }, ref) => {
    return (
      <IMaskInput
        {...props}
        inputRef={ref as React.Ref<HTMLInputElement>}
        onAccept={(value: any) => onChange({ target: { name: props.name, value } })}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-black ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
    );
  }
);
MaskedInput.displayName = "MaskedInput";

export interface NewClientFormHandle {
    handleAttemptClose: () => void;
}

interface NewClientFormProps {
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
            <CollapsibleContent className="data-[state=open]:animate-slide-down-slow">
                <CardContent>{children}</CardContent>
            </CollapsibleContent>
        </Collapsible>
    </Card>
);

export const NewClientForm = forwardRef<NewClientFormHandle, NewClientFormProps>(({ open, setOpen, onSaveSuccess, isClosing, handleClose }, ref) => {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const [isAlertOpen, setAlertOpen] = useState(false);

    const form = useForm<z.infer<typeof clientSchema>>({
        resolver: zodResolver(clientSchema),
        defaultValues: {
            tipoPessoa: 'juridica',
            razaoSocial: '',
            nomeFantasia: '',
            cnpj: '',
            nomeCompleto: '',
            cpf: '',
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

    useImperativeHandle(ref, () => ({
        handleAttemptClose,
    }));

    const tipoPessoa = form.watch('tipoPessoa');

    const handleCreateClient = async (formData: z.infer<typeof clientSchema>) => {
        setSaving(true);
        const identifier = (formData.tipoPessoa === 'juridica' ? formData.cnpj : formData.cpf)?.replace(/\D/g, '') || '';
        
        if (!identifier) {
             toast({ variant: 'destructive', title: 'Erro de Criação', description: 'CNPJ ou CPF deve ser preenchido.' });
             setSaving(false);
             return;
        }

        try {
            const fieldToCheck = formData.tipoPessoa === 'juridica' ? 'cnpj' : 'cpf';
            const q = query(collection(db, 'clientes_expedicao'), where(fieldToCheck, '==', identifier));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                toast({ variant: 'destructive', title: 'Erro de Criação', description: `Este ${fieldToCheck.toUpperCase()} já está cadastrado.` });
                setSaving(false);
                return;
            }

            const docRef = doc(db, 'clientes_expedicao', identifier);
            await setDoc(docRef, {
                ...formData,
                cnpj: formData.cnpj?.replace(/\D/g, '') || '',
                cpf: formData.cpf?.replace(/\D/g, '') || '',
                status: 'ativo',
            });
            
            toast({ title: 'Cliente Criado!', description: 'O novo cliente foi adicionado com sucesso.' });
            onSaveSuccess();
            handleClose();

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro de Criação', description: 'Ocorreu um erro ao criar o cliente.' });
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
                        <h2 className="text-2xl font-semibold text-foreground">Adicionar Novo Cliente</h2>
                        <p className="text-sm text-muted-foreground">Preencha os detalhes abaixo para criar um novo cliente.</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={handleAttemptClose} className="rounded-full text-foreground hover:bg-muted">
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleCreateClient)} className="flex flex-col flex-1 overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <CollapsibleCard title="Tipo de Pessoa" defaultOpen={true}>
                                <FormField
                                    control={form.control}
                                    name="tipoPessoa"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <RadioGroup
                                                    onValueChange={(value) => {
                                                        field.onChange(value);
                                                        form.setValue('cnpj', '');
                                                        form.setValue('cpf', '');
                                                        form.setValue('razaoSocial', '');
                                                        form.setValue('nomeFantasia', '');
                                                        form.setValue('nomeCompleto', '');
                                                    }}
                                                    defaultValue={field.value}
                                                    className="grid grid-cols-2 gap-4"
                                                    disabled={saving}
                                                >
                                                    <FormItem className={cn("flex items-center space-x-3 space-y-0 rounded-md border p-4 transition-colors border-border", field.value === 'juridica' && 'border-primary bg-primary/10')}>
                                                        <FormControl><RadioGroupItem value="juridica" id="juridica" /></FormControl>
                                                        <FormLabel htmlFor="juridica" className="cursor-pointer font-bold text-base text-black">Pessoa Jurídica</FormLabel>
                                                    </FormItem>
                                                    <FormItem className={cn("flex items-center space-x-3 space-y-0 rounded-md border p-4 transition-colors border-border", field.value === 'fisica' && 'border-primary bg-primary/10')}>
                                                        <FormControl><RadioGroupItem value="fisica" id="fisica" /></FormControl>
                                                        <FormLabel htmlFor="fisica" className="cursor-pointer font-bold text-base text-black">Pessoa Física</FormLabel>
                                                    </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CollapsibleCard>

                            <CollapsibleCard title="Dados Principais" defaultOpen={true}>
                                {tipoPessoa === 'juridica' ? (
                                    <>
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
                                                <FormItem><FormLabel className="text-black">CNPJ</FormLabel><FormControl><MaskedInput {...field} mask="00.000.000/0000-00" disabled={saving} /></FormControl><FormMessage /></FormItem>
                                            )}/>
                                            <FormField control={form.control} name="inscricaoEstadual" render={({ field }) => (
                                                <FormItem><FormLabel className="text-black">Inscrição Estadual</FormLabel><FormControl><Input {...field} disabled={saving} className="bg-background text-black border-border placeholder:text-muted-foreground" /></FormControl><FormMessage /></FormItem>
                                            )}/>
                                        </div>
                                    </>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="nomeCompleto" render={({ field }) => (
                                            <FormItem><FormLabel className="text-black">Nome Completo</FormLabel><FormControl><Input {...field} disabled={saving} className="bg-background text-black border-border placeholder:text-muted-foreground" /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="cpf" render={({ field }) => (
                                            <FormItem><FormLabel className="text-black">CPF</FormLabel><FormControl><MaskedInput {...field} mask="000.000.000-00" disabled={saving} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <FormField control={form.control} name="email" render={({ field }) => (
                                        <FormItem><FormLabel className="text-black">Email</FormLabel><FormControl><Input type="email" {...field} disabled={saving} className="bg-background text-black border-border placeholder:text-muted-foreground" /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="telefone" render={({ field }) => (
                                        <FormItem><FormLabel className="text-black">Telefone</FormLabel><FormControl><MaskedInput {...field} mask={[{mask: '(00) 0000-0000'}, {mask: '(00) 00000-0000'}]} disabled={saving} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                            </CollapsibleCard>
                            
                            <CollapsibleCard title="Endereço">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <FormField control={form.control} name="cep" render={({ field }) => (
                                        <FormItem className="sm:col-span-1"><FormLabel className="text-black">CEP</FormLabel><FormControl><MaskedInput {...field} mask="00000-000" disabled={saving} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="logradouro" render={({ field }) => (
                                        <FormItem className="sm:col-span-2"><FormLabel className="text-black">Logradouro</FormLabel><FormControl><Input {...field} disabled={saving} className="bg-background text-black border-border placeholder:text-muted-foreground" /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                    <FormField control={form.control} name="numero" render={({ field }) => (
                                        <FormItem><FormLabel className="text-black">Número</FormLabel><FormControl><Input {...field} disabled={saving} className="bg-background text-black border-border placeholder:text-muted-foreground" /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="complemento" render={({ field }) => (
                                        <FormItem><FormLabel className="text-black">Complemento</FormLabel><FormControl><Input {...field} disabled={saving} className="bg-background text-black border-border placeholder:text-muted-foreground" /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="bairro" render={({ field }) => (
                                        <FormItem><FormLabel className="text-black">Bairro</FormLabel><FormControl><Input {...field} disabled={saving} className="bg-background text-black border-border placeholder:text-muted-foreground" /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <FormField control={form.control} name="cidade" render={({ field }) => (
                                        <FormItem><FormLabel className="text-black">Cidade</FormLabel><FormControl><Input {...field} disabled={saving} className="bg-background text-black border-border placeholder:text-muted-foreground" /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="estado" render={({ field }) => (
                                        <FormItem><FormLabel className="text-black">Estado (UF)</FormLabel><FormControl><Input {...field} disabled={saving} maxLength={2} className="bg-background text-black border-border placeholder:text-muted-foreground" /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                            </CollapsibleCard>
                            
                            <CollapsibleCard title="Contato do Responsável">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField control={form.control} name="responsavel" render={({ field }) => (
                                        <FormItem><FormLabel className="text-black">Nome do Responsável</FormLabel><FormControl><Input {...field} disabled={saving} className="bg-background text-black border-border placeholder:text-muted-foreground" /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="responsavelEmail" render={({ field }) => (
                                        <FormItem><FormLabel className="text-black">E-mail do Responsável</FormLabel><FormControl><Input type="email" {...field} disabled={saving} className="bg-background text-black border-border placeholder:text-muted-foreground" /></FormControl><FormMessage /></FormItem>
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
                            <Button type="submit" variant="default" className="transition-transform duration-200 hover:scale-105" disabled={saving}>
                                <Save className="mr-2 h-4 w-4" />
                                {saving ? 'Salvando Cliente...' : 'Salvar Cliente'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
});
NewClientForm.displayName = "NewClientForm";
