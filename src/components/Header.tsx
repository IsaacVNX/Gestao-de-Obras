
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
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth, type User } from '@/hooks/use-auth';
import { useLoading } from '@/hooks/use-loading';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, User as UserIcon, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import SidebarContent from './SidebarContent';
import { cn } from '@/lib/utils';
import { navLinks, type NavItem, type SubNavItem, type CollapsibleSubMenu, type MenuLabel } from '@/lib/nav-links';
import { useEffect, useState, useRef } from 'react';
import ProfileForm, { type ProfileFormHandle } from './ProfileForm';


const getInitials = (name: string) => {
    if (!name) return '';
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

interface HeaderProps {
    user: User | null;
    isSidebarCollapsed: boolean;
    isSubMenuVisible: boolean;
    activeMenuKey: string | null;
}

const findMainCategory = (pathname: string): NavItem | null => {
    for (const link of navLinks) {
        // This is a direct link like /dashboard
        if (link.href && pathname.startsWith(link.href)) {
          return link;
        }
        // This is a category with sub-items
        if (link.subItems) {
             const hasMatch = link.subItems.some(sub => {
                if (sub.type === 'label') return false;
                // This is a direct sub-item link
                if ('href' in sub && sub.href && pathname.startsWith(sub.href)) return true;
                // This is a collapsible sub-menu
                if (sub.type === 'collapsible' && 'subItems' in sub && sub.subItems) {
                    return sub.subItems.some(s => s.href && pathname.startsWith(s.href));
                }
                return false;
            });
            if(hasMatch) return link;
        }
    }
    return null;
}


export default function Header({ user, isSidebarCollapsed, isSubMenuVisible, activeMenuKey }: HeaderProps) {
    const { logout } = useAuth();
    const { setIsLoading } = useLoading();
    const router = useRouter();
    const pathname = usePathname();
    const [pageTitle, setPageTitle] = useState('');
    const [isProfileOpen, setProfileOpen] = useState(false);
    const profileFormRef = useRef<ProfileFormHandle>(null);

    useEffect(() => {
        const mainCategory = findMainCategory(pathname);
        setPageTitle(mainCategory?.label || '');
    }, [pathname]);

    const handleNavigate = (path: string) => {
        setIsLoading(true);
        router.push(path);
    };

    const handleEscapeKeyDown = (e: KeyboardEvent) => {
        if (profileFormRef.current) {
            e.preventDefault();
            profileFormRef.current.handleAttemptClose();
        }
    }

    return (
        <>
        <header className="fixed top-0 left-0 right-0 z-30 flex h-16 items-center border-b bg-background/95 backdrop-blur-sm">
             {/* Logo Section */}
             <div className="hidden lg:flex items-center justify-center shrink-0" style={{ width: '270px' }}>
                 <Link href="/dashboard" className="flex items-center gap-2" onClick={() => handleNavigate('/dashboard')}>
                    <Image priority src="https://grupomatos.ind.br/storage/2024/06/Perfil-Grupo-Matos2.png" alt="Grupo Matos Logo" width={150} height={150} className="h-10 w-auto" />
                </Link>
            </div>

            {/* Mobile Menu Trigger & Logo */}
            <div className="flex items-center gap-4 lg:hidden pl-4">
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
            
            {/* Title and User Menu Section */}
            <div className="flex flex-1 items-center justify-between pl-4 pr-4">
                 <div className="flex-1">
                    {pageTitle && <span className="font-bold text-2xl text-foreground">{pageTitle}</span>}
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
                        <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
                            <UserIcon className="mr-2 h-4 w-4" />
                            <span>Meu Perfil</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Sair</span>
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Saída</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Você tem certeza que deseja sair do sistema?
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={logout}
                                        className="bg-destructive hover:bg-destructive/90 transition-transform duration-200 hover:scale-105"
                                    >
                                        Sair
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
                )}
            </div>
        </header>

         <Sheet open={isProfileOpen} onOpenChange={setProfileOpen}>
            <SheetContent 
                onEscapeKeyDown={(e) => {
                    if (profileFormRef.current) {
                        profileFormRef.current.handleEscapeKeyDown(e as any);
                    }
                }} 
                onInteractOutside={(e) => e.preventDefault()}
                className="p-0 border-0 w-full sm:max-w-2xl overflow-y-auto"
            >
                <ProfileForm ref={profileFormRef} setOpen={setProfileOpen} />
            </SheetContent>
        </Sheet>
        </>
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
