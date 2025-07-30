
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Search, PlusCircle, Building, ChevronLeft, ChevronRight, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { useLoading } from '@/hooks/use-loading';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Skeleton } from '@/components/ui/skeleton';

export type Cliente = {
    id: string;
    razaoSocial: string;
    nomeFantasia: string;
    cnpj: string;
    telefone: string;
    email: string;
};

const CLIENTS_PER_PAGE = 10;

export function ClientManagement() {
    const { user } = useAuth();
    const router = useRouter();
    const { setIsLoading } = useLoading();
    const { toast } = useToast();
    
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    
    const canManageClients = user?.role === 'admin' || user?.role === 'gestor';

    useEffect(() => {
        async function fetchClients() {
            setLoading(true);
            try {
                const clientsSnapshot = await getDocs(collection(db, 'clientes'));
                const clientsList = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cliente));
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

    const handleDeleteClient = async (clientId: string) => {
        try {
            await deleteDoc(doc(db, 'clientes', clientId));
            setClientes(prev => prev.filter(c => c.id !== clientId));
            toast({ title: 'Sucesso', description: 'Cliente excluído com sucesso.' });
        } catch (error) {
            console.error("Erro ao excluir cliente:", error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível excluir o cliente.' });
        }
    };
    
    const filteredClients = useMemo(() => {
        if (!searchTerm) return clientes;
        const lowerCaseTerm = searchTerm.toLowerCase();
        return clientes.filter(c => 
            c.razaoSocial.toLowerCase().includes(lowerCaseTerm) ||
            c.nomeFantasia.toLowerCase().includes(lowerCaseTerm) ||
            c.cnpj.toLowerCase().includes(lowerCaseTerm)
        );
    }, [clientes, searchTerm]);

    const paginatedClients = useMemo(() => {
        const startIndex = (currentPage - 1) * CLIENTS_PER_PAGE;
        return filteredClients.slice(startIndex, startIndex + CLIENTS_PER_PAGE);
    }, [filteredClients, currentPage]);

    const totalPages = Math.ceil(filteredClients.length / CLIENTS_PER_PAGE) || 1;

     const renderPagination = () => (
        <div className="flex items-center justify-end space-x-2 py-4 px-4">
            <span className="text-sm text-black">
                Página {currentPage} de {totalPages}
            </span>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="bg-white text-black hover:bg-white/80"
            >
                <ChevronLeft className="h-4 w-4" />
                Anterior
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="bg-white text-black hover:bg-white/80"
            >
                Próxima
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    );
    
    return (
        <>
            <div className="flex items-center justify-between mb-4">
                 <div className="relative w-full md:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black" />
                    <Input 
                        placeholder="Pesquisar por razão social, nome fantasia ou CNPJ..."
                        className="pl-10 bg-gray-200 border-black text-black"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                </div>
                {canManageClients && (
                    <Button 
                        onClick={() => { setIsLoading(true); router.push('/expedicao/cadastros/clientes/new')}}
                        className="transition-transform duration-200 hover:scale-105"
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Novo Cliente
                    </Button>
                )}
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Lista de Clientes</CardTitle>
                    <CardDescription className="text-card-foreground">Visualize e gerencie os clientes cadastrados.</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Mobile View */}
                    <div className="md:hidden space-y-4">
                        {loading ? (
                             [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
                        ) : paginatedClients.length > 0 ? (
                           paginatedClients.map(client => (
                                <Card key={client.id} className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold truncate">{client.nomeFantasia}</p>
                                            <p className="text-sm text-muted-foreground truncate">{client.razaoSocial}</p>
                                            <p className="text-sm text-muted-foreground">{client.cnpj}</p>
                                        </div>
                                         {canManageClients && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => router.push(`/expedicao/cadastros/clientes/edit/${client.id}`)}>
                                                        <Edit className="mr-2 h-4 w-4" /> Editar
                                                    </DropdownMenuItem>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteClient(client.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </Card>
                            ))
                        ) : (
                           <div className="text-center py-10 text-muted-foreground">Nenhum cliente encontrado.</div>
                        )}
                    </div>
                    {/* Desktop View */}
                    <div className="hidden md:block">
                        <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead className="text-card-foreground">Razão Social</TableHead>
                                    <TableHead className="text-card-foreground">Nome Fantasia</TableHead>
                                    <TableHead className="text-card-foreground">CNPJ</TableHead>
                                    <TableHead className="text-card-foreground">Telefone</TableHead>
                                    <TableHead className="text-card-foreground">Email</TableHead>
                                    {canManageClients && <TableHead className="text-right text-card-foreground">Ações</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                     <TableRow><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                                ) : paginatedClients.length > 0 ? (
                                    paginatedClients.map(client => (
                                        <TableRow key={client.id}>
                                            <TableCell className="font-medium">{client.razaoSocial}</TableCell>
                                            <TableCell>{client.nomeFantasia}</TableCell>
                                            <TableCell>{client.cnpj}</TableCell>
                                            <TableCell>{client.telefone}</TableCell>
                                            <TableCell>{client.email}</TableCell>
                                            {canManageClients && (
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => router.push(`/expedicao/cadastros/clientes/edit/${client.id}`)}>
                                                                <Edit className="mr-2 h-4 w-4" /> Editar
                                                            </DropdownMenuItem>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                                                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                                                    </DropdownMenuItem>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                                                                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteClient(client.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center">Nenhum cliente encontrado.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                     {renderPagination()}
                </CardContent>
            </Card>
        </>
    );
}

    