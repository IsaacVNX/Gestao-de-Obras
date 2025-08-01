
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Search, PlusCircle, ChevronDown, ArrowUp, ArrowDown, Trash2, Edit, MoreHorizontal, Printer, Upload, Download } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { useLoading } from '@/hooks/use-loading';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
} from "@/components/ui/alert-dialog"
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export type Cliente = {
    id: string;
    razaoSocial: string;
    nomeFantasia: string;
    cnpj: string;
    telefone: string;
    email: string;
    status: 'ativo' | 'inativo';
};

type SortConfig = {
    key: keyof Cliente;
    direction: 'ascending' | 'descending';
};

export function ClientManagement() {
    const { user } = useAuth();
    const router = useRouter();
    const { setIsLoading } = useLoading();
    const { toast } = useToast();
    
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'ativo' | 'inativo' | 'todos'>('ativo');
    const [selectedClients, setSelectedClients] = useState<string[]>([]);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'razaoSocial', direction: 'ascending' });
    
    const canManageClients = user?.role === 'admin' || user?.role === 'gestor';

    useEffect(() => {
        async function fetchClients() {
            setLoading(true);
            try {
                const clientsSnapshot = await getDocs(collection(db, 'clientes'));
                const clientsList = clientsSnapshot.docs.map(doc => ({ id: doc.id, status: 'ativo', ...doc.data() } as Cliente));
                setClientes(clientsList);
            } catch (error) {
                console.error("Erro ao buscar clientes:", error);
                toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os clientes.' });
            } finally {
                setLoading(false);
            }
        }
        fetchClients();
    }, [toast]);

    const handleBulkDelete = async () => {
        // Placeholder for bulk deletion logic
        toast({ title: 'Em desenvolvimento', description: 'A exclusão em massa será implementada em breve.' });
    };

    const handleBulkInactivate = async () => {
        // Placeholder for bulk inactivation logic
        toast({ title: 'Em desenvolvimento', description: 'A inativação em massa será implementada em breve.' });
    };

    const filteredAndSortedClients = useMemo(() => {
        let filtered = clientes;

        if (activeTab !== 'todos') {
            filtered = filtered.filter(c => c.status === activeTab);
        }

        if (searchTerm) {
            const lowerCaseTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(c => 
                c.razaoSocial.toLowerCase().includes(lowerCaseTerm) ||
                c.nomeFantasia.toLowerCase().includes(lowerCaseTerm) ||
                c.cnpj.toLowerCase().includes(lowerCaseTerm)
            );
        }
        
        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        
        return filtered;
    }, [clientes, activeTab, searchTerm, sortConfig]);

    const requestSort = (key: keyof Cliente) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof Cliente) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <ArrowUp className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground" />;
        }
        return sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
    };
    
    const clientCounts = useMemo(() => {
        return {
            ativo: clientes.filter(c => c.status === 'ativo').length,
            inativo: clientes.filter(c => c.status === 'inativo').length,
            todos: clientes.length,
        }
    }, [clientes]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedClients(filteredAndSortedClients.map(c => c.id));
        } else {
            setSelectedClients([]);
        }
    };
    
    const handleSelectClient = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedClients(prev => [...prev, id]);
        } else {
            setSelectedClients(prev => prev.filter(clientId => clientId !== id));
        }
    };

    const isAllSelected = selectedClients.length > 0 && selectedClients.length === filteredAndSortedClients.length;


    return (
        <div className="space-y-4">
            {/* Header Actions */}
            <div className="flex items-center gap-2">
                 <Button 
                    onClick={() => { setIsLoading(true); router.push('/expedicao/cadastros/clientes/new')}}
                    className="transition-transform duration-200 hover:scale-105"
                 >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Novo Cliente
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button variant="outline" className="text-black">Exportar <ChevronDown className="ml-2 h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem>Exportar para PDF</DropdownMenuItem>
                        <DropdownMenuItem>Exportar para Excel</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" className="text-black"><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="text-black">Mais ações <ChevronDown className="ml-2 h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                     <DropdownMenuContent>
                        <DropdownMenuItem><Upload className="mr-2 h-4 w-4" />Importar Clientes</DropdownMenuItem>
                        <DropdownMenuItem><Download className="mr-2 h-4 w-4" />Baixar Modelo</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Filter Area */}
            <Card className="bg-[#d1d1d1]">
                <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-grow">
                             <Input 
                                placeholder="Pesquisar"
                                className="pl-4 pr-10 bg-white border-gray-300 text-black"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        </div>
                        <Button variant="outline" className="text-black">Mais filtros <ChevronDown className="ml-2 h-4 w-4" /></Button>
                    </div>

                    {/* Stats Tabs */}
                    <div className="grid grid-cols-3 text-center border-b">
                        <button onClick={() => setActiveTab('ativo')} className={cn("py-3 relative text-black", activeTab === 'ativo' && "font-semibold")}>
                            Ativo <Badge className="ml-2 bg-gray-200 text-black">{clientCounts.ativo}</Badge>
                            {activeTab === 'ativo' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
                        </button>
                        <button onClick={() => setActiveTab('inativo')} className={cn("py-3 relative text-black", activeTab === 'inativo' && "font-semibold")}>
                            Inativo <Badge className="ml-2 bg-gray-200 text-black">{clientCounts.inativo}</Badge>
                             {activeTab === 'inativo' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
                        </button>
                        <button onClick={() => setActiveTab('todos')} className={cn("py-3 relative text-black", activeTab === 'todos' && "font-semibold")}>
                            Todos <Badge className="ml-2 bg-gray-200 text-black">{clientCounts.todos}</Badge>
                             {activeTab === 'todos' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
                        </button>
                    </div>

                    {/* Bulk Actions */}
                    {selectedClients.length > 0 && (
                        <div className="bg-blue-50 p-3 rounded-md flex items-center gap-4">
                            <span className="text-sm text-black">{selectedClients.length} registro(s) selecionado(s)</span>
                            <Button variant="link" className="p-0 h-auto text-sm text-black" onClick={handleBulkDelete}>Excluir</Button>
                            <Button variant="link" className="p-0 h-auto text-sm text-black" onClick={handleBulkInactivate}>Inativar</Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Data Table */}
            <Card className="bg-[#d1d1d1]">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-12"><Checkbox className="border-black data-[state=checked]:bg-black data-[state=checked]:text-white" checked={isAllSelected} onCheckedChange={handleSelectAll} /></TableHead>
                                <TableHead className="cursor-pointer group text-black" onClick={() => requestSort('razaoSocial')}>Nome {getSortIcon('razaoSocial')}</TableHead>
                                <TableHead className="cursor-pointer group text-black" onClick={() => requestSort('cnpj')}>CPF/CNPJ {getSortIcon('cnpj')}</TableHead>
                                <TableHead className="cursor-pointer group text-black" onClick={() => requestSort('email')}>E-mail {getSortIcon('email')}</TableHead>
                                <TableHead className="cursor-pointer group text-black" onClick={() => requestSort('telefone')}>Telefone {getSortIcon('telefone')}</TableHead>
                                <TableHead className="cursor-pointer group text-black" onClick={() => requestSort('status')}>Situação {getSortIcon('status')}</TableHead>
                                <TableHead className="text-right text-black">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                         <TableBody>
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : filteredAndSortedClients.length > 0 ? (
                                filteredAndSortedClients.map(client => (
                                    <TableRow key={client.id}>
                                        <TableCell><Checkbox className="border-black data-[state=checked]:bg-black data-[state=checked]:text-white" checked={selectedClients.includes(client.id)} onCheckedChange={(checked) => handleSelectClient(client.id, !!checked)} /></TableCell>
                                        <TableCell className="font-medium text-black">{client.razaoSocial}</TableCell>
                                        <TableCell className="text-black">{client.cnpj}</TableCell>
                                        <TableCell className="text-black">{client.email}</TableCell>
                                        <TableCell className="text-black">{client.telefone}</TableCell>
                                        <TableCell>
                                            <Badge variant={client.status === 'ativo' ? 'default' : 'secondary'} className={cn(client.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')}>{client.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                             <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="link" className="text-black p-0 h-auto">Ações <ChevronDown className="ml-1 h-4 w-4"/></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => router.push(`/expedicao/cadastros/clientes/edit/${client.id}`)}>
                                                        <Edit className="mr-2 h-4 w-4" /> Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive focus:text-destructive">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24 text-black">Nenhum cliente encontrado.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
