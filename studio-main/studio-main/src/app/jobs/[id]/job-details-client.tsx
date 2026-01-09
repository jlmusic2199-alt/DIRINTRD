'use client';
import { notFound, useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { User, Calendar, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { JobActions } from '@/components/job-actions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useFirebase, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useEffect } from 'react';
import { JobUpdates } from '@/components/job-updates';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/app-context';
import { getPriorityConfig, getStatusConfig } from '@/lib/config';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Define the Job type
type Job = {
  id: string;
  clientName: string;
  specifications?: string;
  departmentId: string;
  status: string;
  priority: 'Urgente' | 'Alta' | 'Normal' | 'Baja';
  createdAt: { toDate: () => Date };
  approvalUrl?: string;
};


export default function JobDetailsClient({ id }: { id: string }) {
  const { user, isUserLoading } = useFirebase();
  const { userData, departments } = useAppContext();
  const router = useRouter();
  const firestore = useFirestore();

  const jobRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'jobs', id);
  }, [firestore, id]); 

  const { data: job, isLoading: isJobLoading } = useDoc<Job>(jobRef);

  const isLoading = isUserLoading || isJobLoading;

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);
  
  const currentDept = departments.find(d => d.id === job?.departmentId);
  const statusConfig = getStatusConfig(currentDept?.name || job?.status);
  const priorityConfig = getPriorityConfig(job?.priority);
  
  const impressionDept = departments.find(d => d.name === 'Impresion');
  const canDownloadFiles = userData?.rol === 'dueño' || userData?.departmentId === impressionDept?.id;

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <Header />
        <main className="container mx-auto py-8 px-4 md:px-6 flex-1 flex items-center justify-center">
          <p>Cargando detalles del trabajo...</p>
        </main>
      </div>
    );
  }

  if (!job) {
    notFound();
    return null;
  }
  
  const creationDate = job.createdAt ? job.createdAt.toDate() : new Date();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto py-8 px-4 md:px-6">
        <div className="max-w-4xl mx-auto space-y-8">
        
          <Card>
              <CardHeader>
                  <CardTitle className="font-headline text-3xl font-bold">{job.clientName}</CardTitle>
                  <CardDescription className="text-lg text-muted-foreground pt-1">ID de Trabajo: {job.id}</CardDescription>
                  <div className="flex items-center gap-2 pt-2">
                     {statusConfig && (
                        <Badge className={cn("text-white text-sm", statusConfig.color)}>
                            <statusConfig.icon className="h-4 w-4 mr-2" />
                            {job.status}
                        </Badge>
                     )}
                     {priorityConfig && (
                        <Badge variant="outline" className={cn("text-sm", priorityConfig.color, priorityConfig.bgColor)}>
                           <priorityConfig.icon className="h-4 w-4 mr-2" />
                           {job.priority}
                        </Badge>
                     )}
                  </div>
              </CardHeader>
              <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="flex items-start gap-4">
                          <User className="h-8 w-8 text-primary mt-1" />
                          <div>
                              <p className="text-sm text-muted-foreground">Cliente</p>
                              <p className="font-semibold text-foreground">{job.clientName}</p>
                          </div>
                      </div>
                      <div className="flex items-start gap-4">
                          <Calendar className="h-8 w-8 text-primary mt-1" />
                          <div>
                              <p className="text-sm text-muted-foreground">Fecha de Creación</p>
                              <p className="font-semibold text-foreground">{format(creationDate, 'dd/MM/yyyy, h:mm a', { locale: es })}</p>
                          </div>
                      </div>
                  </div>
                   {job.approvalUrl && (
                        <div className="mt-6 flex items-start gap-4 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                           <CheckCircle className="h-8 w-8 text-green-400 mt-1" />
                           <div>
                              <p className="text-sm text-green-400/80">Aprobación del Cliente</p>
                              <p className="font-semibold text-foreground">El cliente ha aprobado el diseño.</p>
                               <Button size="sm" variant="outline" asChild className="mt-2">
                                  <Link href={job.approvalUrl} target="_blank">Ver Prueba de Aprobación</Link>
                               </Button>
                           </div>
                        </div>
                   )}
              </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline text-2xl">Especificaciones</CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                   <p>{job.specifications || 'No hay especificaciones detalladas.'}</p>
                </CardContent>
              </Card>

              <JobUpdates jobId={id} canDownloadFiles={canDownloadFiles} />
            </div>
            
            <div className="md:col-span-1 space-y-6">
              <JobActions job={job as any} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
