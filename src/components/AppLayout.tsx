
'use client';
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoadingSpinner } from './ui/loading-spinner';
import { cn } from '@/lib/utils';
import { LoadingProvider, useLoading } from '@/hooks/use-loading';
import Sidebar from './Sidebar';
import Header from './Header';
import { navLinks } from '@/lib/nav-links';


function InnerAppLayout({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isLoading, setIsLoading } = useLoading();
  const router = useRouter();
  const pathname = usePathname();
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeMenuKey, setActiveMenuKey] = useState<string | null>(null);
  const [isSubMenuVisible, setIsSubMenuVisible] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    setIsLoading(false);
    
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
    
    if (currentMainCategory) {
        setActiveMenuKey(currentMainCategory);
        setIsSidebarCollapsed(true);
        setIsSubMenuVisible(true);
    } else {
        setActiveMenuKey(null);
        setIsSidebarCollapsed(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);


  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <LoadingSpinner size={48} />
        <p className="mt-4 text-lg text-muted-foreground">Carregando...</p>
      </div>
    );
  }
  
  const getLeftMargin = () => {
    // Sub-menu is active and visible
    if (activeMenuKey && isSubMenuVisible) {
        return 'lg:ml-[290px]'; // 50px (collapsed primary) + 240px (sub-menu)
    }
    // Only the main sidebar is visible (either collapsed or expanded)
    if (isSidebarCollapsed) {
        return 'lg:ml-[50px]';
    }
    return 'lg:ml-[270px]';
  };


  return (
    <div className="min-h-screen w-full bg-app-background">
      <div className="absolute inset-0 z-0 bg-background/95" />

      {isLoading && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <LoadingSpinner size={48} />
        </div>
      )}
      
      <Header 
        user={user} 
        isSidebarCollapsed={isSidebarCollapsed}
        isSubMenuVisible={isSubMenuVisible}
        activeMenuKey={activeMenuKey}
      />

      <div className="relative z-10 flex h-screen">
         <Sidebar 
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
            activeMenuKey={activeMenuKey}
            setActiveMenuKey={setActiveMenuKey}
            isSubMenuVisible={isSubMenuVisible}
            setIsSubMenuVisible={setIsSubMenuVisible}
        />
        
        <main className={cn(
            "flex-1 flex flex-col overflow-y-auto transition-all duration-300 ease-in-out pt-16",
            "ml-0", // No margin on mobile, sidebar overlays
            getLeftMargin()
          )}>
            <div className="p-4 sm:p-6 lg:p-8">
              {children}
            </div>
        </main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
    return (
        <LoadingProvider>
            <InnerAppLayout>{children}</InnerAppLayout>
        </LoadingProvider>
    )
}
