
"use client";

import { useState } from "react";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Image from "next/image";
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
import { HardHat, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Campos vazios",
        description: "Por favor, preencha e-mail e senha.",
      });
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (error: any) {
      let description = "Ocorreu um erro. Por favor, tente novamente.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = "Credenciais inválidas. Verifique seu e-mail e senha."
      }
      toast({
        variant: "destructive",
        title: "Erro de Login",
        description: description,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
        toast({ variant: 'destructive', title: 'Campo vazio', description: 'Por favor, informe seu e-mail.' });
        return;
    }
    setResetLoading(true);
    try {
        await sendPasswordResetEmail(auth, resetEmail);
        toast({
            title: 'E-mail Enviado!',
            description: 'Verifique sua caixa de entrada para o link de redefinição de senha.',
        });
        setIsResetDialogOpen(false); // Close dialog on success
    } catch (error: any) {
        let description = "Ocorreu um erro. Tente novamente.";
        if (error.code === 'auth/user-not-found') {
            description = "Nenhum usuário encontrado com este endereço de e-mail.";
        }
        toast({
            variant: "destructive",
            title: "Erro",
            description: description,
        });
    } finally {
        setResetLoading(false);
    }
  };


  return (
    <main className="w-full min-h-screen lg:grid lg:grid-cols-2 login-page-styles">
      <div className="relative hidden lg:flex flex-col items-center justify-center p-12 bg-hero-background">
        <div className="absolute inset-0 bg-black/80" />
        <div className="relative z-10 text-center">
            <HardHat className="h-16 w-16 mx-auto text-primary-foreground" />
            <h1 className="mt-6 text-5xl font-bold text-primary-foreground">Gestão de Obras</h1>
            <p className="mt-4 text-lg text-primary-foreground">
                A plataforma completa para gestão de obras do Grupo Matos.
            </p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12 bg-primary">
        <div className="w-full max-w-md">
          <form onSubmit={handleLogin}>
            <Card className="shadow-lg bg-background text-foreground">
              <CardHeader className="text-center">
                <Link href="/" className="mx-auto mb-4">
                  <Image priority src="https://grupomatos.ind.br/storage/2024/06/Perfil-Grupo-Matos2.png" alt="Grupo Matos Logo" width={150} height={150} className="h-16 w-auto" />
                </Link>
                <CardTitle className="text-3xl font-bold text-foreground">Acessar Sistema</CardTitle>
                <CardDescription className="text-muted-foreground">Bem-vindo de volta! Faça login para continuar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="bg-background text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-foreground">Senha</Label>
                       <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                          <DialogTrigger asChild>
                              <Button variant="link" type="button" className="p-0 h-auto text-xs text-destructive hover:text-destructive/80">
                                  Esqueci minha senha
                              </Button>
                          </DialogTrigger>
                          <DialogContent>
                              <DialogHeader>
                                  <DialogTitle>Redefinir Senha</DialogTitle>
                                  <DialogDescription>
                                      Digite seu e-mail abaixo. Se ele estiver cadastrado no sistema, enviaremos um link para você criar uma nova senha.
                                  </DialogDescription>
                              </DialogHeader>
                               <div className="space-y-2 py-4">
                                  <Label htmlFor="reset-email">E-mail de Cadastro</Label>
                                  <Input
                                      id="reset-email"
                                      type="email"
                                      placeholder="seu@email.com"
                                      value={resetEmail}
                                      onChange={(e) => setResetEmail(e.target.value)}
                                      disabled={resetLoading}
                                  />
                               </div>
                              <DialogFooter>
                                  <DialogClose asChild>
                                      <Button type="button" variant="outline" disabled={resetLoading}>Cancelar</Button>
                                  </DialogClose>
                                  <Button type="button" onClick={handlePasswordReset} disabled={resetLoading}>
                                      {resetLoading ? 'Enviando...' : 'Enviar E-mail'}
                                  </Button>
                              </DialogFooter>
                          </DialogContent>
                      </Dialog>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Sua senha"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className="bg-background text-foreground pr-10"
                    />
                    <Button 
                        type="button"
                        size="icon" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-primary-foreground hover:bg-transparent hover:text-black"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                        {showPassword ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-4">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </div>
      </div>
    </main>
  );
}
