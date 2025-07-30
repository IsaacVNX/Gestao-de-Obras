
'use client';
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, query, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './use-auth';

export type Usuario = {
    id: string; 
    nome: string;
    email: string;
    role: 'admin' | 'encarregado' | 'escritorio' | 'gestor' | 'montador';
    status: 'ativo' | 'inativo';
    profileImageUrl?: string;
    cpf?: string;
    telefone?: string;
    dataNascimento?: string;
    cep?: string;
    logradouro?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    firstName: string;
    lastName: string;
}

export function useUserManagement() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ativo' | 'inativo' | 'todos'>('ativo');

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "usuarios"), where("role", "!=", "admin"));
      const querySnapshot = await getDocs(q);
      const usuariosList = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return { 
              id: doc.id, 
              nome: `${data.firstName} ${data.lastName}`,
              ...data
          } as Usuario
      });
      setUsuarios(usuariosList);
    } catch (error) {
      console.error("Erro ao buscar usuários: ", error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os usuários.'})
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);
  
  const handleToggleStatus = async (id: string, currentStatus: 'ativo' | 'inativo') => {
    if (id === currentUser?.id) {
        toast({ variant: 'destructive', title: 'Ação Inválida', description: 'Você não pode alterar o status do seu próprio usuário.'});
        return;
    }

    const userToToggle = usuarios.find(u => u.id === id);
    if(userToToggle?.role === 'admin') {
      toast({ variant: 'destructive', title: 'Ação Proibida', description: 'Você não pode modificar um administrador.' });
      return;
    }

    const newStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo';
    const actionText = newStatus === 'ativo' ? 'reativado' : 'desativado';
    try {
      const usuarioDocRef = doc(db, 'usuarios', id);
      await updateDoc(usuarioDocRef, { status: newStatus });
      
      setUsuarios(prev => prev.map(u => u.id === id ? {...u, status: newStatus} : u));
      toast({ title: 'Sucesso!', description: `Usuário ${actionText}.`});

    } catch (error) {
      console.error(`Erro ao ${actionText} usuário: `, error);
      toast({ variant: 'destructive', title: 'Erro', description: `Não foi possível ${actionText} o usuário.`});
    }
  }

  const updateUserRole = async (id: string, newRole: 'admin' | 'encarregado' | 'escritorio' | 'gestor' | 'montador') => {
     if (id === currentUser?.id) {
        toast({ variant: 'destructive', title: 'Ação Inválida', description: 'Você não pode alterar sua própria função.'});
        return;
    }
     const userToUpdate = usuarios.find(u => u.id === id);
    if(userToUpdate?.role === 'admin') {
      toast({ variant: 'destructive', title: 'Ação Proibida', description: 'Você não pode modificar um administrador.' });
      return;
    }
    try {
        const userDocRef = doc(db, 'usuarios', id);
        await updateDoc(userDocRef, { role: newRole });
        
        await fetchUsuarios(); // Refetch to get the latest data
        toast({ title: 'Sucesso!', description: 'A função do usuário foi atualizada.' });

    } catch (error) {
        console.error('Erro ao atualizar função do usuário:', error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar a função do usuário.' });
    }
  }

  return { usuarios, loading, activeTab, setActiveTab, handleToggleStatus, updateUserRole, refetch: fetchUsuarios };
}
