
'use client';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, UserX, UserCheck, Edit, Search, ChevronLeft, ChevronRight, User as UserIcon, Building, Phone, Calendar, PlusCircle } from 'lucide-react';
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

const USERS_PER_PAGE = 10;

export function UserManagement() {
  const { user } = useAuth();
  const router = useRouter();
  const { setIsLoading } = useLoading();
  
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
  const [currentPage, setCurrentPage] = useState(1);
  
  const isAdmin = user?.role === 'admin';
  const isGestor = user?.role === 'gestor';
  const canTakeAction = isAdmin || isGestor;
  const canCreateUser = isAdmin || isGestor;

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'ativo' | 'inativo' | 'todos');
    setCurrentPage(1); // Reset page on tab change
  };
  
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return usuarios;

    return usuarios.filter(u => {
        const lowerCaseTerm = searchTerm.toLowerCase();
        const searchByName = u.nome.toLowerCase().includes(lowerCaseTerm);
        const searchByEmail = isAdmin && u.email.toLowerCase().includes(lowerCaseTerm);
        const searchByRole = getRoleName(u.role).toLowerCase().includes(lowerCaseTerm);
        
        return searchByName || searchByEmail || searchByRole;
    });
  }, [searchTerm, usuarios, isAdmin]);

  const userCounts = useMemo(() => {
    const ativos = filteredUsers.filter(u => u.status === 'ativo').length;
    const inativos = filteredUsers.filter(u => u.status === 'inativo').length;
    const todos = filteredUsers.length;
    return { ativos, inativos, todos };
  }, [filteredUsers]);


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
  
  const renderPagination = (totalUsers: number) => {
    const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE) || 1;

    return (
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
          <Button variant="ghost" className="h-8 w-8 p-0" disabled={u.id === user?.id}>
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

  const renderContent = (statusFilter: 'ativo' | 'inativo' | 'todos') => {
    const tableUsers = statusFilter === 'todos'
        ? filteredUsers
        : filteredUsers.filter(u => u.status === statusFilter);

    const paginatedUsers = tableUsers.slice((currentPage - 1) * USERS_PER_PAGE, currentPage * USERS_PER_PAGE);
    
    let colSpan = (isAdmin ? 4 : 3) + (canTakeAction ? 1 : 0);
    if (statusFilter === 'todos') {
        colSpan += 1; // Add one for the status column
    }

    return (
     <Card>
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
                                      <p className="font-semibold truncate">{u.nome}</p>
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
                 <div className="text-center py-10 text-muted-foreground">Nenhum usuário encontrado.</div>
              )}
          </div>
      </div>

      {/* Desktop View: Table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] text-card-foreground">Foto</TableHead>
                <TableHead className="text-card-foreground">Nome Completo</TableHead>
                {isAdmin && <TableHead className="text-card-foreground">Email (Login)</TableHead>}
                <TableHead>Função</TableHead>
                {statusFilter === 'todos' && <TableHead className="text-card-foreground">Status</TableHead>}
                {canTakeAction && <TableHead className="text-right text-card-foreground">Ações</TableHead>}
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
                <TableRow key={u.id} onClick={() => setViewingUser(u)} className="cursor-pointer">
                  <TableCell>
                      <Avatar className="h-8 w-8">
                          <AvatarImage src={u.profileImageUrl || undefined} alt={u.nome} />
                          <AvatarFallback>{getInitials(u.nome)}</AvatarFallback>
                      </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{u.nome}</TableCell>
                  {isAdmin && <TableCell>{u.email}</TableCell>}
                  <TableCell>
                    {getRoleName(u.role)}
                  </TableCell>
                  {statusFilter === 'todos' && (
                    <TableCell>
                        <Badge variant={u.status === 'ativo' ? 'default' : 'secondary'} className={cn(u.status === 'ativo' ? 'bg-green-600' : 'bg-gray-500', 'text-white')}>
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
                   <TableCell colSpan={colSpan} className="text-center h-24">Nenhum usuário encontrado.</TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {renderPagination(tableUsers.length)}
      </Card>
  )};

  return (
    <>
        <div className="flex items-center justify-between mb-4">
            <div className="relative w-full md:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black" />
                <Input 
                    placeholder={isAdmin ? "Pesquisar por nome, email ou função..." : "Pesquisar por nome ou função..."}
                    className="pl-10 bg-gray-200 border-black text-black"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
            </div>
             {canCreateUser && (
                <Button 
                    onClick={() => { setIsLoading(true); router.push('/expedicao/cadastros/usuarios/new')}}
                    className="transition-transform duration-200 hover:scale-105"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Novo Usuário
                </Button>
            )}
        </div>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-3 bg-tab-background">
                <TabsTrigger value="ativo" className={cn("data-[state=active]:bg-primary data-[state=active]:text-primary-foreground", "flex gap-2")}>
                  Ativos 
                  <Badge variant={activeTab === 'ativo' ? 'secondary' : 'default'} className="px-2">{userCounts.ativos}</Badge>
                </TabsTrigger>
                <TabsTrigger value="inativo" className={cn("data-[state=active]:bg-primary data-[state=active]:text-primary-foreground", "flex gap-2")}>
                  Inativos 
                  <Badge variant={activeTab === 'inativo' ? 'secondary' : 'default'} className="px-2">{userCounts.inativos}</Badge>
                </TabsTrigger>
                <TabsTrigger value="todos" className={cn("data-[state=active]:bg-primary data-[state=active]:text-primary-foreground", "flex gap-2")}>
                  Todos
                  <Badge variant={activeTab === 'todos' ? 'secondary' : 'default'} className="px-2">{userCounts.todos}</Badge>
                </TabsTrigger>
            </TabsList>
            <TabsContent value="ativo" className="mt-4">
                {renderContent('ativo')}
            </TabsContent>
            <TabsContent value="inativo" className="mt-4">
                {renderContent('inativo')}
            </TabsContent>
            <TabsContent value="todos" className="mt-4">
                {renderContent('todos')}
            </TabsContent>
        </Tabs>
      
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

    