'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Search, PlusCircle, ChevronDown, Printer, Upload, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
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
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { NewEntryForm, type NewEntryFormHandle } from './NewEntryForm';


type Entrada = {
    id: string;
    nomeCliente: string;
    nomeObra: string;
    dataEntrada: string;
    pesoTotal: number;
    notaFiscal: string;
};

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 30, 50, 100];


export function EntryManagement() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [entradas, setEntradas] = useState<Entrada[]>([]); 
    const [currentDate, setCurrentDate] = useState(new Date());
    const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_OPTIONS[0]);
    const [currentPage, setCurrentPage] = useState(1);
    const [goToPageInput, setGoToPageInput] = useState('');
    
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const newEntryFormRef = useRef<NewEntryFormHandle>(null);

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

    const canManage = user?.role === 'admin' || user?.role === 'gestor' || user?.role === 'escritorio';

    const fetchEntries = async () => {
        if (!canManage) return;
        setLoading(true);
        try {
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);

            const q = query(
                collection(db, "entradas_expedicao"), 
                where("dataEntrada", ">=", Timestamp.fromDate(startOfMonth)),
                where("dataEntrada", "<=", Timestamp.fromDate(endOfMonth))
            );
            
            const querySnapshot = await getDocs(q);
            const entriesList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Entrada));
            setEntradas(entriesList);

        } catch (error) {
            console.error("Erro ao buscar entradas: ", error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar as entradas.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEntries();
    }, [currentDate, canManage, toast]);

    const showDevelopmentToast = () => {
        toast({
            title: 'Em desenvolvimento',
            description: 'Esta funcionalidade está sendo preparada e estará disponível em breve.',
        });
    };

    const filteredEntries = useMemo(() => {
        if (!searchTerm) return entradas;
        const lowerCaseTerm = searchTerm.toLowerCase();
        return entradas.filter(e => 
            e.nomeCliente.toLowerCase().includes(lowerCaseTerm) ||
            e.nomeObra.toLowerCase().includes(lowerCaseTerm) ||
            e.notaFiscal.toLowerCase().includes(lowerCaseTerm)
        );
    }, [entradas, searchTerm]);

    const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
    const paginatedEntries = filteredEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);


    const generatePDF = (action: 'save' | 'print') => {
        const doc = new jsPDF();
        const tableData = filteredEntries.map(e => [
            e.nomeCliente,
            e.nomeObra,
            e.dataEntrada,
            `${e.pesoTotal} Kg`,
            e.notaFiscal,
        ]);

        autoTable(doc, {
            head: [['Nome do Cliente', 'Nome da Obra', 'Data da Entrada', 'Peso Total (Kg)', 'Nota Fiscal']],
            body: tableData,
            didDrawPage: (data) => {
                doc.setFontSize(16);
                doc.setTextColor(40);
                doc.text("Gestão de Obras", data.settings.margin.left, 15);
                doc.setFontSize(12);
                doc.text("Relatório de Entradas no Estoque", data.settings.margin.left, 22);
            },
            margin: { top: 30 },
        });

        if (action === 'print') {
            doc.output('dataurlnewwindow');
        } else {
            doc.save('relatorio_entradas.pdf');
        }
    };

    const handleExportExcel = () => {
        const dataToExport = filteredEntries.map(e => ({
            "Nome do Cliente": e.nomeCliente,
            "Nome da Obra": e.nomeObra,
            "Data da Entrada": e.dataEntrada,
            "Peso Total (Kg)": e.pesoTotal,
            "Nota Fiscal": e.notaFiscal,
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Entradas');
        XLSX.writeFile(workbook, 'relatorio_entradas.xlsx');
    };

    const changeMonth = (amount: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + amount);
            return newDate;
        });
        setCurrentPage(1);
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
                <div className="flex items-center gap-2 flex-wrap">
                    <Button 
                        onClick={handleOpenCreateModal}
                        className="transition-transform duration-200 hover:scale-105"
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Registrar Entrada
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="text-black bg-white">Exportar <ChevronDown className="ml-2 h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => generatePDF('save')}>Exportar para PDF</DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportExcel}>Exportar para Excel</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" className="text-black bg-white" onClick={() => generatePDF('print')}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="text-black bg-white">Mais ações <ChevronDown className="ml-2 h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={showDevelopmentToast}><Upload className="mr-2 h-4 w-4" />Importar</DropdownMenuItem>
                            <DropdownMenuItem onClick={showDevelopmentToast}><Download className="mr-2 h-4 w-4" />Baixar Modelo</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="flex items-center rounded-md bg-white border">
                        <Button variant="ghost" size="icon" onClick={() => changeMonth(-1)} className="h-9 w-9 text-black hover:bg-accent hover:text-accent-foreground">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <span className="w-32 text-center text-sm font-semibold capitalize text-black">
                            {format(currentDate, 'MMMM - yyyy', { locale: ptBR })}
                        </span>
                         <Button variant="ghost" size="icon" onClick={() => changeMonth(1)} className="h-9 w-9 text-black hover:bg-accent hover:text-accent-foreground">
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                <Card className="bg-white">
                    <CardContent className="p-4 space-y-4 rounded-t-lg">
                        <div className="relative flex-grow">
                            <Input 
                                placeholder="Pesquisar por cliente, obra ou nota fiscal..."
                                className="pl-4 pr-10 bg-white border-gray-300 text-black"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="text-black">Nome do Cliente</TableHead>
                                    <TableHead className="text-black">Nome da Obra</TableHead>
                                    <TableHead className="text-black">Data da Entrada</TableHead>
                                    <TableHead className="text-black">Peso Total (Kg)</TableHead>
                                    <TableHead className="text-black">Nota Fiscal</TableHead>
                                    {canManage && <TableHead className="text-right"></TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={canManage ? 6 : 5}><Skeleton className="h-6 w-full" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : paginatedEntries.length > 0 ? (
                                    paginatedEntries.map(entry => (
                                        <TableRow key={entry.id}>
                                          {/* Data cells will be populated here in the future */}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={canManage ? 6 : 5} className="text-center h-24 text-black">Nenhum registro de entrada encontrado para este mês.</TableCell>
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
                                    <span>Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, filteredEntries.length)} - {Math.min(currentPage * itemsPerPage, filteredEntries.length)} de {filteredEntries.length} registros</span>
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
                        newEntryFormRef.current?.handleAttemptClose();
                    }}
                    className="p-0 border-0 inset-0"
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <NewEntryForm 
                        ref={newEntryFormRef} 
                        open={isCreateModalOpen}
                        setOpen={setCreateModalOpen} 
                        onSaveSuccess={fetchEntries} 
                        isClosing={isClosing}
                        handleClose={handleCloseCreateModal}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}
