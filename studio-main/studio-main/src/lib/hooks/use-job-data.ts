'use client';
import { useMemoFirebase, useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useAppContext } from '@/context/app-context';
import { useMemo } from 'react';

export type Job = {
  id: string;
  clientName: string;
  status: string;
  specifications: string;
  departmentId: string;
  priority: 'Urgente' | 'Alta' | 'Normal' | 'Baja';
  createdAt: { toDate: () => Date };
};

export type Department = {
    id: string;
    name:string;
};

export function useJobData() {
  const firestore = useFirestore();
  // With the robust AppContext, `isLoading` is the only flag we need to check.
  // If `isLoading` is false, we are guaranteed to have valid `userData` (or null if logged out).
  const { userData, departments, isLoading: isContextLoading } = useAppContext();
  
  // Enable queries only when the entire context has finished loading and we have a user.
  const isHookEnabled = !isContextLoading && !!userData;

  const jobsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // We can remove the `isHookEnabled` dependency here as `useCollection` will handle it.
    return query(collection(firestore, 'jobs'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  // The `enabled` flag is now the single point of control for this query.
  const { data: allJobs, isLoading: areJobsLoading, error } = useCollection<Job>(jobsQuery, {
      enabled: isHookEnabled
  });
  
  const departmentsForBoard = useMemo(() => {
    // This logic is now safe because `isContextLoading` covers all data dependencies.
    if (isContextLoading || !userData) return [];

    // 'dueño' sees all departments.
    if (userData.rol === 'dueño') {
        return departments.filter(d => d.name !== 'Entregado');
    }
    
    // 'empleado' sees ONLY the column for their assigned department.
    if (userData.rol === 'empleado' && userData.departmentId) {
        return departments.filter(d => d.id === userData.departmentId);
    }
    
    return [];
    
  }, [userData, departments, isContextLoading]);
  
  const jobs = useMemo(() => {
    // This logic is also safe now.
    if (!allJobs || !userData) return [];
    
    if (userData.rol === 'dueño') {
        return allJobs.filter(job => job.status !== 'Entregado');
    }
    
    if (userData.rol === 'empleado' && userData.departmentId) {
      return allJobs.filter(job => job.departmentId === userData.departmentId);
    }
    
    return [];
  }, [allJobs, userData]);


  if (error) {
      console.error("Error fetching jobs in useJobData:", error);
  }
  
  // The final loading state is a combination of context loading and this hook's specific job loading.
  const isLoading = isContextLoading || (isHookEnabled && areJobsLoading);

  return {
    jobs,
    departmentsForBoard,
    isLoading,
  };
}
