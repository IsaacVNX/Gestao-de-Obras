
'use client'
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useLoading } from '@/hooks/use-loading';
import Image from 'next/image';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Button } from './ui/button';
import { ChevronRight, LogOut, ArrowLeft } from 'lucide-react';
import { navLinks, type NavItem, type SubNavItem, type CollapsibleSubMenu, type MenuLabel } from '@/lib/nav-links';


interface SidebarContentProps {
  isPrimary?: boolean;
  isMobile?: boolean;
  isCollapsed?: boolean;
  setIsCollapsed?: (isCollapsed: boolean) => void;
  activeMenuKey?: string | null;
  setActiveMenuKey?: (key: string | null) => void;
  setIsSubMenuVisible?: (isVisible: boolean) => void;
}

export default function SidebarContent({
  isPrimary = false,
  isMobile = false,
  isCollapsed = false,
  setIsCollapsed,
  activeMenuKey,
  setActiveMenuKey,
  setIsSubMenuVisible,
}: SidebarContentProps) {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const { setIsLoading } = useLoading();
    
    const handleNavClick = (key: string, href?: string, subItems?: (SubNavItem | CollapsibleSubMenu | MenuLabel)[]) => {
        // Mobile logic remains separate as it uses a single sheet
        if (isMobile) {
            if (href && pathname !== href) {
                setIsLoading(true);
                router.push(href);
            }
            return;
        }

        // This is a direct navigation link (like "Início")
        if (href) {
            setActiveMenuKey?.(null);
            setIsSubMenuVisible?.(false);
            if (setIsCollapsed) {
               setIsCollapsed(false);
            }
            if (pathname !== href) {
                setIsLoading(true);
                router.push(href);
            }
        // This is a trigger for a sub-menu
        } else if (subItems) {
            setActiveMenuKey?.(key);
            if (setIsCollapsed) {
                setIsCollapsed(true);
            }
            setIsSubMenuVisible?.(true);
        }
    };
    
    const handleSubNavClick = (href: string) => {
        if (pathname !== href) {
            setIsLoading(true);
            router.push(href);
        }
    }

    const handleBackToPrimary = () => {
        if (setActiveMenuKey) setActiveMenuKey(null);
        if (setIsSubMenuVisible) setIsSubMenuVisible(false);
        if (setIsCollapsed) setIsCollapsed(false);
    }
    
    const currentMainCategory = navLinks.find(link => 
        (link.subItems && link.subItems.some(sub => {
            if ('href' in sub) {
                return pathname.startsWith(sub.href);
            }
            if ('subItems' in sub && sub.subItems) {
                return sub.subItems.some(s => pathname.startsWith(s.href));
            }
            return false;
        }))
    )?.key;

    // Primary Sidebar (Icon Bar)
    if (isPrimary && !isMobile) {
        return (
            <nav className={cn(
                "flex flex-col items-stretch flex-1 space-y-2 mt-2",
                !isCollapsed && "p-2 pr-0"
            )}>
            {navLinks.filter(link => user && link.roles.includes(user.role)).map(link => {
                    const isLinkActive = activeMenuKey ? activeMenuKey === link.key : (link.href && pathname.startsWith(link.href));
                    
                    const buttonClasses = cn(
                        "w-full h-10 flex items-center transition-colors text-sidebar-foreground rounded-r-none",
                         isLinkActive
                            ? "bg-sidebar-active text-sidebar-active-foreground rounded-l-md"
                            : "hover:bg-sidebar-hover-background hover:text-sidebar-foreground rounded-l-md"
                    );

                    const contentWrapperClasses = cn(
                        "flex items-center w-full h-full",
                        isCollapsed ? "justify-center" : "pl-3",
                    );

                    return (
                        <button
                            key={link.key}
                            onClick={() => handleNavClick(link.key, link.href, link.subItems)}
                            className={buttonClasses}
                        >
                           <div className={contentWrapperClasses}>
                                <link.icon className="h-5 w-5 shrink-0" />
                                {!isCollapsed && <span className="ml-3 truncate">{link.label}</span>}
                            </div>
                        </button>
                    );
                })}
            </nav>
        );
    }
    
    // Sub-menu Panel
    if (!isPrimary && !isMobile) {
        const activeMenu = navLinks.find(link => link.key === activeMenuKey);
        if (!activeMenu || !activeMenu.subItems) return null;
        return (
            <div className="flex flex-col h-full w-full bg-sidebar-muted text-sidebar-muted-foreground">
                 <div className="flex items-center h-14 px-3 mb-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-hover-background"
                      onClick={handleBackToPrimary}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-semibold text-lg text-sidebar-foreground ml-2">{activeMenu.label}</span>
                </div>
                <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
                     {activeMenu.subItems?.map(item => {
                         if (item.type === 'label') {
                             return (
                                <div key={item.key} className="px-3 pt-4 pb-1 text-xs font-semibold tracking-wider text-sidebar-muted-foreground/80">
                                    {item.label}
                                </div>
                             )
                         }
                         if (item.type === 'collapsible') {
                             const isAnySubItemActive = item.subItems.some(sub => pathname.startsWith(sub.href));
                             
                             return (
                                <Collapsible key={item.key} defaultOpen={isAnySubItemActive} className="w-full">
                                    <CollapsibleTrigger asChild>
                                        <div className="group w-full flex items-center justify-between h-9 px-3 rounded-md text-sm font-semibold text-sidebar-muted-foreground cursor-pointer">
                                            <span>{item.label}</span>
                                            <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                                        </div>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="space-y-1 mt-1 pl-4 group">
                                        {item.subItems.map(subItem => {
                                            const isSubActive = pathname.startsWith(subItem.href);
                                            return (
                                                <a
                                                  key={subItem.key}
                                                  href={subItem.href}
                                                  onClick={(e) => { e.preventDefault(); handleSubNavClick(subItem.href); }}
                                                  className={cn(
                                                    "flex items-center h-9 gap-3 text-sm transition-colors pr-3 pl-4 group-data-[state=open]:animate-slide-in-from-left",
                                                    isSubActive
                                                      ? "bg-sidebar-muted-active-background text-sidebar-muted-active-foreground font-semibold rounded-l-md"
                                                      : "text-sidebar-muted-foreground hover:bg-sidebar-muted-hover-background hover:text-sidebar-muted-hover-foreground hover:rounded-l-md"
                                                  )}
                                                >
                                                    <subItem.icon className="h-4 w-4" />
                                                    <span>{subItem.label}</span>
                                                </a>
                                        )})}
                                    </CollapsibleContent>
                                </Collapsible>
                             )
                         }
                         
                        const subItem = item as SubNavItem;
                        const isSubActive = subItem.href && pathname.startsWith(subItem.href);
                        return (
                             <a
                                key={subItem.key}
                                href={subItem.href}
                                onClick={(e) => { e.preventDefault(); handleSubNavClick(subItem.href); }}
                                className={cn(
                                    "flex items-center h-9 gap-3 text-sm transition-colors pl-4 pr-3 group-data-[state=open]:animate-slide-in-from-left",
                                    isSubActive
                                        ? "bg-sidebar-muted-active-background text-sidebar-muted-active-foreground font-semibold rounded-l-md"
                                        : "text-sidebar-muted-foreground hover:bg-sidebar-muted-hover-background hover:text-sidebar-muted-hover-foreground hover:rounded-l-md"
                                )}>
                                <subItem.icon className="h-4 w-4" /> <span>{subItem.label}</span>
                             </a>
                        )
                     })}
                </nav>
            </div>
         )
    }

    // Mobile Sidebar (inside Sheet)
    if (isMobile) {
        return (
            <div className="flex flex-col h-full text-sidebar-foreground">
                <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-foreground/20">
                     <Link href="/dashboard" className="flex items-center gap-2">
                        <Image priority src="https://grupomatos.ind.br/storage/2024/06/Perfil-Grupo-Matos2.png" alt="Grupo Matos Logo" width={150} height={150} className="h-8 w-auto filter brightness-0 invert" />
                    </Link>
                    <Button variant="ghost" size="icon" onClick={logout} className="text-sidebar-foreground">
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
                 <nav className="flex-1 space-y-1 p-2 mt-2 overflow-y-auto custom-scrollbar">
                {navLinks.filter(link => user && link.roles.includes(user.role)).map(link => {
                        const isActive = link.href ? pathname.startsWith(link.href) : false;
                        if (!link.subItems) {
                            return (
                                <a key={link.key} href={link.href} onClick={(e) => { e.preventDefault(); handleNavClick(link.key, link.href); }}
                                    className={cn("flex items-center h-10 px-3 rounded-md gap-3 text-sm transition-colors",
                                        isActive ? "bg-sidebar-active text-sidebar-active-foreground font-semibold" : "hover:bg-sidebar-hover-background"
                                    )}
                                >
                                    <link.icon className="h-5 w-5" />
                                    <span>{link.label}</span>
                                </a>
                            )
                        }

                        return (
                            <Collapsible key={link.key}>
                                <CollapsibleTrigger className="w-full flex items-center justify-between h-10 px-3 rounded-md hover:bg-sidebar-hover-background data-[state=open]:bg-sidebar-hover-background">
                                    <div className="flex items-center gap-3 text-sm">
                                        <link.icon className="h-5 w-5" />
                                        <span>{link.label}</span>
                                    </div>
                                    <ChevronRight className="h-4 w-4 transition-transform data-[state=open]:rotate-90" />
                                </CollapsibleTrigger>
                                <CollapsibleContent className="space-y-1 mt-1 group data-[state=open]:animate-slide-in-from-left">
                                    {link.subItems.map(item => {
                                        if (item.type === 'label') {
                                            return (
                                                <div key={item.key} className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wider text-sidebar-foreground/80">
                                                    {item.label}
                                                </div>
                                            );
                                        }
                                        if (item.type === 'collapsible') {
                                             return (
                                                <Collapsible key={item.key}>
                                                    <CollapsibleTrigger className="w-full flex items-center justify-between h-9 px-3 rounded-md text-sm font-medium hover:bg-sidebar-hover-background data-[state=open]:bg-sidebar-hover-background">
                                                        <span className="pl-6">{item.label}</span>
                                                        <ChevronRight className="h-4 w-4 transition-transform data-[state=open]:rotate-90" />
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent className="space-y-1 mt-1 group data-[state=open]:animate-slide-in-from-left">
                                                        {item.subItems.map(sub => {
                                                            const isSubActive = pathname.startsWith(sub.href);
                                                            return (
                                                                <a key={sub.key} href={sub.href} onClick={(e) => { e.preventDefault(); handleSubNavClick(sub.href); }}
                                                                    className={cn("flex items-center h-9 pl-12 pr-3 rounded-md gap-3 text-sm group-data-[state=open]:animate-slide-in-from-left", isSubActive ? "bg-sidebar-active text-sidebar-active-foreground font-semibold" : "hover:bg-sidebar-hover-background")}
                                                                >
                                                                    <span>{sub.label}</span>
                                                                </a>
                                                            )
                                                        })}
                                                    </CollapsibleContent>
                                                </Collapsible>
                                             )
                                        }
                                        const subItem = item as SubNavItem;
                                        const isSubActive = subItem.href && pathname.startsWith(subItem.href);
                                        return (
                                             <a key={subItem.key} href={subItem.href} onClick={(e) => { e.preventDefault(); handleSubNavClick(subItem.href); }}
                                                className={cn("flex items-center h-9 pl-8 pr-3 rounded-md gap-3 text-sm group-data-[state=open]:animate-slide-in-from-left", isSubActive ? "bg-sidebar-active text-sidebar-active-foreground font-semibold" : "hover:bg-sidebar-hover-background")}
                                             >
                                                <span>{subItem.label}</span>
                                             </a>
                                        )
                                    })}
                                </CollapsibleContent>
                            </Collapsible>
                        )
                    })}
                </nav>
            </div>
        )
    }

    return null;
}
