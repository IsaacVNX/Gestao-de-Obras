
'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import AppLayout from '@/components/AppLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, Trash2 } from 'lucide-react';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import React from 'react';
import { IMaskInput } from 'react-imask';

// Função de validação de CPF
const validateCpf = (cpf: string) => {
    cpf = cpf.replace(/[^\d]+/g,'');
    if(cpf == '') return false;
    // Elimina CPFs invalidos conhecidos
    if (cpf.length != 11 ||
        cpf == "00000000000" ||
        cpf == "11111111111" ||
        cpf == "22222222222" ||
        cpf == "33333333333" ||
        cpf == "44444444444" ||
        cpf == "55555555555" ||
        cpf == "66666666666" ||
        cpf == "77777777777" ||
        cpf == "88888888888" ||
        cpf == "99999999999")
            return false;
    // Valida 1o digito
    let add = 0;
    for (let i=0; i < 9; i ++)
        add += parseInt(cpf.charAt(i)) * (10 - i);
        let rev = 11 - (add % 11);
        if (rev == 10 || rev == 11)
            rev = 0;
        if (rev != parseInt(cpf.charAt(9)))
            return false;
    // Valida 2o digito
    add = 0;
    for (let i = 0; i < 10; i ++)
        add += parseInt(cpf.charAt(i)) * (11 - i);
    rev = 11 - (add % 11);
    if (rev == 10 || rev == 11)
        rev = 0;
    if (rev != parseInt(cpf.charAt(10)))
        return false;
    return true;
};

const userSchema = z.object({
    firstName: z.string().min(1, { message: "O nome é obrigatório." }),
    lastName: z.string().min(1, { message: "O sobrenome é obrigatório." }),
    email: z.string().email({ message: "Por favor, insira um e-mail válido." }).min(1, { message: "O e-mail é obrigatório." }),
    password: z.string()
      .min(8, { message: "A senha deve ter no mínimo 8 caracteres." })
      .refine(value => /(?=.*[a-z])/.test(value), { message: "A senha deve conter pelo menos uma letra minúscula." })
      .refine(value => /(?=.*[A-Z])/.test(value), { message: "A senha deve conter pelo menos uma letra maiúscula." })
      .refine(value => /(?=.*\d)/.test(value), { message: "A senha deve conter pelo menos um número." })
      .refine(value => /(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(value), { message: "A senha deve conter pelo menos um caractere especial." }),
    confirmPassword: z.string(),
    role: z.string().min(1, { message: "A função é obrigatória." }),
    cpf: z.string().min(1, { message: "O CPF é obrigatório." }).refine(val => validateCpf(val.replace(/\D/g, '')), { message: "CPF inválido." }),
    telefone: z.string()
      .min(1, { message: "O telefone é obrigatório." })
      .refine(value => {
        const justDigits = value.replace(/\D/g, '');
        return justDigits.length === 10 || justDigits.length === 11;
      }, { message: "Número de telefone inválido. Deve conter 10 ou 11 dígitos." }),
    dataNascimento: z.string()
      .min(1, { message: "A data de nascimento é obrigatória." })
      .refine(value => {
        const date = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Remove time part
        return date.toString() !== 'Invalid Date' && date <= today;
      }, { message: "Data de nascimento inválida ou no futuro." }),
    cep: z.string()
        .min(1, { message: "O CEP é obrigatório." })
        .refine(value => value.replace(/\D/g, '').length === 8, { message: "CEP inválido. Deve conter 8 dígitos." }),
    logradouro: z.string().min(1, { message: "O logradouro é obrigatório." }),
    numero: z.string().min(1, { message: "O número é obrigatório." }),
    bairro: z.string().min(1, { message: "O bairro é obrigatório." }),
    cidade: z.string().min(1, { message: "A cidade é obrigatória." }),
    estado: z.string().min(1, { message: "O estado é obrigatório." }),
}).refine(data => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
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
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-black ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
    );
  }
);
MaskedInput.displayName = "MaskedInput";

export default function NewUserPage() {
    const { user: adminUser } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [saving, setSaving] = useState(false);

    const form = useForm<z.infer<typeof userSchema>>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            confirmPassword: '',
            role: '',
            cpf: '',
            telefone: '',
            dataNascimento: '',
            cep: '',
            logradouro: '',
            numero: '',
            bairro: '',
            cidade: '',
            estado: '',
        },
    });

    const getInitials = () => {
        const { firstName, lastName } = form.getValues();
        if (!firstName && !lastName) return '';
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }

    const handleFileSelect = () => {
        fileInputRef.current?.click();
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleRemovePhoto = () => {
        setProfileImage(null);
    };

    const handleCreateUser = async (formData: z.infer<typeof userSchema>) => {
        setSaving(true);
        
        try {
            // Check if CPF already exists
            const cpfQuery = query(collection(db, 'usuarios'), where('cpf', '==', formData.cpf));
            const cpfQuerySnapshot = await getDocs(cpfQuery);
            if (!cpfQuerySnapshot.empty) {
                toast({ variant: 'destructive', title: 'Erro de Criação', description: 'Este CPF já está cadastrado no sistema.' });
                setSaving(false);
                return;
            }

            // Create user in a secondary app instance to not sign the admin out
            let secondaryApp;
            const appName = 'secondary-app-for-user-creation';
            secondaryApp = getApps().find(app => app.name === appName) || initializeApp(auth.app.options, appName);
            const secondaryAuth = getAuth(secondaryApp);
            
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
            const newUser = userCredential.user;

            await setDoc(doc(db, 'usuarios', newUser.uid), {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                role: formData.role,
                status: 'ativo',
                cpf: formData.cpf,
                telefone: formData.telefone,
                dataNascimento: formData.dataNascimento,
                cep: formData.cep,
                logradouro: formData.logradouro,
                numero: formData.numero,
                bairro: formData.bairro,
                cidade: formData.cidade,
                estado: formData.estado,
                profileImageUrl: profileImage,
            });
            
            toast({ title: 'Usuário Criado!', description: 'O novo usuário foi adicionado com sucesso.' });
            router.push('/rh?tab=users');

        } catch (error: any) {
             let description = 'Ocorreu um erro ao criar o usuário.';
            if (error.code === 'auth/email-already-in-use') {
                description = 'Este endereço de e-mail já está em uso por outra conta.';
            } else if (error.code === 'auth/invalid-email') {
                description = 'O endereço de e-mail fornecido não é válido.';
            } 
            toast({ variant: 'destructive', title: 'Erro de Criação', description });
        } finally {
            setSaving(false);
        }
    };

     if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'gestor')) {
        return (
            <AppLayout>
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle>Acesso Negado</CardTitle>
                        <CardDescription>Você não tem permissão para criar novos usuários.</CardDescription>
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
                    <CardTitle className="text-2xl">Adicionar Novo Usuário</CardTitle>
                    <CardDescription className="text-card-foreground">Preencha os detalhes abaixo para criar uma nova conta de usuário.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleCreateUser)}>

                        <div className="flex flex-col items-center space-y-4 mb-6">
                            <div className="relative group">
                                <Avatar className="h-24 w-24">
                                    <AvatarImage src={profileImage || undefined} alt="Foto de Perfil" />
                                    <AvatarFallback>{getInitials()}</AvatarFallback>
                                </Avatar>
                                {profileImage && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                                <Trash2 className="h-8 w-8 text-white" />
                                            </div>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Remover foto?</AlertDialogTitle>
                                                <AlertDialogDescription>Tem certeza que deseja remover a foto de perfil?</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleRemovePhoto}>Confirmar</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </div>
                            <Button type="button" variant="outline" onClick={handleFileSelect} disabled={saving} className="max-w-xs text-black transition-transform duration-200 hover:scale-105">
                                <Upload className="mr-2 h-4 w-4" />
                                Carregar Foto de Perfil
                            </Button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                        </div>
                        
                         <FormSection title="Dados de Acesso">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="firstName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome</FormLabel>
                                        <FormControl><Input {...field} disabled={saving} className="text-black" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="lastName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sobrenome</FormLabel>
                                        <FormControl><Input {...field} disabled={saving} className="text-black" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                             </div>
                             <div className="mt-4">
                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl><Input type="email" {...field} disabled={saving} className="text-black" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <FormField control={form.control} name="password" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Senha</FormLabel>
                                        <FormControl><Input type="password" {...field} disabled={saving} className="text-black" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirmar Senha</FormLabel>
                                        <FormControl><Input type="password" {...field} disabled={saving} className="text-black" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                         </FormSection>

                        <FormSection title="Informações Pessoais">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="role" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Função</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={saving}>
                                            <FormControl>
                                                <SelectTrigger className="text-black"><SelectValue placeholder="Selecione uma função" /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="montador">Montador</SelectItem>
                                                <SelectItem value="encarregado">Encarregado</SelectItem>
                                                <SelectItem value="escritorio">Escritório</SelectItem>
                                                {adminUser.role === 'admin' && <SelectItem value="gestor">Gestor</SelectItem>}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                 <FormField control={form.control} name="cpf" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>CPF</FormLabel>
                                        <FormControl>
                                            <MaskedInput {...field} mask="000.000.000-00" disabled={saving} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <FormField control={form.control} name="telefone" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Telefone</FormLabel>
                                        <FormControl>
                                            <MaskedInput {...field} mask={[{mask: '(00) 0000-0000'}, {mask: '(00) 00000-0000'}]} disabled={saving} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="dataNascimento" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Data de Nascimento</FormLabel>
                                        <FormControl><Input type="date" {...field} disabled={saving} className="text-black" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                        </FormSection>
                        
                        <FormSection title="Endereço">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <FormField control={form.control} name="cep" render={({ field }) => (
                                    <FormItem className="sm:col-span-1">
                                        <FormLabel>CEP</FormLabel>
                                        <FormControl>
                                             <MaskedInput {...field} mask="00000-000" disabled={saving} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                 <FormField control={form.control} name="logradouro" render={({ field }) => (
                                    <FormItem className="sm:col-span-2">
                                        <FormLabel>Logradouro</FormLabel>
                                        <FormControl><Input {...field} disabled={saving} className="text-black" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <FormField control={form.control} name="numero" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Número</FormLabel>
                                        <FormControl><Input {...field} disabled={saving} className="text-black" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="bairro" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Bairro</FormLabel>
                                        <FormControl><Input {...field} disabled={saving} className="text-black" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <FormField control={form.control} name="cidade" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cidade</FormLabel>
                                        <FormControl><Input {...field} disabled={saving} className="text-black" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="estado" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Estado</FormLabel>
                                        <FormControl><Input {...field} disabled={saving} className="text-black" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                        </FormSection>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="ghost" onClick={() => router.push('/rh?tab=users')} disabled={saving}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant="secondary" className="text-black transition-transform duration-200 hover:scale-105" disabled={saving}>
                                {saving ? 'Criando Usuário...' : 'Criar Usuário'}
                            </Button>
                        </div>
                    </form>
                    </Form>
                </CardContent>
            </Card>
        </AppLayout>
    );
}

    