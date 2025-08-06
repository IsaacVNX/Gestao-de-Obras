
'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Upload, Trash2, Save, ArrowLeft } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import AppLayout from '@/components/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

const FormSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <>
        <Separator className="my-6" />
        <h3 className="text-lg font-semibold mb-4 text-card-foreground">{title}</h3>
        {children}
    </>
);

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [cpf, setCpf] = useState('');
    const [telefone, setTelefone] = useState('');
    const [dataNascimento, setDataNascimento] = useState('');
    const [cep, setCep] = useState('');
    const [logradouro, setLogradouro] = useState('');
    const [numero, setNumero] = useState('');
    const [bairro, setBairro] = useState('');
    const [cidade, setCidade] = useState('');
    const [estado, setEstado] = useState('');


    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [openCamera, setOpenCamera] = useState(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

    useEffect(() => {
        async function fetchUserData() {
            if (!user) return;
            setLoading(true);
            try {
                const userDocRef = doc(db, 'usuarios', user.id);
                const docSnap = await getDoc(userDocRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setFirstName(data.firstName || '');
                    setLastName(data.lastName || '');
                    setEmail(data.email || '');
                    setProfileImage(data.profileImageUrl || null);
                    setCpf(data.cpf || '');
                    setTelefone(data.telefone || '');
                    setDataNascimento(data.dataNascimento || '');
                    setCep(data.cep || '');
                    setLogradouro(data.logradouro || '');
                    setNumero(data.numero || '');
                    setBairro(data.bairro || '');
                    setCidade(data.cidade || '');
                    setEstado(data.estado || '');
                }
            } catch (error) {
                toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os dados do perfil.' });
            } finally {
                setLoading(false);
            }
        }

        if (!authLoading) {
            fetchUserData();
        }
    }, [user, authLoading, toast]);


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

    const handleTakePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const dataUrl = canvas.toDataURL('image/png');
            setProfileImage(dataUrl);
            setOpenCamera(false);
        }
    };
    
    const handleRemovePhoto = () => {
        setProfileImage(null);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !firstName || !lastName) {
            toast({ variant: 'destructive', title: 'Campos vazios', description: 'Nome e sobrenome são obrigatórios.' });
            return;
        }
        setSaving(true);
        try {
            const userDocRef = doc(db, 'usuarios', user.id);
            await updateDoc(userDocRef, {
                firstName,
                lastName,
                profileImageUrl: profileImage,
                cpf,
                telefone,
                dataNascimento,
                cep,
                logradouro,
                numero,
                bairro,
                cidade,
                estado,
            });

            toast({ title: 'Sucesso!', description: 'Seu perfil foi atualizado.' });
            router.back();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro ao Atualizar', description: 'Não foi possível salvar as alterações.' });
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        let stream: MediaStream | null = null;
        const getCameraPermission = async () => {
        if (!openCamera) return;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            setHasCameraPermission(true);

            if (videoRef.current) {
            videoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.error('Error accessing camera:', error);
            setHasCameraPermission(false);
            toast({
            variant: 'destructive',
            title: 'Acesso à Câmera Negado',
            description: 'Por favor, habilite a permissão da câmera nas configurações do seu navegador.',
            });
        }
        };
        getCameraPermission();
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [openCamera, toast]);

    const getInitials = () => {
        if (!firstName && !lastName) return '';
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }

    if (authLoading || loading) {
        return (
            <AppLayout>
                <Card className="max-w-4xl mx-auto">
                    <CardHeader>
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div className="flex flex-col items-center space-y-4">
                            <Skeleton className="h-24 w-24 rounded-full" />
                            <div className="flex gap-2">
                                <Skeleton className="h-10 w-44" />
                                <Skeleton className="h-10 w-32" />
                            </div>
                         </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="flex justify-end pt-4">
                            <Skeleton className="h-10 w-32" />
                        </div>
                    </CardContent>
                </Card>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <Card className="max-w-4xl mx-auto">
                <form onSubmit={handleUpdate}>
                    <CardHeader>
                        <CardTitle className="text-2xl">Meu Perfil</CardTitle>
                        <CardDescription className="text-card-foreground">Atualize suas informações pessoais e foto de perfil.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center space-y-4">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild disabled={!profileImage}>
                                    <div className="relative cursor-pointer">
                                        <Avatar className="h-24 w-24">
                                            <AvatarImage src={profileImage || undefined} alt="Foto de Perfil" />
                                            <AvatarFallback>
                                                {getInitials()}
                                            </AvatarFallback>
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
                                <Dialog open={openCamera} onOpenChange={setOpenCamera}>
                                    <DialogTrigger asChild>
                                        <Button type="button" variant="outline" disabled={saving} className="flex-1 text-black transition-transform duration-200 hover:scale-105">
                                            <Camera className="mr-2 h-4 w-4" />
                                            Tirar foto
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Capturar Foto</DialogTitle>
                                            <DialogDescription>Posicione seu rosto no centro e clique em "Capturar".</DialogDescription>
                                        </DialogHeader>
                                        <div className="flex flex-col items-center">
                                            <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted />
                                            <canvas ref={canvasRef} className="hidden" />
                                            {hasCameraPermission === false && (
                                                <Alert variant="destructive" className="mt-4">
                                                    <AlertTitle>Acesso à Câmera Necessário</AlertTitle>
                                                    <AlertDescription>Por favor, permita o acesso à câmera para usar esta funcionalidade.</AlertDescription>
                                                </Alert>
                                            )}
                                        </div>
                                        <DialogFooter>
                                            <DialogClose asChild>
                                                <Button type="button" variant="ghost">Cancelar</Button>
                                            </DialogClose>
                                            <Button onClick={handleTakePhoto} disabled={!hasCameraPermission}>Capturar</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                        </div>
                        
                        <FormSection title="Informações Pessoais">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">Nome</Label>
                                    <Input id="firstName" placeholder="João" required value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={saving}/>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Sobrenome</Label>
                                    <Input id="lastName" placeholder="Silva" required value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={saving}/>
                                </div>
                            </div>
                            <div className="space-y-2 mt-4">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" placeholder="seu@email.com" required value={email} disabled={true}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="cpf">CPF</Label>
                                    <Input id="cpf" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(e.target.value)} disabled={saving}/>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="telefone">Telefone</Label>
                                    <Input id="telefone" placeholder="(00) 90000-0000" value={telefone} onChange={(e) => setTelefone(e.target.value)} disabled={saving}/>
                                </div>
                            </div>
                            <div className="space-y-2 mt-4">
                                <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                                <Input id="dataNascimento" type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} disabled={saving}/>
                            </div>
                        </FormSection>

                        <FormSection title="Endereço">
                             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="cep">CEP</Label>
                                    <Input id="cep" placeholder="00000-000" value={cep} onChange={(e) => setCep(e.target.value)} disabled={saving}/>
                                </div>
                                 <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="logradouro">Logradouro</Label>
                                    <Input id="logradouro" placeholder="Rua das Flores" value={logradouro} onChange={(e) => setLogradouro(e.target.value)} disabled={saving}/>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="numero">Número</Label>
                                    <Input id="numero" placeholder="123" value={numero} onChange={(e) => setNumero(e.target.value)} disabled={saving}/>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bairro">Bairro</Label>
                                    <Input id="bairro" placeholder="Centro" value={bairro} onChange={(e) => setBairro(e.target.value)} disabled={saving}/>
                                </div>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="cidade">Cidade</Label>
                                    <Input id="cidade" placeholder="São Paulo" value={cidade} onChange={(e) => setCidade(e.target.value)} disabled={saving}/>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="estado">Estado</Label>
                                    <Input id="estado" placeholder="SP" value={estado} onChange={(e) => setEstado(e.target.value)} disabled={saving}/>
                                </div>
                            </div>
                        </FormSection>

                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-6">
                             <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Voltar
                            </Button>
                             <Button type="submit" variant="secondary" className="text-black transition-transform duration-200 hover:scale-105" disabled={saving}>
                                <Save className="mr-2 h-4 w-4" />
                                {saving ? 'Salvando...' : 'Salvar Alterações'}
                            </Button>
                        </div>
                    </CardContent>
                </form>
            </Card>
        </AppLayout>
    );
}
