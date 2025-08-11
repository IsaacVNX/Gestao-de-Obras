
'use client';
import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Trash2, Save, X, AlertTriangle, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle as CardTitleComponent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField as RHFormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';


const profileSchema = z.object({
    firstName: z.string().min(1, "O nome é obrigatório."),
    lastName: z.string().min(1, "O sobrenome é obrigatório."),
    email: z.string().email(),
    cpf: z.string().optional(),
    telefone: z.string().optional(),
    dataNascimento: z.string().optional(),
    cep: z.string().optional(),
    logradouro: z.string().optional(),
    numero: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    estado: z.string().optional(),
});


interface ProfileFormProps {
    setOpen: (open: boolean) => void;
}

export interface ProfileFormHandle {
    handleAttemptClose: () => void;
    handleEscapeKeyDown: (e: React.KeyboardEvent) => void;
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
            <CollapsibleContent>
                <CardContent>{children}</CardContent>
            </CollapsibleContent>
        </Collapsible>
    </Card>
);

const ProfileForm = forwardRef<ProfileFormHandle, ProfileFormProps>(({ setOpen }, ref) => {
    const { user, loading: authLoading, refetchUser } = useAuth();
    const { toast } = useToast();
    
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isAlertOpen, setAlertOpen] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<z.infer<typeof profileSchema>>({
        resolver: zodResolver(profileSchema),
        defaultValues: {},
    });
    
    const { formState: { isDirty }, reset } = form;

    const handleAttemptClose = () => {
        if (isDirty || (user?.profileImageUrl !== profileImage)) {
            setAlertOpen(true);
        } else {
            setOpen(false);
        }
    };

    const handleEscapeKeyDown = (e: React.KeyboardEvent) => {
        e.preventDefault();
        handleAttemptClose();
    };

    useImperativeHandle(ref, () => ({
        handleAttemptClose,
        handleEscapeKeyDown,
    }));
    
    useEffect(() => {
        if (user) {
            setLoading(true);
            const values = {
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                cpf: user.cpf || '',
                telefone: user.telefone || '',
                dataNascimento: user.dataNascimento || '',
                cep: user.cep || '',
                logradouro: user.logradouro || '',
                numero: user.numero || '',
                bairro: user.bairro || '',
                cidade: user.cidade || '',
                estado: user.estado || '',
            };
            reset(values);
            setProfileImage(user.profileImageUrl || null);
            setLoading(false);
        }
    }, [user, reset]);

    const handleFileSelect = () => {
        fileInputRef.current?.click();
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImage(reader.result as string);
                form.setValue('firstName', form.getValues('firstName'), { shouldDirty: true });
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleRemovePhoto = () => {
        setProfileImage(null);
        form.setValue('firstName', form.getValues('firstName'), { shouldDirty: true });
    };

    const handleUpdate = async (formData: z.infer<typeof profileSchema>) => {
        if (!user) return;
        setSaving(true);
        try {
            const userDocRef = doc(db, 'usuarios', user.id);
            await updateDoc(userDocRef, {
                ...formData,
                profileImageUrl: profileImage,
            });

            toast({ title: 'Sucesso!', description: 'Seu perfil foi atualizado.' });
            await refetchUser();
            setOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro ao Atualizar', description: 'Não foi possível salvar as alterações.' });
        } finally {
            setSaving(false);
        }
    };

    const getInitials = () => {
        if (!user) return '';
        return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }

    return (
        <div className='h-full w-full flex flex-col bg-[#ededed]'>
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
                        <AlertDialogAction onClick={() => setOpen(false)} className="bg-destructive hover:bg-destructive/80 transition-transform duration-200 hover:scale-105">
                            Descartar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
             <div className="p-6 flex flex-row items-center justify-between border-b bg-white shadow-md sticky top-0 z-10">
                <div>
                    <h2 className="text-2xl font-semibold text-foreground">Meu Perfil</h2>
                    <p className="text-sm text-muted-foreground">Atualize suas informações pessoais e foto de perfil.</p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => handleAttemptClose()} className="rounded-full text-foreground hover:bg-muted">
                    <X className="h-5 w-5" />
                </Button>
            </div>
            
            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdate)} className="flex flex-col flex-1 overflow-hidden">
                 <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {authLoading || loading ? (
                         <div className="space-y-6">
                            <Skeleton className="h-48 w-full rounded-lg" />
                            <Skeleton className="h-64 w-full rounded-lg" />
                            <Skeleton className="h-64 w-full rounded-lg" />
                         </div>
                    ) : (
                    <>
                        <CollapsibleCard title="Foto de Perfil">
                            <div className="flex flex-col items-center space-y-4">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild disabled={!profileImage}>
                                        <div className="relative cursor-pointer">
                                            <Avatar className="h-24 w-24">
                                                <AvatarImage src={profileImage || undefined} alt="Foto de Perfil" />
                                                <AvatarFallback>{getInitials()}</AvatarFallback>
                                            </Avatar>
                                            {profileImage && (
                                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-full opacity-0 hover:opacity-100 transition-opacity">
                                                    <p className="text-xs text-white">Editar</p>
                                                </div>
                                            )}
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Remover Foto
                                                </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Remover foto?</AlertDialogTitle>
                                                    <AlertDialogDescription>Tem certeza que deseja remover sua foto de perfil?</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleRemovePhoto}>Confirmar</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <div className="flex flex-col sm:flex-row gap-2 w-full max-w-sm">
                                    <Button type="button" variant="outline" onClick={handleFileSelect} disabled={saving} className="flex-1 text-black transition-transform duration-200 hover:scale-105">
                                        <Upload className="mr-2 h-4 w-4" />
                                        Carregar do dispositivo
                                    </Button>
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                            </div>
                        </CollapsibleCard>

                        <CollapsibleCard title="Informações Pessoais">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <RHFormField control={form.control} name="firstName" render={({ field }) => (
                                    <FormItem><FormLabel className="text-black">Nome</FormLabel><FormControl><Input {...field} placeholder="João" required disabled={saving} className="text-black"/></FormControl><FormMessage /></FormItem>
                                )}/>
                                <RHFormField control={form.control} name="lastName" render={({ field }) => (
                                    <FormItem><FormLabel className="text-black">Sobrenome</FormLabel><FormControl><Input {...field} placeholder="Silva" required disabled={saving} className="text-black"/></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            <div className="space-y-2 mt-4">
                                <RHFormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem><FormLabel className="text-black">Email</FormLabel><FormControl><Input type="email" {...field} placeholder="seu@email.com" required disabled className="text-black"/></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <RHFormField control={form.control} name="cpf" render={({ field }) => (
                                    <FormItem><FormLabel className="text-black">CPF</FormLabel><FormControl><Input {...field} placeholder="000.000.000-00" disabled={saving} className="text-black"/></FormControl><FormMessage /></FormItem>
                                )}/>
                                <RHFormField control={form.control} name="telefone" render={({ field }) => (
                                    <FormItem><FormLabel className="text-black">Telefone</FormLabel><FormControl><Input {...field} placeholder="(00) 90000-0000" disabled={saving} className="text-black"/></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            <div className="space-y-2 mt-4">
                            <RHFormField control={form.control} name="dataNascimento" render={({ field }) => (
                                    <FormItem><FormLabel className="text-black">Data de Nascimento</FormLabel><FormControl><Input type="date" {...field} disabled={saving} className="text-black"/></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                        </CollapsibleCard>

                        <CollapsibleCard title="Endereço">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <RHFormField control={form.control} name="cep" render={({ field }) => (
                                    <FormItem><FormLabel className="text-black">CEP</FormLabel><FormControl><Input {...field} placeholder="00000-000" disabled={saving} className="text-black"/></FormControl><FormMessage /></FormItem>
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
                    </>
                    )}
                </div>
                <div className="p-4 flex justify-end gap-2 mt-auto bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] border-t">
                    <Button type="button" variant="ghost" onClick={() => handleAttemptClose()} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button type="submit" variant="default" className="transition-transform duration-200 hover:scale-105" disabled={saving || (!isDirty && user?.profileImageUrl === profileImage)}>
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </div>
            </form>
            </Form>
        </div>
    );
});

ProfileForm.displayName = "ProfileForm";
export default ProfileForm;
