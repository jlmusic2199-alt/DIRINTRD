'use client';
import { Header } from '@/components/header';
import { AuthGuard } from '@/components/auth-guard';
import { KanbanShell } from '@/components/kanban/kanban-shell';
import { useJobData } from '@/lib/hooks/use-job-data';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { useAppContext } from '@/context/app-context';
import { Users, Loader2 } from 'lucide-react';

function HomePageContent() {
  const { userData, isLoading: isContextLoading } = useAppContext();
  const { jobs, departmentsForBoard, isLoading: areJobsLoading } = useJobData();

  if (isContextLoading || areJobsLoading) {
    return <KanbanShell />;
  }
  
  // This is the definitive fix. This message is ONLY for 'empleado' roles.
  // The 'dueño' (admin) role is never considered an unassigned user, because the concept of department doesn't apply to them.
  if (userData?.rol === 'empleado' && !userData.departmentId) {
     return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="p-8 max-w-md mx-auto bg-card border rounded-lg shadow-lg">
            <Users className="mx-auto h-12 w-12 text-primary" />
            <h2 className="text-xl font-semibold text-foreground mt-4">Acceso Pendiente</h2>
            <p className="text-muted-foreground mt-2">
              Un administrador aún no le ha asignado un departamento. Por favor, póngase en contacto con un administrador para que le conceda acceso al sistema.
            </p>
             <div className="text-xs text-muted-foreground mt-4 flex items-center justify-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Esperando asignación... La página se actualizará automáticamente.</span>
            </div>
        </div>
      </div>
    );
  }

  return (
      <div className="flex-grow overflow-auto">
        <KanbanBoard jobs={jobs} departments={departmentsForBoard} />
      </div>
  );
}


export default function Home() {
  return (
    <AuthGuard>
      <div className="flex flex-col h-screen bg-background text-foreground">
        <Header />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="h-full flex flex-col">
             <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-headline font-bold text-foreground">
                Panel de Trabajos
                </h1>
             </div>
            <HomePageContent />
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
