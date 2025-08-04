
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

const baseSchema = z.object({
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


export default function NewClientPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);

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
            const q = query(collection(db, 'clientes'), where(fieldToCheck, '==', identifier));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                toast({ variant: 'destructive', title: 'Erro de Criação', description: `Este ${fieldToCheck.toUpperCase()} já está cadastrado.` });
                setSaving(false);
                return;
            }

            const docRef = doc(db, 'clientes', identifier);
            await setDoc(docRef, {
                ...formData,
                cnpj: formData.cnpj?.replace(/\D/g, '') || '',
                cpf: formData.cpf?.replace(/\D/g, '') || '',
                status: 'ativo',
            });
            
            toast({ title: 'Cliente Criado!', description: 'O novo cliente foi adicionado com sucesso.' });
            router.push('/expedicao/cadastros/clientes');

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro de Criação', description: 'Ocorreu um erro ao criar o cliente.' });
        } finally {
            setSaving(false);
        }
    };

    if (!user || (user.role !== 'admin' && user.role !== 'gestor' && user.role !== 'escritorio')) {
        return (
            <AppLayout>
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle>Acesso Negado</CardTitle>
                        <CardDescription>Você não tem permissão para criar novos clientes.</CardDescription>
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
                    <CardTitle className="text-2xl">Adicionar Novo Cliente</CardTitle>
                    <CardDescription className="text-card-foreground">Preencha os detalhes abaixo para criar um novo cliente.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleCreateClient)}>
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
                                                <FormControl><RadioGroupItem value="juridica" id="juridica" className={cn(field.value === 'juridica' && 'border-white text-white')}/></FormControl>
                                                <FormLabel htmlFor="juridica" className="cursor-pointer font-bold text-base">Pessoa Jurídica</FormLabel>
                                            </FormItem>
                                            <FormItem className={cn("flex items-center space-x-3 space-y-0 rounded-md border p-4 transition-colors", field.value === 'fisica' && 'bg-accent text-accent-foreground')}>
                                                <FormControl><RadioGroupItem value="fisica" id="fisica" className={cn(field.value === 'fisica' && 'border-white text-white')}/></FormControl>
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
                                            <FormItem><FormLabel>CNPJ</FormLabel><FormControl><MaskedInput {...field} mask="00.000.000/0000-00" disabled={saving} /></FormControl><FormMessage /></FormItem>
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
                                        <FormItem><FormLabel>CPF</FormLabel><FormControl><MaskedInput {...field} mask="000.000.000-00" disabled={saving} /></FormControl><FormMessage /></FormItem>
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
                                {saving ? 'Salvando Cliente...' : 'Salvar Cliente'}
                            </Button>
                        </div>
                    </form>
                    </Form>
                </CardContent>
            </Card>
        </AppLayout>
    );
}
