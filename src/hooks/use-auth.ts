
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

type User = {
  id: string; // This will be the Firebase Auth UID
  name: string;
  email: string;
  role: 'admin' | 'encarregado' | 'escritorio' | 'gestor' | 'montador';
  profileImageUrl?: string | null;
  firstName: string;
  lastName: string;
  cpf?: string;
  telefone?: string;
  dataNascimento?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
};


export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();


  const logout = useCallback(async () => {
    try {
      await auth.signOut();
      // Force light theme for public pages by removing the dark class
      // but keep the theme preference in localStorage for the next login.
      document.documentElement.classList.remove('dark');
      router.push('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  }, [router]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      
      if (firebaseUser) {
        const userDocRef = doc(db, 'usuarios', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
           if(userData.status !== 'ativo') {
              await auth.signOut();
              setUser(null);
              setLoading(false);
              return;
            }
          
          const localUser = {
            id: firebaseUser.uid,
            name: `${userData.firstName} ${userData.lastName}`,
            email: firebaseUser.email!,
            role: userData.role,
            profileImageUrl: userData.profileImageUrl,
            firstName: userData.firstName,
            lastName: userData.lastName,
            cpf: userData.cpf,
            telefone: userData.telefone,
            dataNascimento: userData.dataNascimento,
            cep: userData.cep,
            logradouro: userData.logradouro,
            numero: userData.numero,
            bairro: userData.bairro,
            cidade: userData.cidade,
            estado: userData.estado,
          };
          setUser(localUser);

        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [router]);

  return { user, loading, logout };
}
