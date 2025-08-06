
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
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { NewProductForm } from './NewProductForm';
import { EditProductForm } from './EditProductForm';


export type Produto = {
    id: string;
    nome: string;
    sku: string;
    valor: number;
    status: 'ativo' | 'inativo';
};

type SortConfig = {
    key: keyof Produto;
    direction: 'ascending' | 'descending';
};

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 30, 50, 100];

export function ProductManagement() {
    const { user } = useAuth();
    const router = useRouter();
    const { setIsLoading } = useLoading();
    const { toast } = useToast();
    
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'ativo' | 'inativo' | 'todos'>('ativo');
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'nome', direction: 'ascending' });
    const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_OPTIONS[0]);
    const [currentPage, setCurrentPage] = useState(1);
    const [goToPageInput, setGoToPageInput] = useState('');
    
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Produto | null>(null);
    const [isClosing, setIsClosing] = useState(false);
    
    const canManage = user?.role === 'admin' || user?.role === 'gestor';

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
    
    const handleOpenEditModal = (product: Produto) => {
        setEditingProduct(product);
    };

    const handleCloseEditModal = () => {
        setEditingProduct(null);
    };

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const productsSnapshot = await getDocs(collection(db, 'produtos'));
            const productsList = productsSnapshot.docs.map(doc => {
                const data = doc.data();
                return { 
                    id: doc.id, 
                    status: data.status || 'ativo',
                    ...data 
                } as Produto;
            });
            setProdutos(productsList);
        } catch (error) {
            console.error("Erro ao buscar produtos:", error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os produtos.' });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchProducts();
    }, [toast]);
    
    const handleDelete = async (productId: string) => {
        try {
            await deleteDoc(doc(db, 'produtos', productId));
            setProdutos(prev => prev.filter(p => p.id !== productId));
            setSelectedProducts(prev => prev.filter(id => id !== productId));
            toast({ title: 'Produto Excluído', description: 'O produto foi removido com sucesso.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao Excluir', description: 'Não foi possível remover o produto.' });
        }
    };
    
    const handleToggleStatus = async (productIds: string[], newStatus: 'ativo' | 'inativo') => {
        const batch = writeBatch(db);
        productIds.forEach(id => {
            const productRef = doc(db, 'produtos', id);
            batch.update(productRef, { status: newStatus });
        });

        try {
            await batch.commit();
            setProdutos(prev => prev.map(p => productIds.includes(p.id) ? { ...p, status: newStatus } : p));
            setSelectedProducts([]);
            toast({ title: 'Status Atualizado', description: `Produto(s) foram marcados como ${newStatus === 'ativo' ? 'ativos' : 'inativos'}.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao Atualizar', description: 'Não foi possível alterar o status do(s) produto(s).' });
        }
    };

    const handleBulkDelete = async () => {
        const batch = writeBatch(db);
        selectedProducts.forEach(id => {
            batch.delete(doc(db, 'produtos', id));
        });

        try {
            await batch.commit();
            setProdutos(prev => prev.filter(p => !selectedProducts.includes(p.id)));
            setSelectedProducts([]);
            toast({ title: 'Produtos Excluídos', description: `${selectedProducts.length} produtos foram removidos com sucesso.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao Excluir', description: 'Não foi possível remover os produtos selecionados.' });
        }
    };

    const filteredAndSortedProducts = useMemo(() => {
        let filtered = produtos;

        if (activeTab !== 'todos') {
            filtered = filtered.filter(p => p.status === activeTab);
        }

        if (searchTerm) {
            const lowerCaseTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(p => 
                p.nome.toLowerCase().includes(lowerCaseTerm) ||
                p.sku.toLowerCase().includes(lowerCaseTerm)
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
    }, [produtos, activeTab, searchTerm, sortConfig]);

    const requestSort = (key: keyof Produto) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof Produto) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <ArrowUp className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground" />;
        }
        return sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
    };
    
    const counts = useMemo(() => {
        return {
            ativo: produtos.filter(p => p.status === 'ativo').length,
            inativo: produtos.filter(p => p.status === 'inativo').length,
            todos: produtos.length,
        }
    }, [produtos]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedProducts(filteredAndSortedProducts.map(p => p.id));
        } else {
            setSelectedProducts([]);
        }
    };
    
    const handleSelect = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedProducts(prev => [...prev, id]);
        } else {
            setSelectedProducts(prev => prev.filter(productId => productId !== id));
        }
    };

    const isAllSelected = selectedProducts.length > 0 && selectedProducts.length === filteredAndSortedProducts.length;

    const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage);
    const paginatedProducts = filteredAndSortedProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const generatePDF = (title: string, action: 'save' | 'print') => {
        const doc = new jsPDF();
        const tableData = filteredAndSortedProducts.map(p => [
            p.nome || '',
            p.sku || '',
            formatCurrency(p.valor),
            p.status || '',
        ]);

        autoTable(doc, {
            head: [['Produto', 'SKU', 'Valor', 'Situação']],
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
            doc.save('relatorio_produtos.pdf');
        }
    };

    const handlePrint = () => {
        generatePDF('Relatório de Produtos', 'print');
    };

    const handleExportPDF = () => {
        generatePDF('Relatório de Produtos', 'save');
    };

    const handleExportExcel = () => {
        const dataToExport = filteredAndSortedProducts.map(p => ({
            "Produto": p.nome,
            "SKU": p.sku,
            "Valor": p.valor,
            "Status": p.status,
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos');
        XLSX.writeFile(workbook, 'relatorio_produtos.xlsx');
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
                        Novo Produto
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
                                placeholder="Pesquisar por produto ou SKU"
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

                        {canManage && selectedProducts.length > 1 && (
                            <div className="bg-blue-50 p-3 rounded-md flex items-center gap-4">
                                <span className="text-sm text-black">{selectedProducts.length} registro(s) selecionado(s)</span>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="link" className="p-0 h-auto text-sm text-destructive">Excluir</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir {selectedProducts.length} produto(s)? Esta ação é permanente.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete}>Confirmar</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                {activeTab === 'ativo' && (
                                    <Button variant="link" className="p-0 h-auto text-sm text-black" onClick={() => handleToggleStatus(selectedProducts, 'inativo')}>Inativar</Button>
                                )}
                                {activeTab === 'inativo' && (
                                    <Button variant="link" className="p-0 h-auto text-sm text-black" onClick={() => handleToggleStatus(selectedProducts, 'ativo')}>Reativar</Button>
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
                                    <TableHead className="cursor-pointer group text-black" onClick={() => requestSort('nome')}>Produto {getSortIcon('nome')}</TableHead>
                                    <TableHead className="cursor-pointer group text-black" onClick={() => requestSort('sku')}>SKU {getSortIcon('sku')}</TableHead>
                                    <TableHead className="cursor-pointer group text-black" onClick={() => requestSort('valor')}>Valor {getSortIcon('valor')}</TableHead>
                                    <TableHead className="cursor-pointer group text-black" onClick={() => requestSort('status')}>Situação {getSortIcon('status')}</TableHead>
                                    {canManage && <TableHead className="text-right text-black">Ações</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={canManage ? 6 : 5}><Skeleton className="h-6 w-full" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : paginatedProducts.length > 0 ? (
                                    paginatedProducts.map(product => (
                                        <TableRow key={product.id}>
                                            <TableCell><Checkbox className="border-black data-[state=checked]:bg-black data-[state=checked]:text-white" disabled={!canManage} checked={selectedProducts.includes(product.id)} onCheckedChange={(checked) => handleSelect(product.id, !!checked)} /></TableCell>
                                            <TableCell className="font-medium text-black">{product.nome}</TableCell>
                                            <TableCell className="text-black">{product.sku}</TableCell>
                                            <TableCell className="text-black">{formatCurrency(product.valor)}</TableCell>
                                            <TableCell>
                                                <Badge variant={product.status === 'ativo' ? 'default' : 'secondary'} className={cn(product.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')}>{product.status}</Badge>
                                            </TableCell>
                                            {canManage && (
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="link" className="text-black p-0 h-auto">Ações <ChevronDown className="ml-1 h-4 w-4"/></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleOpenEditModal(product)}>
                                                            <Edit className="mr-2 h-4 w-4" /> Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        {product.status === 'ativo' ? (
                                                            <DropdownMenuItem onClick={() => handleToggleStatus([product.id], 'inativo')}>
                                                                <UserX className="mr-2 h-4 w-4" /> Inativar
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem onClick={() => handleToggleStatus([product.id], 'ativo')}>
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
                                                                        Tem certeza que deseja excluir o produto "{product.nome}"? Esta ação é permanente.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDelete(product.id)}>Confirmar</AlertDialogAction>
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
                                        <TableCell colSpan={canManage ? 6 : 5} className="text-center h-24 text-black">Nenhum produto encontrado.</TableCell>
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
                                <span>Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, filteredAndSortedProducts.length)} - {Math.min(currentPage * itemsPerPage, filteredAndSortedProducts.length)} de {filteredAndSortedProducts.length} registros</span>
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
                    <NewProductForm open={isCreateModalOpen} setOpen={setCreateModalOpen} onSaveSuccess={fetchProducts} isClosing={isClosing} handleClose={handleCloseCreateModal} />
                </DialogContent>
            </Dialog>
            
            {editingProduct && (
                <Dialog open={!!editingProduct} onOpenChange={(open) => { if (!open) handleCloseEditModal(); }}>
                    <DialogContent onEscapeKeyDown={(e) => e.preventDefault()} className="p-0 border-0 max-w-full h-full">
                        <EditProductForm 
                            product={editingProduct}
                            setOpen={(open) => !open && handleCloseEditModal()} 
                            onSaveSuccess={() => {
                                fetchProducts();
                                handleCloseEditModal();
                            }}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
