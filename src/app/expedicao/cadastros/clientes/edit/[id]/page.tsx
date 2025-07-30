
'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import AppLayout from '@/components/AppLayout';
import { Separator } from '@/components/ui/separator';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { IMaskInput } from 'react-imask';
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';


const clientSchema = z.object({
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


export default function EditClientPage() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const clientId = params.id as string;
    const { toast } = useToast();
    
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const form = useForm<z.infer<typeof clientSchema>>({
        resolver: zodResolver(clientSchema),
        defaultValues: {},
    });

     useEffect(() => {
        if (!clientId) return;
        
        async function fetchClientData() {
            setLoading(true);
            try {
                const clientDocRef = doc(db, 'clientes', clientId);
                const docSnap = await getDoc(clientDocRef);
                if (docSnap.exists()) {
                    const clientData = docSnap.data();
                    // Populate form with fetched data
                    Object.entries(clientData).forEach(([key, value]) => {
                        form.setValue(key as keyof z.infer<typeof clientSchema>, value);
                    });
                } else {
                    toast({ variant: 'destructive', title: 'Erro', description: 'Cliente não encontrado.' });
                    router.push('/expedicao/cadastros/clientes');
                }
            } catch (error) {
                toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os dados do cliente.' });
            } finally {
                setLoading(false);
            }
        }
        
        fetchClientData();
    }, [clientId, form, toast, router]);


    const handleUpdateClient = async (formData: z.infer<typeof clientSchema>) => {
        setSaving(true);
        try {
            const dataToUpdate = {
                ...formData,
                cnpj: formData.cnpj.replace(/\D/g, ''), // Remove mask before saving
                responsavel: formData.responsavel || '',
                responsavelEmail: formData.responsavelEmail || '',
                responsavelTelefone: formData.responsavelTelefone || '',
            };

            const clientDocRef = doc(db, 'clientes', clientId);
            await updateDoc(clientDocRef, dataToUpdate);
            
            toast({ title: 'Cliente Atualizado!', description: 'Os dados do cliente foram atualizados com sucesso.' });
            router.push('/expedicao/cadastros/clientes');

        } catch (error: any) {
            console.error("Update error: ", error);
            toast({ variant: 'destructive', title: 'Erro de Atualização', description: 'Ocorreu um erro ao atualizar o cliente.' });
        } finally {
            setSaving(false);
        }
    };
    
    if (loading) {
        return (
            <AppLayout>
                <Card className="max-w-4xl mx-auto p-6 space-y-4">
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-3/4 mb-6" />
                    <div className="space-y-6">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </Card>
            </AppLayout>
        )
    }

    if (!user || (user.role !== 'admin' && user.role !== 'gestor')) {
        return (
            <AppLayout>
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle>Acesso Negado</CardTitle>
                        <CardDescription>Você não tem permissão para editar clientes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.back()}>Voltar</Button>
                    </CardContent>
                </Card>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle className="text-2xl">Editar Cliente</CardTitle>
                    <CardDescription className="text-card-foreground">Modifique os detalhes do cliente abaixo.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleUpdateClient)}>
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
                                    <FormItem><FormLabel>CNPJ</FormLabel><FormControl><MaskedInput {...field} mask="00.000.000/0000-00" disabled={true} /></FormControl><FormMessage /></FormItem>
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

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="ghost" onClick={() => router.push('/expedicao/cadastros/clientes')} disabled={saving}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant="secondary" className="text-black transition-transform duration-200 hover:scale-105" disabled={saving}>
                                {saving ? 'Salvando...' : 'Salvar Alterações'}
                            </Button>
                        </div>
                    </form>
                    </Form>
                </CardContent>
            </Card>
        </AppLayout>
    );
}

    