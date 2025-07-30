
'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth, type User } from '@/hooks/use-auth';
import { useLoading } from '@/hooks/use-loading';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, User as UserIcon, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import SidebarContent from './SidebarContent';
import { cn } from '@/lib/utils';
import { navLinks, type NavItem, type SubNavItem, type CollapsibleSubMenu } from '@/lib/nav-links';
import { useEffect, useState } from 'react';


const getInitials = (name: string) => {
    if (!name) return '';
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

interface HeaderProps {
    user: User | null;
}

const findCurrentPage = (items: (NavItem | SubNavItem | CollapsibleSubMenu)[], pathname: string): NavItem | SubNavItem | CollapsibleSubMenu | null => {
  for (const item of items) {
    if ('href' in item && item.href && pathname.startsWith(item.href)) {
      return item;
    }
    if ('subItems' in item && item.subItems) {
      const found = findCurrentPage(item.subItems, pathname);
      if (found) return found;
    }
  }
  return null;
};

const findMainCategory = (pathname: string): NavItem | null => {
    for (const link of navLinks) {
        if (link.href && pathname.startsWith(link.href)) return link;
        if (link.subItems) {
             const hasMatch = link.subItems.some(sub => 
                ('href' in sub && pathname.startsWith(sub.href)) ||
                ('subItems' in sub && sub.subItems.some(s => pathname.startsWith(s.href)))
            );
            if(hasMatch) return link;
        }
    }
    return null;
}


export default function Header({ user }: HeaderProps) {
    const { logout } = useAuth();
    const { setIsLoading } = useLoading();
    const router = useRouter();
    const pathname = usePathname();
    const [pageTitle, setPageTitle] = useState('');

    useEffect(() => {
        const currentPage = findCurrentPage(navLinks, pathname);
        if (currentPage) {
            setPageTitle(currentPage.label);
        } else {
            // Fallback for dynamic pages (e.g., /obras/[id])
            const mainCategory = findMainCategory(pathname);
            setPageTitle(mainCategory?.label || '');
        }
    }, [pathname]);

    const handleNavigate = (path: string) => {
        setIsLoading(true);
        router.push(path);
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm">
            <div className={cn(
                "flex items-center gap-4 transition-all duration-300 ease-in-out",
                 "lg:ml-0" // The header content itself doesn't need a margin, the AppLayout handles the main content
                )}>
                 <div className="lg:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-foreground"
                        >
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Toggle navigation menu</span>
                        </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="flex flex-col p-0 bg-sidebar">
                            <SidebarContent isMobile={true} />
                        </SheetContent>
                    </Sheet>
                 </div>
                 <div className='hidden lg:flex items-center gap-4'>
                    <Link href="/dashboard" className="flex items-center gap-2" onClick={() => handleNavigate('/dashboard')}>
                        <Image priority src="https://grupomatos.ind.br/storage/2024/06/Perfil-Grupo-Matos2.png" alt="Grupo Matos Logo" width={150} height={150} className="h-10 w-auto" />
                    </Link>
                    {pageTitle && <span className="font-bold text-lg text-foreground">{pageTitle}</span>}
                 </div>
            </div>
            
            {user && (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-3">
                         <div className="text-right hidden sm:block">
                             <p className="text-sm font-semibold">{user.name}</p>
                             <p className="text-xs text-muted-foreground capitalize">{getRoleName(user.role)}</p>
                         </div>
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={user.profileImageUrl || undefined} alt="Foto de Perfil" />
                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleNavigate('/profile')}>
                        <UserIcon className="mr-2 h-4 w-4" />
                        <span>Meu Perfil</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sair</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            )}
        </header>
    )
}

const getRoleName = (role: string) => {
  switch (role) {
    case 'admin':
      return 'Administrador';
    case 'gestor':
      return 'Gestor';
    case 'escritorio':
      return 'Escritório';
    case 'encarregado':
      return 'Encarregado';
    case 'montador':
        return 'Montador';
    default:
      return 'Usuário';
  }
};
