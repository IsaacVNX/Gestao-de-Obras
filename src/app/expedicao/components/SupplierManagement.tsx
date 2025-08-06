
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
  DropdownMenuLabel,
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
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { NewSupplierForm } from './NewSupplierForm';
import { EditSupplierForm } from './EditSupplierForm';

export type Fornecedor = {
    id: string;
    razaoSocial: string;
    nomeFantasia: string;
    cnpj: string;
    telefone: string;
    email: string;
    status: 'ativo' | 'inativo';
};

type SortConfig = {
    key: keyof Fornecedor;
    direction: 'ascending' | 'descending';
};

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 30, 50, 100];

export function SupplierManagement() {
    const { user } = useAuth();
    const router = useRouter();
    const { setIsLoading } = useLoading();
    const { toast } = useToast();
    
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'ativo' | 'inativo' | 'todos'>('ativo');
    const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'razaoSocial', direction: 'ascending' });
    const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_OPTIONS[0]);
    const [currentPage, setCurrentPage] = useState(1);
    const [goToPageInput, setGoToPageInput] = useState('');
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Fornecedor | null>(null);
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
    
    const handleOpenEditModal = (supplier: Fornecedor) => {
        setEditingSupplier(supplier);
    };

    const handleCloseEditModal = () => {
        setEditingSupplier(null);
    };

    const canManage = user?.role === 'admin' || user?.role === 'gestor' || user?.role === 'escritorio';

    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const suppliersSnapshot = await getDocs(collection(db, 'fornecedores'));
            const suppliersList = suppliersSnapshot.docs.map(doc => {
                const data = doc.data();
                return { 
                    id: doc.id, 
                    status: data.status || 'ativo',
                    ...data 
                } as Fornecedor;
            });
            setFornecedores(suppliersList);
        } catch (error) {
            console.error("Erro ao buscar fornecedores:", error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os fornecedores.' });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchSuppliers();
    }, [toast]);
    
    const handleDelete = async (supplierId: string) => {
        try {
            await deleteDoc(doc(db, 'fornecedores', supplierId));
            setFornecedores(prev => prev.filter(s => s.id !== supplierId));
            setSelectedSuppliers(prev => prev.filter(id => id !== supplierId));
            toast({ title: 'Fornecedor Excluído', description: 'O fornecedor foi removido com sucesso.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao Excluir', description: 'Não foi possível remover o fornecedor.' });
        }
    };
    
    const handleToggleStatus = async (supplierIds: string[], newStatus: 'ativo' | 'inativo') => {
        const batch = writeBatch(db);
        supplierIds.forEach(id => {
            const supplierRef = doc(db, 'fornecedores', id);
            batch.update(supplierRef, { status: newStatus });
        });

        try {
            await batch.commit();
            setFornecedores(prev => prev.map(s => supplierIds.includes(s.id) ? { ...s, status: newStatus } : s));
            setSelectedSuppliers([]);
            toast({ title: 'Status Atualizado', description: `Fornecedor(es) foram marcados como ${newStatus === 'ativo' ? 'ativos' : 'inativos'}.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao Atualizar', description: 'Não foi possível alterar o status do(s) fornecedor(es).' });
        }
    };

    const handleBulkDelete = async () => {
        const batch = writeBatch(db);
        selectedSuppliers.forEach(id => {
            batch.delete(doc(db, 'fornecedores', id));
        });

        try {
            await batch.commit();
            setFornecedores(prev => prev.filter(s => !selectedSuppliers.includes(s.id)));
            setSelectedSuppliers([]);
            toast({ title: 'Fornecedores Excluídos', description: `${selectedSuppliers.length} fornecedores foram removidos com sucesso.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao Excluir', description: 'Não foi possível remover os fornecedores selecionados.' });
        }
    };

    const filteredAndSortedSuppliers = useMemo(() => {
        let filtered = fornecedores;

        if (activeTab !== 'todos') {
            filtered = filtered.filter(s => s.status === activeTab);
        }

        if (searchTerm) {
            const lowerCaseTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(s => 
                s.razaoSocial.toLowerCase().includes(lowerCaseTerm) ||
                s.nomeFantasia.toLowerCase().includes(lowerCaseTerm) ||
                s.cnpj.toLowerCase().includes(lowerCaseTerm)
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
    }, [fornecedores, activeTab, searchTerm, sortConfig]);

    const requestSort = (key: keyof Fornecedor) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof Fornecedor) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <ArrowUp className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground" />;
        }
        return sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
    };
    
    const counts = useMemo(() => {
        return {
            ativo: fornecedores.filter(s => s.status === 'ativo').length,
            inativo: fornecedores.filter(s => s.status === 'inativo').length,
            todos: fornecedores.length,
        }
    }, [fornecedores]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedSuppliers(filteredAndSortedSuppliers.map(s => s.id));
        } else {
            setSelectedSuppliers([]);
        }
    };
    
    const handleSelect = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedSuppliers(prev => [...prev, id]);
        } else {
            setSelectedSuppliers(prev => prev.filter(supplierId => supplierId !== id));
        }
    };

    const isAllSelected = selectedSuppliers.length > 0 && selectedSuppliers.length === filteredAndSortedSuppliers.length;

    const totalPages = Math.ceil(filteredAndSortedSuppliers.length / itemsPerPage);
    const paginatedSuppliers = filteredAndSortedSuppliers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const generatePDF = (title: string, action: 'save' | 'print') => {
        const doc = new jsPDF();
        const tableData = filteredAndSortedSuppliers.map(s => [
            s.razaoSocial || '',
            s.cnpj || '',
            s.email || '',
            s.telefone || '',
            s.status || '',
        ]);

        autoTable(doc, {
            head: [['Nome', 'CNPJ', 'E-mail', 'Telefone', 'Situação']],
            body: tableData,
            didDrawPage: (data) => {
                doc.setFontSize(16);
                doc.setTextColor(40);
                doc.text("Gestão de Obras", data.settings.margin.left, 15);
                doc.setFontSize(12);
                doc.text(title, data.settings.margin.left, 22);

                const pageCount = doc.internal.getNumberOfPages();
                doc.setFontSize(10);
                doc.setTextColor(150);
                const footerText = `Página ${data.pageNumber} de ${pageCount}`;
                const dateText = `Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`;
                
                doc.text(footerText, data.settings.margin.left, doc.internal.pageSize.getHeight() - 10);
                
                const dateTextWidth = doc.getStringUnitWidth(dateText) * doc.getFontSize() / doc.internal.scaleFactor;
                doc.text(dateText, doc.internal.pageSize.getWidth() - data.settings.margin.right - dateTextWidth, doc.internal.pageSize.getHeight() - 10);
            },
            margin: { top: 30 },
        });

        if (action === 'print') {
            doc.output('dataurlnewwindow');
        } else {
            doc.save('relatorio_fornecedores.pdf');
        }
    };

    const handlePrint = () => {
        generatePDF('Relatório de Fornecedores', 'print');
    };

    const handleExportPDF = () => {
        generatePDF('Relatório de Fornecedores', 'save');
    };

    const handleExportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredAndSortedSuppliers);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Fornecedores');
        XLSX.writeFile(workbook, 'relatorio_fornecedores.xlsx');
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
                        Novo Fornecedor
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
                                placeholder="Pesquisar por razão social, nome fantasia ou CNPJ"
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

                        {canManage && selectedSuppliers.length > 1 && (
                            <div className="bg-blue-50 p-3 rounded-md flex items-center gap-4">
                                <span className="text-sm text-black">{selectedSuppliers.length} registro(s) selecionado(s)</span>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="link" className="p-0 h-auto text-sm text-destructive">Excluir</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir {selectedSuppliers.length} fornecedor(es)? Esta ação é permanente.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete}>Confirmar</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                {activeTab === 'ativo' && (
                                    <Button variant="link" className="p-0 h-auto text-sm text-black" onClick={() => handleToggleStatus(selectedSuppliers, 'inativo')}>Inativar</Button>
                                )}
                                {activeTab === 'inativo' && (
                                    <Button variant="link" className="p-0 h-auto text-sm text-black" onClick={() => handleToggleStatus(selectedSuppliers, 'ativo')}>Reativar</Button>
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
                                    <TableHead className="cursor-pointer group text-black" onClick={() => requestSort('razaoSocial')}>Nome {getSortIcon('razaoSocial')}</TableHead>
                                    <TableHead className="cursor-pointer group text-black" onClick={() => requestSort('cnpj')}>CPF/CNPJ {getSortIcon('cnpj')}</TableHead>
                                    <TableHead className="cursor-pointer group text-black" onClick={() => requestSort('email')}>E-mail {getSortIcon('email')}</TableHead>
                                    <TableHead className="cursor-pointer group text-black" onClick={() => requestSort('telefone')}>Telefone {getSortIcon('telefone')}</TableHead>
                                    <TableHead className="cursor-pointer group text-black" onClick={() => requestSort('status')}>Situação {getSortIcon('status')}</TableHead>
                                    {canManage && <TableHead className="text-right text-black">Ações</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={canManage ? 7 : 6}><Skeleton className="h-6 w-full" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : paginatedSuppliers.length > 0 ? (
                                    paginatedSuppliers.map(supplier => (
                                        <TableRow key={supplier.id}>
                                            <TableCell><Checkbox className="border-black data-[state=checked]:bg-black data-[state=checked]:text-white" disabled={!canManage} checked={selectedSuppliers.includes(supplier.id)} onCheckedChange={(checked) => handleSelect(supplier.id, !!checked)} /></TableCell>
                                            <TableCell className="font-medium text-black">{supplier.razaoSocial}</TableCell>
                                            <TableCell className="text-black">{supplier.cnpj}</TableCell>
                                            <TableCell className="text-black">{supplier.email}</TableCell>
                                            <TableCell className="text-black">{supplier.telefone}</TableCell>
                                            <TableCell>
                                                <Badge variant={supplier.status === 'ativo' ? 'default' : 'secondary'} className={cn(supplier.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')}>{supplier.status}</Badge>
                                            </TableCell>
                                            {canManage && (
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="link" className="text-black p-0 h-auto">Ações <ChevronDown className="ml-1 h-4 w-4"/></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleOpenEditModal(supplier)}>
                                                            <Edit className="mr-2 h-4 w-4" /> Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        {supplier.status === 'ativo' ? (
                                                            <DropdownMenuItem onClick={() => handleToggleStatus([supplier.id], 'inativo')}>
                                                                <UserX className="mr-2 h-4 w-4" /> Inativar
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem onClick={() => handleToggleStatus([supplier.id], 'ativo')}>
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
                                                                        Tem certeza que deseja excluir o fornecedor "{supplier.razaoSocial}"? Esta ação é permanente.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDelete(supplier.id)}>Confirmar</AlertDialogAction>
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
                                        <TableCell colSpan={canManage ? 7 : 6} className="text-center h-24 text-black">Nenhum fornecedor encontrado.</TableCell>
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
                                <span>Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, filteredAndSortedSuppliers.length)} - {Math.min(currentPage * itemsPerPage, filteredAndSortedSuppliers.length)} de {filteredAndSortedSuppliers.length} registros</span>
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
                    <NewSupplierForm open={isCreateModalOpen} setOpen={setCreateModalOpen} onSaveSuccess={fetchSuppliers} isClosing={isClosing} handleClose={handleCloseCreateModal} />
                </DialogContent>
            </Dialog>

            {editingSupplier && (
                <Dialog open={!!editingSupplier} onOpenChange={(open) => !open && handleCloseEditModal()}>
                    <DialogContent onEscapeKeyDown={(e) => e.preventDefault()} className="p-0 border-0 max-w-full h-full">
                        <EditSupplierForm 
                            supplier={editingSupplier}
                            setOpen={(open) => !open && handleCloseEditModal()} 
                            onSaveSuccess={() => {
                                fetchSuppliers();
                                handleCloseEditModal();
                            }}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
