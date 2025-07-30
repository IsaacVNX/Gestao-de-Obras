
import { LayoutDashboard, HardHat, Users, Warehouse, Map, Truck, Building, Package, LogIn, LogOut, ClipboardCheck } from 'lucide-react';
import React from 'react';

export type SubNavItem = {
  key: string;
  href: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
  type?: 'link';
};

export type MenuLabel = {
  type: 'label';
  key: string;
  label: string;
  roles: string[];
}

export type CollapsibleSubMenu = {
  type: 'collapsible';
  key: string;
  label: string;
  icon?: React.ElementType;
  roles: string[];
  subItems: SubNavItem[];
};

export type NavItem = {
  key: string;
  href?: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
  subItems?: (SubNavItem | CollapsibleSubMenu | MenuLabel)[];
};

const FlippedLogOutIcon = (props: React.ComponentProps<typeof LogOut>) => {
    const combinedClassName = `${props.className || ''} scale-x-[-1]`;
    return React.createElement(LogOut, { ...props, className: combinedClassName });
};


export const navLinks: NavItem[] = [
    { key: 'dashboard', href: '/dashboard', label: 'Início', icon: LayoutDashboard, roles: ['admin', 'gestor', 'escritorio', 'encarregado', 'montador'] },
    { 
        key: 'obras', 
        label: 'Obras', 
        icon: HardHat, 
        roles: ['admin', 'gestor', 'escritorio', 'encarregado', 'montador'],
        subItems: [
            { key: 'obras-lista', href: '/obras', label: 'Lista de Obras', icon: HardHat, roles: ['admin', 'gestor', 'escritorio', 'encarregado', 'montador'] },
        ]
    },
    { 
        key: 'rh', 
        label: 'RH', 
        icon: Users, 
        roles: ['admin', 'gestor', 'escritorio'],
        subItems: [
            { key: 'rh-users', href: '/rh', label: 'Gerenciamento de Usuários', icon: Users, roles: ['admin', 'gestor', 'escritorio'] },
        ]
    },
    { 
        key: 'almoxarifado', 
        label: 'Almoxarifado', 
        icon: Warehouse, 
        roles: ['admin', 'gestor'],
        subItems: [
             { key: 'almoxarifado-painel', href: '/almoxarifado', label: 'Painel do Almoxarifado', icon: Warehouse, roles: ['admin', 'gestor'] },
        ]
    },
    { 
        key: 'expedicao',
        label: 'Expedição', 
        icon: Truck, 
        roles: ['admin', 'gestor', 'escritorio'],
        subItems: [
            {
                type: 'collapsible',
                key: 'registros',
                label: 'Registros',
                roles: ['admin', 'gestor', 'escritorio'],
                subItems: [
                    { key: 'entradas', href: '/expedicao/entradas', label: 'Entradas', icon: LogIn, roles: ['admin', 'gestor', 'escritorio'] },
                    { key: 'saidas', href: '/expedicao/saidas', label: 'Saídas', icon: FlippedLogOutIcon, roles: ['admin', 'gestor', 'escritorio'] },
                ]
            },
            { 
                type: 'collapsible',
                key: 'cadastros',
                label: 'Cadastros',
                roles: ['admin', 'gestor', 'escritorio'],
                subItems: [
                    { key: 'clientes', href: '/expedicao/cadastros/clientes', label: 'Clientes', icon: Building, roles: ['admin', 'gestor', 'escritorio'] },
                    { key: 'produtos', href: '/expedicao/cadastros/produtos', label: 'Produtos', icon: Package, roles: ['admin', 'gestor'] },
                    { key: 'transportadoras', href: '/expedicao/cadastros/transportadoras', label: 'Transportadoras', icon: Truck, roles: ['admin', 'gestor', 'escritorio'] },
                    { key: 'fornecedores', href: '/expedicao/cadastros/fornecedores', label: 'Fornecedores', icon: ClipboardCheck, roles: ['admin', 'gestor'] },
                ]
            }
        ]
    },
    { 
        key: 'mapa', 
        label: 'Mapa', 
        icon: Map, 
        roles: ['admin', 'gestor'],
        subItems: [
             { key: 'mapa-obras', href: '/mapa', label: 'Mapa de Obras', icon: Map, roles: ['admin', 'gestor'] },
        ]
    },
];
