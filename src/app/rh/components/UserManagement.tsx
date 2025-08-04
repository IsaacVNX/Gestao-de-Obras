
'use client';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, UserX, UserCheck, Edit, Search, ChevronLeft, ChevronRight, User as UserIcon, Building, Phone, Calendar, PlusCircle, Printer, ChevronDown, Upload, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useUserManagement, type Usuario } from '@/hooks/use-user-management';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useLoading } from '@/hooks/use-loading';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';

const getRoleName = (role: string) => {
  switch (role) {
    case 'admin':
      return 'Administrador';
    case 'gestor':
      return 'Gestor';
    case 'escritorio':
      return 'Escritório';
    case 'encarregado':
      return 'Encarregado';
    case 'montador':
        return 'Montador';
    default:
      return 'Usuário';
  }
};

const getInitials = (name: string) => {
    if (!name) return '';
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 30, 50, 100];


export function UserManagement() {
  const { user } = useAuth();
  const router = useRouter();
  const { setIsLoading } = useLoading();
  const { toast } = useToast();
  
  const { 
    usuarios, 
    loading, 
    activeTab, 
    setActiveTab, 
    handleToggleStatus,
    updateUserRole
  } = useUserManagement();

  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [viewingUser, setViewingUser] = useState<Usuario | null>(null);
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_OPTIONS[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [goToPageInput, setGoToPageInput] = useState('');
  
  const isAdmin = user?.role === 'admin';
  const isGestor = user?.role === 'gestor';
  const canTakeAction = isAdmin || isGestor;
  const canCreateUser = isAdmin || isGestor;

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'ativo' | 'inativo' | 'todos');
    setCurrentPage(1); // Reset page on tab change
  };
  
  const filteredUsers = useMemo(() => {
    let usersToFilter = usuarios;
    if (activeTab !== 'todos') {
        usersToFilter = usersToFilter.filter(u => u.status === activeTab);
    }
    if (!searchTerm) return usersToFilter;

    return usersToFilter.filter(u => {
        const lowerCaseTerm = searchTerm.toLowerCase();
        const searchByName = u.nome.toLowerCase().includes(lowerCaseTerm);
        const searchByEmail = isAdmin && u.email.toLowerCase().includes(lowerCaseTerm);
        const searchByRole = getRoleName(u.role).toLowerCase().includes(lowerCaseTerm);
        
        return searchByName || searchByEmail || searchByRole;
    });
  }, [searchTerm, usuarios, isAdmin, activeTab]);
  
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const userCounts = useMemo(() => {
    const ativos = usuarios.filter(u => u.status === 'ativo').length;
    const inativos = usuarios.filter(u => u.status === 'inativo').length;
    const todos = usuarios.length;
    return { ativos, inativos, todos };
  }, [usuarios]);


  const handleOpenEditDialog = (userToEdit: Usuario) => {
    setEditingUser(userToEdit);
    setNewRole(userToEdit.role);
  };

  const handleCloseEditDialog = () => {
    setEditingUser(null);
    setNewRole('');
  }

  const handleUpdateRole = async () => {
    if (!editingUser || !newRole) return;
    setSaving(true);
    await updateUserRole(editingUser.id, newRole as any);
    setSaving(false);
    handleCloseEditDialog();
  };

    const generatePDF = (title: string, action: 'save' | 'print') => {
        const doc = new jsPDF();
        const tableData = filteredUsers.map(u => [
            u.nome,
            u.email,
            getRoleName(u.role),
            u.status === 'ativo' ? 'Ativo' : 'Inativo'
        ]);

        autoTable(doc, {
            head: [['Nome', 'Email', 'Função', 'Status']],
            body: tableData,
            didDrawPage: (data) => {
                // Header
                doc.setFontSize(16);
                doc.setTextColor(40);
                doc.text("Gestão de Obras", data.settings.margin.left, 15);
                doc.setFontSize(12);
                doc.text(title, data.settings.margin.left, 22);

                // Footer
                let footerText = `Página ${data.pageNumber}`;
                 if ((doc as any).putTotalPages) {
                    footerText += ` de {totalPages}`;
                }
                const dateText = `Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`;
                
                doc.setFontSize(10);
                doc.setTextColor(150);

                // Page number
                doc.text(footerText, data.settings.margin.left, doc.internal.pageSize.getHeight() - 10);
                
                // Date
                const dateTextWidth = doc.getStringUnitWidth(dateText) * doc.getFontSize() / doc.internal.scaleFactor;
                doc.text(dateText, doc.internal.pageSize.getWidth() - data.settings.margin.right - dateTextWidth, doc.internal.pageSize.getHeight() - 10);
            },
            margin: { top: 30 },
        });

        if ((doc as any).putTotalPages) {
            (doc as any).putTotalPages('{totalPages}');
        }


        if (action === 'save') {
            doc.save('relatorio_usuarios.pdf');
        } else {
            doc.output('dataurlnewwindow');
        }
    };
    
    const handlePrint = () => {
        generatePDF('Relatório de Usuários', 'print');
    };

    const handleExportPDF = () => {
        generatePDF('Relatório de Usuários', 'save');
    };

    const handleExportExcel = () => {
        const dataToExport = filteredUsers.map(u => ({
            Nome: u.nome,
            Email: u.email,
            Função: getRoleName(u.role),
            Status: u.status === 'ativo' ? 'Ativo' : 'Inativo'
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios');
        XLSX.writeFile(workbook, 'relatorio_usuarios.xlsx');
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

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
      case 'gestor':
        return 'default';
      case 'escritorio':
        return 'secondary';
      case 'encarregado':
        return 'outline';
      case 'montador':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'gestor' && user.role !== 'escritorio')) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Acesso Negado</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Você não tem permissão para acessar esta página.</p>
                <Button onClick={() => router.push('/dashboard')} className="mt-4">Voltar para o Início</Button>
            </CardContent>
        </Card>
    );
  }
  
  const UserActionsMenu = ({u}: {u: Usuario}) => {
    const showEditRoleOption =
        (isAdmin && u.role !== 'admin') ||
        (isGestor && u.role !== 'admin' && u.role !== 'gestor');

    const showToggleStatusOption = 
        (isAdmin && u.role !== 'admin') ||
        (isGestor && u.role !== 'admin' && u.role !== 'gestor');

    return (
     <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="link" className="h-8 w-8 p-0 text-black" disabled={u.id === user?.id}>
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-background text-foreground">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setViewingUser(u)}>
              <UserIcon className="mr-2 h-4 w-4" /> Ver Detalhes
          </DropdownMenuItem>
          {showEditRoleOption && (
            <DropdownMenuItem onClick={() => handleOpenEditDialog(u)}>
                <Edit className="mr-2 h-4 w-4" /> Editar Função
            </DropdownMenuItem>
          )}
          {showToggleStatusOption && (
            <>
              {u.status === 'ativo' ? (
                  <DropdownMenuItem onClick={() => handleToggleStatus(u.id, u.status)} className="text-destructive focus:text-destructive">
                      <UserX className="mr-2 h-4 w-4" /> Desativar
                  </DropdownMenuItem>
              ) : (
                  <DropdownMenuItem onClick={() => handleToggleStatus(u.id, u.status)} className="text-green-600 focus:text-green-700">
                      <UserCheck className="mr-2 h-4 w-4" /> Reativar
                  </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
  )};

  const renderContent = () => {
    let colSpan = (isAdmin ? 4 : 3) + (canTakeAction ? 1 : 0);
    if (activeTab === 'todos') {
        colSpan += 1; // Add one for the status column
    }

    return (
     <Card className="bg-[#d1d1d1]">
      {/* Mobile View: List of Cards */}
       <div className="md:hidden">
          <div className="space-y-4 p-4 max-w-md mx-auto">
              {loading ? (
                  [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
              ) : paginatedUsers.length > 0 ? (
                  paginatedUsers.map(u => (
                      <Card key={u.id} className="p-4">
                           <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-4 flex-1 min-w-0" onClick={() => setViewingUser(u)}>
                                  <Avatar className="h-10 w-10">
                                      <AvatarImage src={u.profileImageUrl || undefined} alt={u.nome} />
                                      <AvatarFallback>{getInitials(u.nome)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                      <p className="font-semibold truncate text-black">{u.nome}</p>
                                      <p className="text-sm text-muted-foreground truncate">{isAdmin ? u.email : getRoleName(u.role)}</p>
                                      {isAdmin ? <Badge variant={getRoleBadgeVariant(u.role)} className="mt-1">{getRoleName(u.role)}</Badge> : null}
                                  </div>
                              </div>
                              {canTakeAction && (
                                <div onClick={(e) => e.stopPropagation()}>
                                    <UserActionsMenu u={u} />
                                </div>
                              )}
                          </div>
                      </Card>
                  ))
              ) : (
                 <div className="text-center py-10 text-black">Nenhum usuário encontrado.</div>
              )}
          </div>
      </div>

      {/* Desktop View: Table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[50px] text-black">Foto</TableHead>
                <TableHead className="text-black">Nome Completo</TableHead>
                {isAdmin && <TableHead className="text-black">Email (Login)</TableHead>}
                <TableHead className="text-black">Função</TableHead>
                {activeTab === 'todos' && <TableHead className="text-black">Status</TableHead>}
                {canTakeAction && <TableHead className="text-right text-black">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                    <TableCell colSpan={colSpan}>
                        <Skeleton className="h-6 w-full my-2" />
                        <Skeleton className="h-6 w-full my-2" />
                    </TableCell>
                </TableRow>
              ) : (
              paginatedUsers.map((u) => (
                <TableRow key={u.id} onClick={() => setViewingUser(u)} className="cursor-pointer hover:bg-black/5">
                  <TableCell>
                      <Avatar className="h-8 w-8">
                          <AvatarImage src={u.profileImageUrl || undefined} alt={u.nome} />
                          <AvatarFallback>{getInitials(u.nome)}</AvatarFallback>
                      </Avatar>
                  </TableCell>
                  <TableCell className="font-medium text-black">{u.nome}</TableCell>
                  {isAdmin && <TableCell className="text-black">{u.email}</TableCell>}
                  <TableCell className="text-black">
                    {getRoleName(u.role)}
                  </TableCell>
                  {activeTab === 'todos' && (
                    <TableCell>
                        <Badge variant={u.status === 'ativo' ? 'default' : 'secondary'} className={cn(u.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')}>
                            {u.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </Badge>
                    </TableCell>
                  )}
                  {canTakeAction && (
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <UserActionsMenu u={u} />
                  </TableCell>
                  )}
                </TableRow>
              )))}
              {!loading && paginatedUsers.length === 0 && (
                 <TableRow>
                   <TableCell colSpan={colSpan} className="text-center h-24 text-black">Nenhum usuário encontrado.</TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
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
                    <span>Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, filteredUsers.length)} - {Math.min(currentPage * itemsPerPage, filteredUsers.length)} de {filteredUsers.length} registros</span>
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
  )};

  return (
    <>
      <div className="space-y-4">
        {/* Header Actions */}
        <div className="flex items-center gap-2">
            {canCreateUser && (
                <Button 
                    onClick={() => { setIsLoading(true); router.push('/rh/cadastros/usuarios/new')}}
                    className="transition-transform duration-200 hover:scale-105"
                >
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo Usuário
            </Button>
            )}
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
                    <DropdownMenuItem onClick={showDevelopmentToast}><Upload className="mr-2 h-4 w-4" />Importar Usuários</DropdownMenuItem>
                    <DropdownMenuItem onClick={showDevelopmentToast}><Download className="mr-2 h-4 w-4" />Baixar Modelo</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>

        {/* Filter Area */}
        <Card className="bg-[#d1d1d1]">
            <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-4">
                    <div className="relative flex-grow">
                         <Input 
                            placeholder={isAdmin ? "Pesquisar por nome, email ou função..." : "Pesquisar por nome ou função..."}
                            className="pl-10 bg-white border-gray-300 text-black"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-transparent p-0">
                        <TabsTrigger value="ativo" className={cn("py-3 relative text-black border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:shadow-none data-[state=active]:bg-transparent rounded-none", "flex gap-2")}>
                          Ativos 
                          <Badge variant={activeTab === 'ativo' ? 'secondary' : 'default'} className="px-2 bg-gray-200 text-black">{userCounts.ativos}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="inativo" className={cn("py-3 relative text-black border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:shadow-none data-[state=active]:bg-transparent rounded-none", "flex gap-2")}>
                          Inativos 
                          <Badge variant={activeTab === 'inativo' ? 'secondary' : 'default'} className="px-2 bg-gray-200 text-black">{userCounts.inativos}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="todos" className={cn("py-3 relative text-black border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:shadow-none data-[state=active]:bg-transparent rounded-none", "flex gap-2")}>
                          Todos
                          <Badge variant={activeTab === 'todos' ? 'secondary' : 'default'} className="px-2 bg-gray-200 text-black">{userCounts.todos}</Badge>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardContent>
        </Card>
      
        <div className="mt-4">
            {renderContent()}
        </div>
      </div>
      
      {/* Edit Role Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && handleCloseEditDialog()}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Editar Função do Usuário</DialogTitle>
                <DialogDescription>
                    Altere a função de {editingUser?.nome}. O usuário precisará fazer login novamente para que as alterações tenham efeito.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="role">Função</Label>
                    <Select value={newRole} onValueChange={setNewRole}>
                        <SelectTrigger id="role">
                            <SelectValue placeholder="Selecione uma função" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="montador">Montador</SelectItem>
                            <SelectItem value="encarregado">Encarregado</SelectItem>
                            <SelectItem value="escritorio">Escritório</SelectItem>
                            {isAdmin && <SelectItem value="gestor">Gestor</SelectItem>}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline" disabled={saving}>Cancelar</Button>
                </DialogClose>
                <Button onClick={handleUpdateRole} disabled={saving}>{saving ? "Salvando..." : "Salvar Alterações"}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* View User Details Dialog */}
      <Dialog open={!!viewingUser} onOpenChange={(open) => !open && setViewingUser(null)}>
        <DialogContent className="max-w-lg bg-background text-foreground">
            <DialogHeader>
                <DialogTitle>Detalhes do Usuário</DialogTitle>
                <DialogDescription>
                  Visualização das informações cadastradas para este usuário.
                </DialogDescription>
            </DialogHeader>
            {viewingUser && (
                <div className="space-y-4 py-4">
                     <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={viewingUser.profileImageUrl || undefined} alt={viewingUser.nome} />
                            <AvatarFallback>{getInitials(viewingUser.nome)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="text-xl font-bold">{viewingUser.nome}</h2>
                            <p className="text-muted-foreground">{viewingUser.email}</p>
                             <Badge variant={getRoleBadgeVariant(viewingUser.role)} className="mt-1">{getRoleName(viewingUser.role)}</Badge>
                        </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-3">
                        <h3 className="font-semibold text-primary">Informações Pessoais</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2"><UserIcon className="w-4 h-4 text-muted-foreground" /> <strong>CPF:</strong> {viewingUser.cpf || 'N/A'}</div>
                            <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /> <strong>Telefone:</strong> {viewingUser.telefone || 'N/A'}</div>
                            <div className="flex items-center gap-2 col-span-2"><Calendar className="w-4 h-4 text-muted-foreground" /> <strong>Data de Nascimento:</strong> {viewingUser.dataNascimento || 'N/A'}</div>
                        </div>
                    </div>
                    
                    <Separator />

                    <div className="space-y-3">
                         <h3 className="font-semibold text-primary">Endereço</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                             <div className="flex items-start gap-2 col-span-2"><Building className="w-4 h-4 mt-1 text-muted-foreground" /> <strong>Logradouro:</strong> {viewingUser.logradouro ? `${viewingUser.logradouro}, ${viewingUser.numero}` : 'N/A'}</div>
                             <div className="flex items-center gap-2"><strong>Bairro:</strong> {viewingUser.bairro || 'N/A'}</div>
                             <div className="flex items-center gap-2"><strong>Cidade:</strong> {viewingUser.cidade ? `${viewingUser.cidade} - ${viewingUser.estado}` : 'N/A'}</div>
                             <div className="flex items-center gap-2"><strong>CEP:</strong> {viewingUser.cep || 'N/A'}</div>
                          </div>
                    </div>

                </div>
            )}
             <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline">Fechar</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
