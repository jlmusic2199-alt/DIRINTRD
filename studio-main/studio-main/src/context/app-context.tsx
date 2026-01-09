'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase, useFirestore, useDoc } from '@/firebase';
import { User } from 'firebase/auth';
import { collection, query, Timestamp, doc } from 'firebase/firestore';

export type UserProfile = {
  id: string;
  email: string;
  rol: 'dueño' | 'empleado';
  departmentId: string | null;
  createdAt: Timestamp;
};

export type Department = {
    id: string;
    name: string;
    description?: string;
};

interface AppContextState {
  user: User | null;
  userData: UserProfile | null;
  departments: Department[];
  isLoading: boolean; // A single, reliable source of truth for all initial loading
}

const AppContext = createContext<AppContextState | undefined>(undefined);

// Define the canonical order for departments
const DEPARTMENT_ORDER = ['Diseño/Atencion al cliente', 'Facturacion', 'Impresion', 'Terminacion', 'Listo para entregar', 'Entregado'];

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading: isAuthLoading } = useFirebase();
  const firestore = useFirestore();
  
  const userDocRef = useMemoFirebase(() => {
    // This ref depends on `user`, so it will be null until `user` is available.
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]); 
  
  // isUserDataLoading is true ONLY when we have a user and are fetching their data.
  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserProfile>(userDocRef, {
    enabled: !isAuthLoading && !!user,
  });
  
  const departmentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'departments'));
  }, [firestore]); 

  // areDepartmentsLoading is true as long as we're fetching departments.
  const { data: rawDepartments, isLoading: areDepartmentsLoading } = useCollection<Department>(departmentsQuery, {
    // CRITICAL: Only enable this query once the auth state is resolved.
    enabled: !isAuthLoading,
  });

  const sortedDepartments = useMemo(() => {
    if (!rawDepartments) return [];
    return [...rawDepartments].sort((a, b) => {
        const indexA = DEPARTMENT_ORDER.indexOf(a.name);
        const indexB = DEPARTMENT_ORDER.indexOf(b.name);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });
  }, [rawDepartments]);

  // --- The new, robust isLoading logic ---
  // The entire context is "loading" if:
  // 1. Firebase is still checking the auth state (`isAuthLoading`).
  // 2. OR Auth is done, we have a user (`user` is not null), but we're still waiting for their profile (`isUserDataLoading`).
  // 3. OR we are still waiting for the departments to load (`areDepartmentsLoading`).
  const isLoading = isAuthLoading || (!!user && isUserDataLoading) || areDepartmentsLoading;


  const value: AppContextState = useMemo(() => {
    // When loading is in progress, we return null for user-specific data to prevent components
    // from acting on incomplete information. The `isLoading` flag is the source of truth.
    // userData is only passed if loading is complete.
    return {
      user,
      userData: !isLoading ? userData || null : null,
      departments: sortedDepartments,
      isLoading,
    };
  }, [user, userData, sortedDepartments, isLoading]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextState {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
