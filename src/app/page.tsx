
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { HardHat, ClipboardCheck, Users, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-primary-foreground">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center sticky top-0 z-50 bg-primary">
        <Link href="#" className="flex items-center justify-center" prefetch={false}>
            <Image priority src="https://grupomatos.ind.br/storage/2024/06/Perfil-Grupo-Matos2.png" alt="Grupo Matos Logo" width={150} height={150} className="h-10 w-auto filter brightness-0 invert" />
            <span className="sr-only">Gestão de Obras</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Button asChild variant="outline" className="bg-primary-foreground text-black hover:bg-primary-foreground/90 hover:text-black transition-all duration-300 ease-in-out hover:scale-105">
            <Link
              href="/login"
              prefetch={false}
            >
              Fazer Login
            </Link>
          </Button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section
          className="relative w-full h-[60vh] bg-hero-background"
        >
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative container mx-auto px-4 md:px-6 h-full flex flex-col items-center justify-center text-center text-primary-foreground">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl text-primary-foreground">
                Sistema de Gestão de Obras
              </h1>
              <p className="max-w-[700px] mx-auto text-lg md:text-xl text-primary-foreground/80">
                A ferramenta completa do Grupo Matos para otimizar o controle, a segurança e a eficiência dos seus projetos de construção.
              </p>
              <Button asChild size="lg" className="mt-4 bg-primary-foreground text-black hover:bg-primary-foreground/90 transition-all duration-300 ease-in-out hover:scale-105">
                <Link href="/login" prefetch={false}>
                  Acessar o Sistema
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-primary">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-5xl space-y-4 text-center">
              <div className="inline-block rounded-lg bg-primary-foreground/10 px-3 py-1 text-sm text-primary-foreground">Nossos Recursos</div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-primary-foreground">Tudo que você precisa em um só lugar</h2>
              <p className="max-w-3xl text-primary-foreground/80 md:text-xl/relaxed mx-auto">
                Nosso software foi projetado para simplificar a complexidade da gestão de obras, desde o planejamento até a execução.
              </p>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 py-12 lg:grid-cols-3 lg:gap-12">
              <div className="grid gap-1 text-center">
                <HardHat className="h-10 w-10 mx-auto text-primary-foreground" />
                <h3 className="text-xl font-bold text-primary-foreground">Gestão Centralizada de Obras</h3>
                <p className="text-primary-foreground/80">
                  Crie e gerencie todas as suas obras, atribuindo responsáveis e acompanhando o progresso de forma centralizada.
                </p>
              </div>
              <div className="grid gap-1 text-center">
                 <ClipboardCheck className="h-10 w-10 mx-auto text-primary-foreground" />
                <h3 className="text-xl font-bold text-primary-foreground">Checklists e Inspeções</h3>
                <p className="text-primary-foreground/80">
                  Execute ordens de serviço e inspeções de segurança com checklists digitais, garantindo conformidade e rastreabilidade.
                </p>
              </div>
              <div className="grid gap-1 text-center">
                <Users className="h-10 w-10 mx-auto text-primary-foreground" />
                <h3 className="text-xl font-bold text-primary-foreground">Controle de Usuários</h3>
                <p className="text-primary-foreground/80">
                  Gerencie o acesso ao sistema com diferentes níveis de permissão, garantindo que cada usuário veja apenas o necessário.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t border-primary-foreground/20 bg-primary">
        <p className="text-xs text-primary-foreground/80">&copy; {new Date().getFullYear()} Grupo Matos. Todos os direitos reservados.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4 text-primary-foreground" prefetch={false}>
            Termos de Serviço
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4 text-primary-foreground" prefetch={false}>
            Política de Privacidade
          </Link>
        </nav>
      </footer>
    </div>
  );
}
