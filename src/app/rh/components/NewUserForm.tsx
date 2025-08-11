
'use client';
import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle as CardTitleComponent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, X, AlertTriangle, Save, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField as RHFormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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
import React from 'react';
import { IMaskInput } from 'react-imask';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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

export interface NewUserFormHandle {
    handleAttemptClose: () => void;
}

interface NewUserFormProps {
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

export const NewUserForm = forwardRef<NewUserFormHandle, NewUserFormProps>(({ open, setOpen, onSaveSuccess, isClosing, handleClose }, ref) => {
    const { user: adminUser } = useAuth();
    const { toast } = useToast();
    
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [saving, setSaving] = useState(false);
    const [isAlertOpen, setAlertOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);


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

    const { formState: { isDirty }, reset } = form;

    const handleAttemptClose = () => {
        if (isDirty) {
            setAlertOpen(true);
        } else {
            handleClose();
        }
    };

    useImperativeHandle(ref, () => ({
        handleAttemptClose
    }));


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

    const handleCreateUser = async (formData: z.infer<typeof userSchema>) => {
        setSaving(true);
        
        try {
            const cpfQuery = query(collection(db, 'usuarios'), where('cpf', '==', formData.cpf));
            const cpfQuerySnapshot = await getDocs(cpfQuery);
            if (!cpfQuerySnapshot.empty) {
                toast({ variant: 'destructive', title: 'Erro de Criação', description: 'Este CPF já está cadastrado no sistema.' });
                setSaving(false);
                return;
            }

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
            onSaveSuccess();
            handleClose();

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

    useEffect(() => {
        if (!open) {
            reset();
            setProfileImage(null);
        }
    }, [open, reset]);

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
                        <h2 className="text-2xl font-semibold text-foreground">Adicionar Novo Usuário</h2>
                        <p className="text-sm text-muted-foreground">Preencha os detalhes abaixo para criar uma nova conta.</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={handleAttemptClose} className="rounded-full text-foreground hover:bg-muted">
                        <X className="h-5 w-5" />
                    </Button>
                </div>
            
                <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateUser)} className="flex flex-col flex-1 overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <CollapsibleCard title="Foto de Perfil">
                            <div className="flex flex-col items-center space-y-4">
                                    <div className="relative cursor-pointer">
                                    <Avatar className="h-24 w-24">
                                        <AvatarImage src={profileImage || undefined} alt="Foto de Perfil" />
                                        <AvatarFallback>{getInitials()}</AvatarFallback>
                                    </Avatar>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2 w-full max-w-sm">
                                    <Button type="button" variant="outline" onClick={handleFileSelect} disabled={saving} className="flex-1 text-black transition-transform duration-200 hover:scale-105">
                                        <Upload className="mr-2 h-4 w-4" />
                                        Carregar do dispositivo
                                    </Button>
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                            </div>
                        </CollapsibleCard>
                        
                        <CollapsibleCard title="Dados de Acesso">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <RHFormField control={form.control} name="firstName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-black" htmlFor="firstName">Nome</FormLabel>
                                        <FormControl><Input id="firstName" {...field} disabled={saving} className="text-black" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <RHFormField control={form.control} name="lastName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-black" htmlFor="lastName">Sobrenome</FormLabel>
                                        <FormControl><Input id="lastName" {...field} disabled={saving} className="text-black" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                            <div className="mt-4">
                                <RHFormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-black" htmlFor="email">Email</FormLabel>
                                        <FormControl><Input id="email" type="email" {...field} disabled={saving} className="text-black" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <RHFormField control={form.control} name="password" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-black" htmlFor="password">Senha</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input id="password" type={showPassword ? "text" : "password"} {...field} disabled={saving} className="text-black pr-10" />
                                                <Button 
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-gray-500 hover:text-gray-900 hover:bg-gray-200"
                                                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                                                >
                                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                </Button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <RHFormField control={form.control} name="confirmPassword" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-black" htmlFor="confirmPassword">Confirmar Senha</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} {...field} disabled={saving} className="text-black pr-10" />
                                                <Button 
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-gray-500 hover:text-gray-900 hover:bg-gray-200"
                                                    aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                                                >
                                                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                </Button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                        </CollapsibleCard>

                        <CollapsibleCard title="Informações Pessoais e Função">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <RHFormField control={form.control} name="role" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-black" htmlFor="role">Função</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={saving}>
                                            <FormControl>
                                                <SelectTrigger id="role" className="text-black"><SelectValue placeholder="Selecione uma função" /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="montador">Montador</SelectItem>
                                                <SelectItem value="encarregado">Encarregado</SelectItem>
                                                <SelectItem value="escritorio">Escritório</SelectItem>
                                                {adminUser?.role === 'admin' && <SelectItem value="gestor">Gestor</SelectItem>}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <RHFormField control={form.control} name="cpf" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-black" htmlFor="cpf">CPF</FormLabel>
                                        <FormControl>
                                            <MaskedInput id="cpf" {...field} mask="000.000.000-00" disabled={saving} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <RHFormField control={form.control} name="telefone" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-black" htmlFor="telefone">Telefone</FormLabel>
                                        <FormControl>
                                            <MaskedInput id="telefone" {...field} mask={[{mask: '(00) 0000-0000'}, {mask: '(00) 00000-0000'}]} disabled={saving} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <RHFormField control={form.control} name="dataNascimento" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-black" htmlFor="dataNascimento">Data de Nascimento</FormLabel>
                                        <FormControl><Input id="dataNascimento" type="date" {...field} disabled={saving} className="text-black" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                        </CollapsibleCard>
                        
                        <CollapsibleCard title="Endereço">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <RHFormField control={form.control} name="cep" render={({ field }) => (
                                    <FormItem className="sm:col-span-1">
                                        <FormLabel className="text-black" htmlFor="cep">CEP</FormLabel>
                                        <FormControl>
                                            <MaskedInput id="cep" {...field} mask="00000-000" disabled={saving} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            <RHFormField control={form.control} name="logradouro" render={({ field }) => (
                                    <FormItem className="sm:col-span-2"><FormLabel className="text-black">Logradouro</FormLabel><FormControl><Input {...field} placeholder="Rua das Flores" disabled={saving} className="text-black"/></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <RHFormField control={form.control} name="numero" render={({ field }) => (
                                    <FormItem><FormLabel className="text-black">Número</FormLabel><FormControl><Input {...field} placeholder="123" disabled={saving} className="text-black"/></FormControl><FormMessage /></FormItem>
                                )}/>
                                <RHFormField control={form.control} name="bairro" render={({ field }) => (
                                    <FormItem><FormLabel className="text-black">Bairro</FormLabel><FormControl><Input {...field} placeholder="Centro" disabled={saving} className="text-black"/></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <RHFormField control={form.control} name="cidade" render={({ field }) => (
                                    <FormItem><FormLabel className="text-black">Cidade</FormLabel><FormControl><Input {...field} placeholder="São Paulo" disabled={saving} className="text-black"/></FormControl><FormMessage /></FormItem>
                                )}/>
                                <RHFormField control={form.control} name="estado" render={({ field }) => (
                                    <FormItem><FormLabel className="text-black">Estado</FormLabel><FormControl><Input {...field} placeholder="SP" disabled={saving} className="text-black"/></FormControl><FormMessage /></FormItem>
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
                            {saving ? 'Criando Usuário...' : 'Criar Usuário'}
                        </Button>
                    </div>
                </form>
                </Form>
            </div>
        </div>
    );
});
NewUserForm.displayName = "NewUserForm";
    

    



    
