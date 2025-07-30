
'use client'
import SidebarContent from './SidebarContent';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { PanelLeftClose, PanelRightClose } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface SidebarProps {
    isCollapsed: boolean;
    setIsCollapsed: (isCollapsed: boolean) => void;
    activeMenuKey: string | null;
    setActiveMenuKey: (key: string | null) => void;
    isSubMenuVisible: boolean;
    setIsSubMenuVisible: (isVisible: boolean) => void;
}

export default function Sidebar({ 
    isCollapsed, 
    setIsCollapsed, 
    activeMenuKey, 
    setActiveMenuKey,
    isSubMenuVisible,
    setIsSubMenuVisible,
}: SidebarProps) {
    
    const handleCollapse = () => {
        // If a sub-menu is active, the toggle button controls the sub-menu's visibility.
        if (activeMenuKey) {
            setIsSubMenuVisible(!isSubMenuVisible);
        } else {
            // If no sub-menu is active, it toggles the primary sidebar.
            setIsCollapsed(!isCollapsed);
        }
    }
    
    const getTooltipText = () => {
        if (activeMenuKey) {
            return isSubMenuVisible ? 'Recolher Menu' : 'Expandir Menu';
        }
        return isCollapsed ? 'Expandir' : 'Recolher';
    }

    return (
        <aside className={cn("hidden lg:flex fixed top-16 left-0 h-[calc(100vh-4rem)] z-20 transition-all duration-300 ease-in-out")}>
            {/* Primary Sidebar */}
            <div className={cn(
                "bg-sidebar h-full flex flex-col transition-all duration-300 ease-in-out",
                 isCollapsed ? "w-[68px]" : "w-[280px]"
            )}>
                <SidebarContent 
                    isPrimary={true}
                    isCollapsed={isCollapsed}
                    setIsCollapsed={setIsCollapsed}
                    activeMenuKey={activeMenuKey}
                    setActiveMenuKey={setActiveMenuKey}
                    setIsSubMenuVisible={setIsSubMenuVisible}
                />
                 <div className="mt-auto p-2">
                    <TooltipProvider delayDuration={0}>
                         <Tooltip>
                            <TooltipTrigger asChild>
                                 <Button 
                                    variant="ghost" 
                                    className="w-full justify-center text-sidebar-foreground hover:bg-sidebar-hover-background hover:text-sidebar-foreground"
                                    onClick={handleCollapse}
                                >
                                    {isCollapsed ? <PanelRightClose className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                                    <span className="sr-only">{getTooltipText()}</span>
                                </Button>
                            </TooltipTrigger>
                             <TooltipContent side="right" className="bg-background text-foreground">
                                <p>{getTooltipText()}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
            
            {/* Secondary Sidebar (Sub-menu) */}
            <div className={cn(
                "h-full bg-sidebar-muted transition-all duration-300 ease-in-out overflow-hidden",
                activeMenuKey && isSubMenuVisible ? "w-[288px]" : "w-0"
            )}>
                 <SidebarContent
                    isPrimary={false}
                    isCollapsed={isCollapsed}
                    setIsCollapsed={setIsCollapsed}
                    activeMenuKey={activeMenuKey}
                    setActiveMenuKey={setActiveMenuKey}
                    setIsSubMenuVisible={setIsSubMenuVisible}
                />
            </div>
        </aside>
    )
}
