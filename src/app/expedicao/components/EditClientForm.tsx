
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Separator } from '@/components/ui/separator';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { IMaskInput } from 'react-imask';
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CardContent } from '@/components/ui/card';
import type { Cliente } from './ClientManagement';
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
} from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';

const baseSchema = z.object({
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

interface EditClientFormProps {
    client: Cliente;
    setOpen: (open: boolean) => void;
    onSaveSuccess: () => void;
}

function ClientFormContent({ client, onSaveSuccess, setOpen }: { client: Cliente, onSaveSuccess: () => void, setOpen: (open: boolean) => void }) {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const [isAlertOpen, setAlertOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const form = useForm<z.infer<typeof clientSchema>>({
        resolver: zodResolver(clientSchema),
        defaultValues: {
            ...client,
            tipoPessoa: client.tipoPessoa || 'juridica',
        },
    });
    
    const { formState: { isDirty } } = form;
    
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setOpen(false);
        }, 500); // Animation duration
    };

    const handleAttemptClose = () => {
        if (isDirty) {
            setAlertOpen(true);
        } else {
            handleClose();
        }
    };

    const tipoPessoa = form.watch('tipoPessoa');

    const handleUpdateClient = async (formData: z.infer<typeof clientSchema>) => {
        setSaving(true);
        try {
            const dataToUpdate = {
                ...formData,
                cnpj: formData.cnpj?.replace(/\D/g, '') || '',
                cpf: formData.cpf?.replace(/\D/g, '') || '',
                responsavel: formData.responsavel || '',
                responsavelEmail: formData.responsavelEmail || '',
                responsavelTelefone: formData.responsavelTelefone || '',
            };

            const clientDocRef = doc(db, 'clientes', client.id);
            await updateDoc(clientDocRef, dataToUpdate);
            
            toast({ title: 'Cliente Atualizado!', description: 'Os dados do cliente foram atualizados com sucesso.' });
            onSaveSuccess();
            handleClose();

        } catch (error: any) {
            console.error("Update error: ", error);
            toast({ variant: 'destructive', title: 'Erro de Atualização', description: 'Ocorreu um erro ao atualizar o cliente.' });
        } finally {
            setSaving(false);
        }
    };
    
    return (
        <div 
            onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); handleAttemptClose(); } }}
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
                    <DialogTitle className="text-2xl">Editar Cliente</DialogTitle>
                    <DialogDescription>Modifique os detalhes do cliente abaixo.</DialogDescription>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={handleAttemptClose} className="rounded-full text-card-foreground hover:bg-card-foreground/10">
                    <X className="h-5 w-5" />
                </Button>
            </DialogHeader>
            <ScrollArea className="flex-grow h-[calc(100%-160px)]">
                <CardContent className="p-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleUpdateClient)}>
                            <FormField
                                control={form.control}
                                name="tipoPessoa"
                                render={({ field }) => (
                                    <FormItem className="mb-6">
                                        <FormLabel>Tipo de Pessoa</FormLabel>
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
                                                <FormItem className={cn("flex items-center space-x-3 space-y-0 rounded-md border p-4 transition-colors", field.value === 'juridica' && 'bg-accent text-accent-foreground')}>
                                                    <FormControl><RadioGroupItem value="juridica" id="juridica" className={cn(field.value === 'juridica' && 'border-white text-white')} /></FormControl>
                                                    <FormLabel htmlFor="juridica" className="cursor-pointer font-bold text-base">Pessoa Jurídica</FormLabel>
                                                </FormItem>
                                                <FormItem className={cn("flex items-center space-x-3 space-y-0 rounded-md border p-4 transition-colors", field.value === 'fisica' && 'bg-accent text-accent-foreground')}>
                                                    <FormControl><RadioGroupItem value="fisica" id="fisica" className={cn(field.value === 'fisica' && 'border-white text-white')} /></FormControl>
                                                    <FormLabel htmlFor="fisica" className="cursor-pointer font-bold text-base">Pessoa Física</FormLabel>
                                                </FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormSection title="Dados da Empresa">
                                {tipoPessoa === 'juridica' ? (
                                    <>
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
                                                <FormItem><FormLabel>CNPJ</FormLabel><FormControl><MaskedInput {...field} mask="00.000.000/0000-00" disabled={true} /></FormControl><FormMessage /></FormItem>
                                            )}/>
                                            <FormField control={form.control} name="inscricaoEstadual" render={({ field }) => (
                                                <FormItem><FormLabel>Inscrição Estadual</FormLabel><FormControl><Input {...field} disabled={saving} /></FormControl><FormMessage /></FormItem>
                                            )}/>
                                        </div>
                                    </>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="nomeCompleto" render={({ field }) => (
                                            <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} disabled={saving} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="cpf" render={({ field }) => (
                                            <FormItem><FormLabel>CPF</FormLabel><FormControl><MaskedInput {...field} mask="000.000.000-00" disabled={true} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <FormField control={form.control} name="email" render={({ field }) => (
                                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} disabled={saving} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="telefone" render={({ field }) => (
                                        <FormItem><FormLabel>Telefone</FormLabel><FormControl><MaskedInput {...field} mask={[{mask: '(00) 0000-0000'}, {mask: '(00) 00000-0000'}]} disabled={saving} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <FormField control={form.control} name="status" render={({ field }) => (
                                        <FormItem><FormLabel>Status</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={saving}>
                                                <FormControl>
                                                    <SelectTrigger className="text-black"><SelectValue placeholder="Selecione um status" /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="ativo">Ativo</SelectItem>
                                                    <SelectItem value="inativo">Inativo</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        <FormMessage /></FormItem>
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
                <Button type="button" onClick={form.handleSubmit(handleUpdateClient)} variant="secondary" className="text-black transition-transform duration-200 hover:scale-105" disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
            </div>
        </div>
    );
}

export function EditClientForm(props: EditClientFormProps) {
    const { client, ...rest } = props;
    const { toast } = useToast();
    const [fetchedClient, setFetchedClient] = useState<Cliente | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchClientData() {
            setLoading(true);
            try {
                const clientDocRef = doc(db, 'clientes', client.id);
                const docSnap = await getDoc(clientDocRef);
                if (docSnap.exists()) {
                    setFetchedClient({ id: docSnap.id, ...docSnap.data() } as Cliente);
                } else {
                    toast({ variant: 'destructive', title: 'Erro', description: 'Cliente não encontrado.' });
                    props.setOpen(false);
                }
            } catch (error) {
                toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os dados do cliente.' });
            } finally {
                setLoading(false);
            }
        }
        
        fetchClientData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [client.id]);

    if (loading || !fetchedClient) {
        return (
            <div className="p-6 h-full w-full bg-card">
                 <DialogHeader className="p-6 flex-row items-center justify-between">
                    <div>
                        <DialogTitle className="text-2xl">Editar Cliente</DialogTitle>
                        <DialogDescription>Modifique os detalhes do cliente abaixo.</DialogDescription>
                    </div>
                </DialogHeader>
                <div className="p-6 flex flex-col space-y-4">
                    <Skeleton className="h-[20px] w-32 rounded-xl" />
                    <Skeleton className="h-[20px] w-full rounded-xl" />
                    <Skeleton className="h-[20px] w-full rounded-xl" />
                </div>
            </div>
        );
    }
    
    return <ClientFormContent client={fetchedClient} {...rest} />;
}
