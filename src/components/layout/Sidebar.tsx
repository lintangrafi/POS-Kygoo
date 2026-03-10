'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard,
    ShoppingCart,
    History,
    Settings,
    LogOut,
    Package,
    ClipboardList,
    FileText,
    Menu,
    X,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { logoutAction } from '@/actions/auth-actions';
import { useState } from 'react';

interface SidebarProps {
    role: 'CASHIER' | 'ADMIN' | 'SUPERADMIN';
}

export function Sidebar({ role }: SidebarProps) {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const links = [
        {
            href: '/dashboard',
            label: 'Overview',
            icon: LayoutDashboard,
            roles: ['ADMIN', 'SUPERADMIN'],
        },
        {
            href: '/pos',
            label: 'Point of Sale',
            icon: ShoppingCart,
            roles: ['CASHIER', 'SUPERADMIN'],
        },
        {
            href: '/shift',
            label: 'Shift Management',
            icon: History,
            roles: ['CASHIER', 'SUPERADMIN'],
        },
        {
            href: '/inventory',
            label: 'Inventory',
            icon: Package,
            roles: ['ADMIN', 'SUPERADMIN'],
        },
        {
            href: '/reports',
            label: 'Reports',
            icon: ClipboardList,
            roles: ['ADMIN', 'SUPERADMIN'],
        },
        {
            href: '/invoices',
            label: 'Invoices',
            icon: FileText,
            roles: ['ADMIN', 'SUPERADMIN'],
        },
        {
            href: '/settings',
            label: 'Settings',
            icon: Settings,
            roles: ['SUPERADMIN'],
        },
    ];

    const filteredLinks = links.filter((link) => link.roles.includes(role));

    return (
        <>
            {/* Mobile Menu Button */}
            <div className="lg:hidden fixed top-4 left-4 z-50 enter-fade-up">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="surface-glass border-border/70 shadow-md min-h-[44px] min-w-[44px]"
                >
                    {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
            </div>

            {/* Sidebar */}
            <div className={cn(
                "surface-glass fixed lg:static inset-y-0 left-0 z-40 flex h-full flex-col border-r border-border/65 text-card-foreground transition-all duration-300 ease-in-out",
                isCollapsed ? "w-16" : "w-64",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
            <div className="p-5 flex items-center gap-3 border-b border-border/60">
                <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-sm">K</div>
                <div className={cn("leading-tight", isCollapsed && "hidden")}>
                    <p className="text-sm font-semibold">Kygoo Studio</p>
                    <p className="text-xs text-muted-foreground">POS Console</p>
                </div>

                {/* Collapse Toggle */}
                <div className="ml-auto hidden lg:flex">
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => setIsCollapsed(!isCollapsed)}>
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </Button>
                </div>
            </div>

            <div className="px-4 pb-2 pt-3">
                <p className={cn("px-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground", isCollapsed && "hidden")}>
                    Navigasi
                </p>
            </div>

            <div className="flex-1 px-3 space-y-1.5 overflow-y-auto scrollbar-thin">
                {filteredLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname.startsWith(link.href);

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="block"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <Button
                                variant={isActive ? 'secondary' : 'ghost'}
                                className={cn(
                                    "h-10 w-full rounded-lg transition-all duration-200",
                                    isCollapsed ? "justify-center" : "justify-start gap-3",
                                    isActive
                                        ? "bg-primary/12 text-foreground font-semibold shadow-sm"
                                        : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                                )}
                            >
                                <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                                <span className={cn(isCollapsed ? "hidden" : "inline")}>{link.label}</span>
                            </Button>
                        </Link>
                    );
                })}
            </div>

            <div className="p-4 border-t border-border/65">
                <form action={logoutAction} className="flex items-center gap-3">
                    <Button variant="outline" className={cn("w-full justify-start gap-3 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive", isCollapsed ? "justify-center" : "") }>
                        <LogOut className="w-4 h-4" />
                        <span className={cn(isCollapsed ? "hidden" : "inline")}>Sign Out</span>
                    </Button>
                </form>
            </div>
        </div>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
            <div 
                className="lg:hidden fixed inset-0 bg-foreground/35 backdrop-blur-[1px] z-30"
                onClick={() => setIsMobileMenuOpen(false)}
            />
        )}
        </>
    );
}
