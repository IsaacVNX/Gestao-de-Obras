
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Search, PlusCircle, ChevronDown, ArrowUp, ArrowDown, Trash2, Edit, MoreHorizontal, Printer, Upload, Download, UserX, UserCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { useLoading } from '@/hooks/use-loading';
import { collection, getDocs, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
} from "@/components/ui/alert-dialog"
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { NewClientForm } from './NewClientForm';
import { EditClientForm } from './EditClientForm';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export type Cliente = {
    id: string;
    tipoPessoa: 'juridica' | 'fisica';
    razaoSocial?: string;
    nomeFantasia?: string;
    nomeCompleto?: string;
    cnpj?: string;
    cpf?: string;
    telefone: string;
    email: string;
    status: 'ativo' | 'inativo';
};

type SortConfig = {
    key: keyof Cliente | 'nome' | 'documento';
    direction: 'ascending' | 'descending';
};

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 30, 50, 100];

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
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'nome', direction: 'ascending' });
    const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_OPTIONS[0]);
    const [currentPage, setCurrentPage] = useState(1);
    const [goToPageInput, setGoToPageInput] = useState('');
    
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Cliente | null>(null);
    const [isClosing, setIsClosing] = useState(false);

    const handleOpenCreateModal = () => {
        setCreateModalOpen(true);
    };

    const handleCloseCreateModal = () => {
        setIsClosing(true);
        setTimeout(() => {
            setCreateModalOpen(false);
            setIsClosing(false);
        }, 500);
    };

    const handleOpenEditModal = (client: Cliente) => {
        setEditingClient(client);
    };

    const handleCloseEditModal = () => {
        setEditingClient(null);
    };

    const canManageClients = user?.role === 'admin' || user?.role === 'gestor' || user?.role === 'escritorio';

    const fetchClients = async () => {
        setLoading(true);
        try {
            const clientsSnapshot = await getDocs(collection(db, 'clientes'));
            const clientsList = clientsSnapshot.docs.map(doc => {
                const data = doc.data();
                return { 
                    id: doc.id, 
                    status: data.status || 'ativo',
                    tipoPessoa: data.tipoPessoa || 'juridica',
                    ...data 
                } as Cliente;
            });
            setClientes(clientsList);
        } catch (error) {
            console.error("Erro ao buscar clientes:", error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os clientes.' });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchClients();
    }, [toast]);
    
    const handleDeleteClient = async (clientId: string) => {
        try {
            await deleteDoc(doc(db, 'clientes', clientId));
            setClientes(prev => prev.filter(c => c.id !== clientId));
            setSelectedClients(prev => prev.filter(id => id !== clientId));
            toast({ title: 'Cliente Excluído', description: 'O cliente foi removido com sucesso.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao Excluir', description: 'Não foi possível remover o cliente.' });
        }
    };
    
    const handleToggleStatus = async (clientIds: string[], newStatus: 'ativo' | 'inativo') => {
        const batch = writeBatch(db);
        clientIds.forEach(id => {
            const clientRef = doc(db, 'clientes', id);
            batch.update(clientRef, { status: newStatus });
        });

        try {
            await batch.commit();
            setClientes(prev => prev.map(c => clientIds.includes(c.id) ? { ...c, status: newStatus } : c));
            setSelectedClients([]);
            toast({ title: 'Status Atualizado', description: `Cliente(s) foram marcados como ${newStatus === 'ativo' ? 'ativos' : 'inativos'}.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao Atualizar', description: 'Não foi possível alterar o status do(s) cliente(s).' });
        }
    };

    const handleBulkDelete = async () => {
        const batch = writeBatch(db);
        selectedClients.forEach(id => {
            batch.delete(doc(db, 'clientes', id));
        });

        try {
            await batch.commit();
            setClientes(prev => prev.filter(c => !selectedClients.includes(c.id)));
            setSelectedClients([]);
            toast({ title: 'Clientes Excluídos', description: `${selectedClients.length} clientes foram removidos com sucesso.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao Excluir', description: 'Não foi possível remover os clientes selecionados.' });
        }
    };

    const filteredAndSortedClients = useMemo(() => {
        let filtered = clientes;

        if (activeTab !== 'todos') {
            filtered = filtered.filter(c => c.status === activeTab);
        }

        if (searchTerm) {
            const lowerCaseTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(c => {
                const nome = c.tipoPessoa === 'juridica' ? c.razaoSocial : c.nomeCompleto;
                const documento = c.tipoPessoa === 'juridica' ? c.cnpj : c.cpf;
                return (nome && nome.toLowerCase().includes(lowerCaseTerm)) ||
                       (documento && documento.includes(lowerCaseTerm)) ||
                       (c.nomeFantasia && c.nomeFantasia.toLowerCase().includes(lowerCaseTerm));
            });
        }
        
        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                let aValue, bValue;

                if (sortConfig.key === 'nome') {
                    aValue = a.tipoPessoa === 'juridica' ? a.razaoSocial : a.nomeCompleto;
                    bValue = b.tipoPessoa === 'juridica' ? b.razaoSocial : b.nomeCompleto;
                } else if (sortConfig.key === 'documento') {
                    aValue = a.tipoPessoa === 'juridica' ? a.cnpj : a.cpf;
                    bValue = b.tipoPessoa === 'juridica' ? b.cnpj : b.cpf;
                } else {
                    aValue = a[sortConfig.key as keyof Cliente];
                    bValue = b[sortConfig.key as keyof Cliente];
                }

                if (aValue === undefined || aValue === null) return 1;
                if (bValue === undefined || bValue === null) return -1;

                if (String(aValue).toLowerCase() < String(bValue).toLowerCase()) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (String(aValue).toLowerCase() > String(bValue).toLowerCase()) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        
        return filtered;
    }, [clientes, activeTab, searchTerm, sortConfig]);

    const requestSort = (key: keyof Cliente | 'nome' | 'documento') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof Cliente | 'nome' | 'documento') => {
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

    const totalPages = Math.ceil(filteredAndSortedClients.length / itemsPerPage);
    const paginatedClients = filteredAndSortedClients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);


    const generatePDF = (title: string, action: 'save' | 'print') => {
        const doc = new jsPDF();
        const tableData = filteredAndSortedClients.map(c => [
            (c.tipoPessoa === 'juridica' ? c.razaoSocial : c.nomeCompleto) || '',
            (c.tipoPessoa === 'juridica' ? c.cnpj : c.cpf) || '',
            c.email || '',
            c.telefone || '',
            c.status || '',
        ]);

        autoTable(doc, {
            head: [['Nome/Razão Social', 'CPF/CNPJ', 'E-mail', 'Telefone', 'Situação']],
            body: tableData,
            didDrawPage: (data) => {
                doc.setFontSize(16);
                doc.setTextColor(40);
                doc.text("Gestão de Obras", data.settings.margin.left, 15);
                doc.setFontSize(12);
                doc.text(title, data.settings.margin.left, 22);

                let footerText = `Página ${data.pageNumber}`;
                if ((doc as any).putTotalPages) {
                    footerText += ` de {totalPages}`;
                }
                const dateText = `Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`;
                
                doc.setFontSize(10);
                doc.setTextColor(150);
                
                doc.text(footerText, data.settings.margin.left, doc.internal.pageSize.getHeight() - 10);
                
                const dateTextWidth = doc.getStringUnitWidth(dateText) * doc.getFontSize() / doc.internal.scaleFactor;
                doc.text(dateText, doc.internal.pageSize.getWidth() - data.settings.margin.right - dateTextWidth, doc.internal.pageSize.getHeight() - 10);
            },
            margin: { top: 30 },
        });

        if ((doc as any).putTotalPages) {
            (doc as any).putTotalPages('{totalPages}');
        }

        if (action === 'save') {
            doc.save('relatorio_clientes.pdf');
        } else {
            doc.output('dataurlnewwindow');
        }
    };

    const handlePrint = () => {
        generatePDF('Relatório de Clientes', 'print');
    };

    const handleExportPDF = () => {
        generatePDF('Relatório de Clientes', 'save');
    };


    const handleExportExcel = () => {
        const dataToExport = filteredAndSortedClients.map(c => ({
            "Nome/Razão Social": c.tipoPessoa === 'juridica' ? c.razaoSocial : c.nomeCompleto,
            "CPF/CNPJ": c.tipoPessoa === 'juridica' ? c.cnpj : c.cpf,
            "Email": c.email,
            "Telefone": c.telefone,
            "Status": c.status,
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');
        XLSX.writeFile(workbook, 'relatorio_clientes.xlsx');
    };

    const showDevelopmentToast = () => {
        toast({
            title: 'Em desenvolvimento',
            description: 'Esta funcionalidade está sendo preparada e estará disponível em breve.',
        });
    };
    
    const handleGoToPage = () => {
        const page = parseInt(goToPageInput, 10);
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        } else {
            toast({ variant: 'destructive', title: 'Página Inválida', description: `Por favor, insira um número entre 1 e ${totalPages}.`});
        }
        setGoToPageInput('');
    };

    return (
        <>
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Button 
                        onClick={handleOpenCreateModal}
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
                            <DropdownMenuItem onClick={handleExportPDF}>Exportar para PDF</DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportExcel}>Exportar para Excel</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" className="text-black" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="text-black">Mais ações <ChevronDown className="ml-2 h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={showDevelopmentToast}><Upload className="mr-2 h-4 w-4" />Importar Clientes</DropdownMenuItem>
                            <DropdownMenuItem onClick={showDevelopmentToast}><Download className="mr-2 h-4 w-4" />Baixar Modelo</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <Card className="bg-[#d1d1d1]">
                    <CardContent className="p-4 space-y-4">
                        <div className="relative flex-grow">
                            <Input 
                                placeholder="Pesquisar por nome, razão social, CPF ou CNPJ..."
                                className="pl-4 pr-10 bg-white border-gray-300 text-black"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        </div>

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

                        {canManageClients && selectedClients.length > 1 && (
                            <div className="bg-blue-50 p-3 rounded-md flex items-center gap-4">
                                <span className="text-sm text-black">{selectedClients.length} registro(s) selecionado(s)</span>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="link" className="p-0 h-auto text-sm text-destructive">Excluir</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir {selectedClients.length} cliente(s)? Esta ação é permanente.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete}>Confirmar</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                {activeTab === 'ativo' && (
                                    <Button variant="link" className="p-0 h-auto text-sm text-black" onClick={() => handleToggleStatus(selectedClients, 'inativo')}>Inativar</Button>
                                )}
                                {activeTab === 'inativo' && (
                                    <Button variant="link" className="p-0 h-auto text-sm text-black" onClick={() => handleToggleStatus(selectedClients, 'ativo')}>Reativar</Button>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-[#d1d1d1]">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-12"><Checkbox className="border-black data-[state=checked]:bg-black data-[state=checked]:text-white" disabled={!canManageClients} checked={isAllSelected} onCheckedChange={handleSelectAll} /></TableHead>
                                    <TableHead className="cursor-pointer group text-black" onClick={() => requestSort('nome')}>Nome/Razão Social {getSortIcon('nome')}</TableHead>
                                    <TableHead className="cursor-pointer group text-black" onClick={() => requestSort('documento')}>CPF/CNPJ {getSortIcon('documento')}</TableHead>
                                    <TableHead className="cursor-pointer group text-black" onClick={() => requestSort('email')}>E-mail {getSortIcon('email')}</TableHead>
                                    <TableHead className="cursor-pointer group text-black" onClick={() => requestSort('telefone')}>Telefone {getSortIcon('telefone')}</TableHead>
                                    <TableHead className="cursor-pointer group text-black" onClick={() => requestSort('status')}>Situação {getSortIcon('status')}</TableHead>
                                    {canManageClients && <TableHead className="text-right text-black">Ações</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={canManageClients ? 7 : 6}><Skeleton className="h-6 w-full" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : paginatedClients.length > 0 ? (
                                    paginatedClients.map(client => (
                                        <TableRow key={client.id}>
                                            <TableCell><Checkbox className="border-black data-[state=checked]:bg-black data-[state=checked]:text-white" disabled={!canManageClients} checked={selectedClients.includes(client.id)} onCheckedChange={(checked) => handleSelectClient(client.id, !!checked)} /></TableCell>
                                            <TableCell className="font-medium text-black">{client.tipoPessoa === 'juridica' ? client.razaoSocial : client.nomeCompleto}</TableCell>
                                            <TableCell className="text-black">{client.tipoPessoa === 'juridica' ? client.cnpj : client.cpf}</TableCell>
                                            <TableCell className="text-black">{client.email}</TableCell>
                                            <TableCell className="text-black">{client.telefone}</TableCell>
                                            <TableCell>
                                                <Badge variant={client.status === 'ativo' ? 'default' : 'secondary'} className={cn(client.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')}>{client.status}</Badge>
                                            </TableCell>
                                            {canManageClients && (
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="link" className="text-black p-0 h-auto">Ações <ChevronDown className="ml-1 h-4 w-4"/></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleOpenEditModal(client)}>
                                                            <Edit className="mr-2 h-4 w-4" /> Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        {client.status === 'ativo' ? (
                                                            <DropdownMenuItem onClick={() => handleToggleStatus([client.id], 'inativo')}>
                                                                <UserX className="mr-2 h-4 w-4" /> Inativar
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem onClick={() => handleToggleStatus([client.id], 'ativo')}>
                                                                <UserCheck className="mr-2 h-4 w-4" /> Reativar
                                                            </DropdownMenuItem>
                                                        )}
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive">
                                                                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                                                </DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Tem certeza que deseja excluir o cliente "{client.tipoPessoa === 'juridica' ? client.razaoSocial : client.nomeCompleto}"? Esta ação é permanente.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDeleteClient(client.id)}>Confirmar</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                            )}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={canManageClients ? 7 : 6} className="text-center h-24 text-black">Nenhum cliente encontrado.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <CardContent className="border-t p-4">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-black">
                            <div className="flex items-center gap-2">
                            <Select
                                    value={String(itemsPerPage)}
                                    onValueChange={(value) => {
                                        setItemsPerPage(Number(value));
                                        setCurrentPage(1);
                                    }}
                                >
                                    <SelectTrigger className="w-[80px] bg-white text-black">
                                        <SelectValue placeholder={itemsPerPage} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ITEMS_PER_PAGE_OPTIONS.map(option => (
                                            <SelectItem key={option} value={String(option)}>{option}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span>Registros por página</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span>Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, filteredAndSortedClients.length)} - {Math.min(currentPage * itemsPerPage, filteredAndSortedClients.length)} de {filteredAndSortedClients.length} registros</span>
                                <div className="flex items-center gap-1">
                                    <Button variant="outline" size="sm" className="bg-white" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                                    <Button variant="outline" size="sm" className="bg-white" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>Anterior</Button>
                                    <Button variant="outline" size="sm" className="bg-white" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Próximo</Button>
                                    <Button variant="outline" size="sm" className="bg-white" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span>Ir para página</span>
                                <Input 
                                    type="number" 
                                    className="w-20 bg-white" 
                                    value={goToPageInput}
                                    onChange={(e) => setGoToPageInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleGoToPage()}
                                />
                                <Button variant="outline" className="bg-white" onClick={handleGoToPage}>Ok</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
             <Dialog open={isCreateModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent onOpenChange={setCreateModalOpen} onEscapeKeyDown={(e) => e.preventDefault()} className="p-0 border-0 max-w-full h-full">
                    <NewClientForm open={isCreateModalOpen} setOpen={setCreateModalOpen} onSaveSuccess={fetchClients} isClosing={isClosing} handleClose={handleCloseCreateModal} />
                </DialogContent>
            </Dialog>

            {editingClient && (
                 <Dialog open={!!editingClient} onOpenChange={(open) => !open && handleCloseEditModal()}>
                    <DialogContent onEscapeKeyDown={(e) => e.preventDefault()} className="p-0 border-0 max-w-full h-full">
                       <EditClientForm 
                           client={editingClient}
                           setOpen={(open) => !open && handleCloseEditModal()} 
                           onSaveSuccess={() => {
                               fetchClients();
                               handleCloseEditModal();
                           }}
                       />
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}

    