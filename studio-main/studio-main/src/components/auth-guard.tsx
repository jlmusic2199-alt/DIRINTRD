'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { KanbanShell } from './kanban/kanban-shell';
import { useAppContext } from '@/context/app-context';
import { Header } from './header';

/**
 * AuthGuard ensures a user is authenticated and all critical context is loaded before rendering its children.
 * 1. While auth state or context is loading, it shows a full-page loading shell.
 * 2. Once loading is complete, if there is no user, it redirects to '/login'.
 * 3. If there is a user and all data is loaded, it renders the children.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, userData, isLoading } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    // Wait until the initial loading of all context data is resolved.
    if (isLoading) {
      return;
    }

    // If loading is finished and there's no authenticated user, redirect to login.
    if (!user) {
      router.push('/login');
    }

  }, [user, isLoading, router]);

  // While any critical data (auth state, user profile, departments) is loading, show a full-page shell.
  // This is the most crucial state. We wait for `isLoading` to be false.
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-background text-foreground">
        <Header />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="h-full flex flex-col">
             <h1 className="text-2xl font-headline font-bold text-foreground mb-6">
              Cargando Panel...
            </h1>
            <KanbanShell />
          </div>
        </main>
      </div>
    );
  }
  
  // If loading is complete and we have a user with their profile data, render the protected content.
  if (user && userData) {
     return <>{children}</>;
  }

  // If loading is complete and there's no user, render null while the redirect is in progress.
  // Or if there's a user but somehow no userData (which shouldn't happen with the new isLoading logic),
  // this will also result in a redirect via the useEffect.
  return null;
}
