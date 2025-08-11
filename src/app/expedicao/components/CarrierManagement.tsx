'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Search, PlusCircle, ChevronDown, ArrowUp, ArrowDown, Trash2, Edit, MoreHorizontal, Printer, Upload, Download, UserX, UserCheck, ChevronLeft, ChevronRight, Eye } from "lucide-react";
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
import { NewCarrierForm, type NewCarrierFormHandle } from './NewCarrierForm';
import { ViewCarrierForm } from './ViewCarrierForm';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export type Transportadora = {
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
    key: keyof Transportadora | 'nome';
    direction: 'ascending' | 'descending';
};

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 30, 50, 100];

export function CarrierManagement() {
    const { user } = useAuth();
    const router = useRouter();
    const { setIsLoading } = useLoading();
    const { toast } = useToast();
    
    const [transportadoras, setTransportadoras] = useState<Transportadora[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'ativo' | 'inativo' | 'todos'>('ativo');
    const [selectedCarriers, setSelectedCarriers] = useState<string[]>([]);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'nome', direction: 'ascending' });
    const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_OPTIONS[0]);
    const [currentPage, setCurrentPage] = useState(1);
    const [goToPageInput, setGoToPageInput] = useState('');
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [viewingCarrier, setViewingCarrier] = useState<Transportadora | null>(null);

    const [isClosing, setIsClosing] = useState(false);
    const newCarrierFormRef = useRef<NewCarrierFormHandle>(null);

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
    
    const handleOpenViewModal = (carrier: Transportadora) => {
        setViewingCarrier(carrier);
    };

    const handleCloseViewModal = () => {
        setViewingCarrier(null);
    };

    const canManage = user?.role === 'admin' || user?.role === 'gestor' || user?.role === 'escritorio';

    const fetchCarriers = async () => {
        setLoading(true);
        try {
            const carriersSnapshot = await getDocs(collection(db, 'transportadoras'));
            const carriersList = carriersSnapshot.docs.map(doc => {
                const data = doc.data();
                return { 
                    id: doc.id, 
                    status: data.status || 'ativo',
                    tipoPessoa: data.tipoPessoa || 'juridica',
                    ...data 
                } as Transportadora;
            });
            setTransportadoras(carriersList);
        } catch (error) {
            console.error("Erro ao buscar transportadoras:", error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar as transportadoras.' });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchCarriers();
    }, [toast]);
    
    const handleDelete = async (carrierId: string) => {
        try {
            await deleteDoc(doc(db, 'transportadoras', carrierId));
            setTransportadoras(prev => prev.filter(c => c.id !== carrierId));
            setSelectedCarriers(prev => prev.filter(id => id !== carrierId));
            toast({ title: 'Transportadora Excluída', description: 'A transportadora foi removida com sucesso.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao Excluir', description: 'Não foi possível remover a transportadora.' });
        }
    };
    
    const handleToggleStatus = async (carrierIds: string[], newStatus: 'ativo' | 'inativo') => {
        const batch = writeBatch(db);
        carrierIds.forEach(id => {
            const carrierRef = doc(db, 'transportadoras', id);
            batch.update(carrierRef, { status: newStatus });
        });

        try {
            await batch.commit();
            setTransportadoras(prev => prev.map(c => carrierIds.includes(c.id) ? { ...c, status: newStatus } : c));
            setSelectedCarriers([]);
            toast({ title: 'Status Atualizado', description: `Transportadora(s) foram marcadas como ${newStatus === 'ativo' ? 'ativas' : 'inativas'}.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao Atualizar', description: 'Não foi possível alterar o status da(s) transportadora(s).' });
        }
    };

    const handleBulkDelete = async () => {
        const batch = writeBatch(db);
        selectedCarriers.forEach(id => {
            batch.delete(doc(db, 'transportadoras', id));
        });

        try {
            await batch.commit();
            setTransportadoras(prev => prev.filter(c => !selectedCarriers.includes(c.id)));
            setSelectedCarriers([]);
            toast({ title: 'Transportadoras Excluídas', description: `${selectedCarriers.length} transportadoras foram removidas com sucesso.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao Excluir', description: 'Não foi possível remover as transportadoras selecionadas.' });
        }
    };

    const filteredAndSortedCarriers = useMemo(() => {
        let filtered = transportadoras;

        if (activeTab !== 'todos') {
            filtered = filtered.filter(c => c.status === activeTab);
        }

        if (searchTerm) {
            const lowerCaseTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(c => {
                const nome = c.tipoPessoa === 'juridica' ? c.razaoSocial : c.nomeCompleto;
                const documento = c.tipoPessoa === 'juridica' ? c.cnpj : c.cpf;
                return (nome && nome.toLowerCase().includes(lowerCaseTerm)) ||
                       (documento && documento.includes(lowerCaseTerm));
            });
        }
        
        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                const aValue = sortConfig.key === 'nome' 
                    ? (a.tipoPessoa === 'juridica' ? a.razaoSocial : a.nomeCompleto) 
                    : a[sortConfig.key as keyof Transportadora];
                const bValue = sortConfig.key === 'nome'
                    ? (b.tipoPessoa === 'juridica' ? b.razaoSocial : b.nomeCompleto)
                    : b[sortConfig.key as keyof Transportadora];
                
                if (aValue === undefined || aValue === null) return 1;
                if (bValue === undefined || bValue === null) return -1;
                
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        
        return filtered;
    }, [transportadoras, activeTab, searchTerm, sortConfig]);

    const requestSort = (key: keyof Transportadora | 'nome') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof Transportadora | 'nome') => {
        if (!sortConfig || sortConfig.key !== key) {
            return <ArrowUp className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground" />;
        }
        return sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
    };
    
    const counts = useMemo(() => {
        return {
            ativo: transportadoras.filter(c => c.status === 'ativo').length,
            inativo: transportadoras.filter(c => c.status === 'inativo').length,
            todos: transportadoras.length,
        }
    }, [transportadoras]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedCarriers(filteredAndSortedCarriers.map(c => c.id));
        } else {
            setSelectedCarriers([]);
        }
    };
    
    const handleSelect = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedCarriers(prev => [...prev, id]);
        } else {
            setSelectedCarriers(prev => prev.filter(carrierId => carrierId !== id));
        }
    };

    const isAllSelected = selectedCarriers.length > 0 && selectedCarriers.length === filteredAndSortedCarriers.length;
    
    const totalPages = Math.ceil(filteredAndSortedCarriers.length / itemsPerPage);
    const paginatedCarriers = filteredAndSortedCarriers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const generatePDF = (title: string, action: 'save' | 'print') => {
        const doc = new jsPDF();
        const tableData = filteredAndSortedCarriers.map(c => [
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

        if (action === 'print') {
            doc.output('dataurlnewwindow');
        } else {
            doc.save('relatorio_transportadoras.pdf');
        }
    };

    const handlePrint = () => {
        generatePDF('Relatório de Transportadoras', 'print');
    };

    const handleExportPDF = () => {
        generatePDF('Relatório de Transportadoras', 'save');
    };

    const handleExportExcel = () => {
        const dataToExport = filteredAndSortedCarriers.map(c => ({
            "Nome/Razão Social": c.tipoPessoa === 'juridica' ? c.razaoSocial : c.nomeCompleto,
            "CPF/CNPJ": c.tipoPessoa === 'juridica' ? c.cnpj : c.cpf,
            "Email": c.email,
            "Telefone": c.telefone,
            "Status": c.status,
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Transportadoras');
        XLSX.writeFile(workbook, 'relatorio_transportadoras.xlsx');
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
                        Nova Transportadora
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
                            <DropdownMenuItem onClick={showDevelopmentToast}><Upload className="mr-2 h-4 w-4" />Importar</DropdownMenuItem>
                            <DropdownMenuItem onClick={showDevelopmentToast}><Download className="mr-2 h-4 w-4" />Baixar Modelo</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <Card className="bg-[#d1d1d1]">
                    <CardContent className="p-4 space-y-4">
                        <div className="relative flex-grow">
                            <Input 
                                placeholder="Pesquisar por nome, razão social, CPF ou CNPJ"
                                className="pl-4 pr-10 bg-white border-gray-300 text-black"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        </div>

                        <div className="grid grid-cols-3 text-center border-b">
                            <button onClick={() => setActiveTab('ativo')} className={cn("py-3 relative text-black", activeTab === 'ativo' && "font-semibold")}>
                                Ativo <Badge className="ml-2 bg-gray-200 text-black">{counts.ativo}</Badge>
                                {activeTab === 'ativo' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
                            </button>
                            <button onClick={() => setActiveTab('inativo')} className={cn("py-3 relative text-black", activeTab === 'inativo' && "font-semibold")}>
                                Inativo <Badge className="ml-2 bg-gray-200 text-black">{counts.inativo}</Badge>
                                {activeTab === 'inativo' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
                            </button>
                            <button onClick={() => setActiveTab('todos')} className={cn("py-3 relative text-black", activeTab === 'todos' && "font-semibold")}>
                                Todos <Badge className="ml-2 bg-gray-200 text-black">{counts.todos}</Badge>
                                {activeTab === 'todos' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
                            </button>
                        </div>

                        {canManage && selectedCarriers.length > 1 && (
                            <div className="bg-blue-50 p-3 rounded-md flex items-center gap-4">
                                <span className="text-sm text-black">{selectedCarriers.length} registro(s) selecionado(s)</span>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="link" className="p-0 h-auto text-sm text-destructive">Excluir</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir {selectedCarriers.length} transportadora(s)? Esta ação é permanente.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete}>Confirmar</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                {activeTab === 'ativo' && (
                                    <Button variant="link" className="p-0 h-auto text-sm text-black" onClick={() => handleToggleStatus(selectedCarriers, 'inativo')}>Inativar</Button>
                                )}
                                {activeTab === 'inativo' && (
                                    <Button variant="link" className="p-0 h-auto text-sm text-black" onClick={() => handleToggleStatus(selectedCarriers, 'ativo')}>Reativar</Button>
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
                                    <TableHead className="w-12"><Checkbox className="border-black data-[state=checked]:bg-black data-[state=checked]:text-white" disabled={!canManage} checked={isAllSelected} onCheckedChange={handleSelectAll} /></TableHead>
                                    <TableHead className="cursor-pointer group text-black" onClick={() => requestSort('nome')}>Nome/Razão Social {getSortIcon('nome')}</TableHead>
                                    <TableHead className="cursor-pointer group text-black" onClick={() => requestSort('cnpj')}>CPF/CNPJ {getSortIcon('cnpj')}</TableHead>
                                    <TableHead className="cursor-pointer group text-black" onClick={() => requestSort('email')}>E-mail {getSortIcon('email')}</TableHead>
                                    <TableHead className="cursor-pointer group text-black" onClick={() => requestSort('telefone')}>Telefone {getSortIcon('telefone')}</TableHead>
                                    <TableHead className="cursor-pointer group text-black" onClick={() => requestSort('status')}>Situação {getSortIcon('status')}</TableHead>
                                    {canManage && <TableHead className="text-right text-black"></TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={canManage ? 7 : 6}><Skeleton className="h-6 w-full" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : paginatedCarriers.length > 0 ? (
                                    paginatedCarriers.map(carrier => (
                                        <TableRow key={carrier.id}>
                                            <TableCell><Checkbox className="border-black data-[state=checked]:bg-black data-[state=checked]:text-white" disabled={!canManage} checked={selectedCarriers.includes(carrier.id)} onCheckedChange={(checked) => handleSelect(carrier.id, !!checked)} /></TableCell>
                                            <TableCell className="font-medium text-black">{carrier.tipoPessoa === 'juridica' ? carrier.razaoSocial : carrier.nomeCompleto}</TableCell>
                                            <TableCell className="text-black">{carrier.tipoPessoa === 'juridica' ? carrier.cnpj : carrier.cpf}</TableCell>
                                            <TableCell className="text-black">{carrier.email}</TableCell>
                                            <TableCell className="text-black">{carrier.telefone}</TableCell>
                                            <TableCell>
                                                <Badge variant={carrier.status === 'ativo' ? 'default' : 'secondary'} className={cn(carrier.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')}>{carrier.status}</Badge>
                                            </TableCell>
                                            {canManage && (
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="link" className="text-black p-0 h-auto">Ações <ChevronDown className="ml-1 h-4 w-4"/></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleOpenViewModal(carrier)}>
                                                            <Eye className="mr-2 h-4 w-4" /> Visualizar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        {carrier.status === 'ativo' ? (
                                                            <DropdownMenuItem onClick={() => handleToggleStatus([carrier.id], 'inativo')}>
                                                                <UserX className="mr-2 h-4 w-4" /> Inativar
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem onClick={() => handleToggleStatus([carrier.id], 'ativo')}>
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
                                                                        Tem certeza que deseja excluir a transportadora "{carrier.tipoPessoa === 'juridica' ? carrier.razaoSocial : carrier.nomeCompleto}"? Esta ação é permanente.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDelete(carrier.id)}>Confirmar</AlertDialogAction>
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
                                        <TableCell colSpan={canManage ? 7 : 6} className="text-center h-24 text-black">Nenhuma transportadora encontrada.</TableCell>
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
                                <span>Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, filteredAndSortedCarriers.length)} - {Math.min(currentPage * itemsPerPage, filteredAndSortedCarriers.length)} de {filteredAndSortedCarriers.length} registros</span>
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
                <DialogContent 
                    onEscapeKeyDown={(e) => {
                        e.preventDefault();
                        newCarrierFormRef.current?.handleAttemptClose();
                    }} 
                    className="p-0 border-0 inset-0"
                >
                    <NewCarrierForm ref={newCarrierFormRef} open={isCreateModalOpen} setOpen={setCreateModalOpen} onSaveSuccess={fetchCarriers} isClosing={isClosing} handleClose={handleCloseCreateModal}/>
                </DialogContent>
            </Dialog>

            {viewingCarrier && (
                <Dialog open={!!viewingCarrier} onOpenChange={(open) => !open && handleCloseViewModal()}>
                    <DialogContent onEscapeKeyDown={(e) => e.preventDefault()} className="p-0 border-0 inset-0">
                        <ViewCarrierForm 
                            carrier={viewingCarrier} 
                            setOpen={(open) => !open && handleCloseViewModal()} 
                            onSaveSuccess={() => {
                                fetchCarriers();
                            }}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
