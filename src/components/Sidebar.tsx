
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
                 isCollapsed ? "w-[50px]" : "w-[270px]"
            )}>
                <SidebarContent 
                    isPrimary={true}
                    isCollapsed={isCollapsed}
                    setIsCollapsed={setIsCollapsed}
                    activeMenuKey={activeMenuKey}
                    setActiveMenuKey={setActiveMenuKey}
                    setIsSubMenuVisible={setIsSubMenuVisible}
                />
                 <div className="mt-auto p-2 pr-0">
                    <TooltipProvider delayDuration={0}>
                         <Tooltip>
                            <TooltipTrigger asChild>
                                 <Button 
                                    variant="ghost" 
                                    className={cn(
                                        "w-full text-sidebar-foreground hover:bg-sidebar-hover-background hover:text-sidebar-foreground rounded-l-md rounded-r-none",
                                        isCollapsed ? "justify-center" : "justify-start"
                                    )}
                                    onClick={handleCollapse}
                                >
                                    <div className={cn("flex items-center", isCollapsed ? "" : "pl-3")}>
                                        {isCollapsed ? <PanelRightClose className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                                        {!isCollapsed ? (
                                            <span className="ml-3">{getTooltipText()}</span>
                                        ) : (
                                            <span className="sr-only">{getTooltipText()}</span>
                                        )}
                                    </div>
                                </Button>
                            </TooltipTrigger>
                            {isCollapsed && (
                             <TooltipContent side="right" className="bg-background text-foreground">
                                <p>{getTooltipText()}</p>
                            </TooltipContent>
                            )}
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
            
            {/* Secondary Sidebar (Sub-menu) */}
            <div className={cn(
                "h-full bg-sidebar-muted transition-all duration-300 ease-in-out overflow-hidden",
                activeMenuKey && isSubMenuVisible ? "w-[240px]" : "w-0"
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
