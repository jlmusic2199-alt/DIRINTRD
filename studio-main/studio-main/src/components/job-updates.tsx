'use client';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Building, Calendar, MessageSquare, Tag, Paperclip, Download, ShieldAlert, Image as ImageIcon, FileWarning, Send } from 'lucide-react';
import { Button } from './ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { useMemo } from 'react';

type JobUpdate = {
  id: string;
  userId: string;
  departmentId: string;
  timestamp: {
    toDate: () => Date;
  };
  comment?: string;
  newStatus?: string;
  newPriority?: 'Urgente' | 'Alta' | 'Normal' | 'Baja';
  fileUrl?: string; // For backward compatibility
  fileUrls?: string[];
};

type Department = {
    id: string;
    name: string;
};

const isImageUrl = (url: string) => {
    try {
        const parsedUrl = new URL(url);
        const path = parsedUrl.pathname.toLowerCase();
        return path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.gif') || path.endsWith('.webp');
    } catch (e) {
        return false;
    }
}

const getFileName = (url: string) => {
    try {
        const parsedUrl = new URL(url);
        const path = decodeURIComponent(parsedUrl.pathname);
        const name = path.substring(path.lastIndexOf('/') + 1);
        // Remove timestamp prefix if present
        return name.replace(/^\d{13}_/, '');
    } catch (e) {
        return "archivo_adjunto";
    }
}

export function JobUpdates({ jobId, canDownloadFiles = false }: { jobId: string, canDownloadFiles?: boolean }) {
  const firestore = useFirestore();

  // This component is now self-sufficient and loads its own department data.
  const deptsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'departments')) : null, [firestore]);
  const { data: departments, isLoading: areDepartmentsLoading } = useCollection<Department>(deptsQuery);

  const updatesQuery = useMemoFirebase(() => {
    if (!firestore || !jobId) return null;
    const updatesCollection = collection(firestore, 'jobs', jobId, 'updates');
    return query(updatesCollection, orderBy('timestamp', 'desc'));
  }, [firestore, jobId]);

  const { data: updates, isLoading: areUpdatesLoading } = useCollection<JobUpdate>(updatesQuery);
  
  const getDepartmentName = (departmentId: string) => {
    if (!departments) return departmentId; // Return ID if departments aren't loaded yet
    const department = departments.find(d => d.id === departmentId);
    return department?.name || 'Desconocido';
  }
  
  // The component is loading if either updates or its own department data is loading.
  const isLoading = areUpdatesLoading || areDepartmentsLoading;

  if (isLoading && !updates) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Historial del Trabajo</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Cargando historial...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Historial del Trabajo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative pl-6 space-y-8 border-l-2 border-border">
          {updates && updates.length > 0 ? (
            updates.map((update) => {
              const allFiles = [...(update.fileUrls || [])];
              if (update.fileUrl && !allFiles.includes(update.fileUrl)) {
                allFiles.unshift(update.fileUrl);
              }
              const imageFiles = allFiles.filter(isImageUrl);
              const otherFiles = allFiles.filter(url => !isImageUrl(url));
              const isApprovalRequest = update.comment === 'Se solicitó la aprobación del diseño al cliente.';


              return (
              <div key={update.id} className="relative">
                <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-primary" />
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                     <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      <span className="font-semibold">{getDepartmentName(update.departmentId)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {update.timestamp ? format(update.timestamp.toDate(), "dd/MM/yyyy, h:mm a", { locale: es }) : 'Fecha pendiente'}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 rounded-md bg-secondary/50 border border-border space-y-4">
                    {update.newStatus && (
                         <div className="flex items-start gap-3">
                            <Tag className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                            <p className="text-foreground">
                                El estado cambió a <span className="font-semibold">{update.newStatus}</span>
                            </p>
                        </div>
                    )}
                     {update.newPriority && (
                         <div className="flex items-start gap-3">
                            <ShieldAlert className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                            <p className="text-foreground">
                                La prioridad cambió a <span className="font-semibold">{update.newPriority}</span>
                            </p>
                        </div>
                    )}
                    {update.comment && !isApprovalRequest && (
                         <div className="flex items-start gap-3">
                            <MessageSquare className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                            <p className="text-foreground whitespace-pre-wrap">{update.comment}</p>
                        </div>
                    )}
                    {isApprovalRequest && (
                         <div className="flex items-start gap-3">
                            <Send className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                            <p className="text-foreground italic">{update.comment}</p>
                        </div>
                    )}
                    {imageFiles.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <ImageIcon className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 flex-1">
                                {imageFiles.map((fileUrl, index) => (
                                    <div key={index} className="relative aspect-square w-full overflow-hidden rounded-md border">
                                        <Image src={fileUrl} alt={`Imagen adjunta ${index + 1}`} fill className="object-contain" />
                                        <Button size="icon" variant="ghost" asChild className="absolute top-1 right-1 h-6 w-6 bg-black/50 hover:bg-black/75">
                                            <a href={fileUrl} target="_blank" download={getFileName(fileUrl)}>
                                                <Download className="h-4 w-4 text-white" />
                                            </a>
                                        </Button>
                                    </div>
                                ))}
                                </div>
                            </div>
                        </div>
                    )}
                     {otherFiles.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-start gap-3">
                                <Paperclip className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                                <div className="flex flex-col space-y-2">
                                {otherFiles.map((fileUrl, index) => (
                                  canDownloadFiles ? (
                                    <Button key={index} variant="secondary" size="sm" asChild className="w-fit">
                                        <Link href={fileUrl} target="_blank" download={getFileName(fileUrl)}>
                                            <Download className="mr-2 h-4 w-4" />
                                            {getFileName(fileUrl)}
                                        </Link>
                                    </Button>
                                  ) : (
                                    <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground p-2 bg-muted rounded-md w-fit">
                                      <FileWarning className="h-4 w-4 text-yellow-500" />
                                      <span>{getFileName(fileUrl)}</span>
                                    </div>
                                  )
                                ))}
                                </div>
                            </div>
                        </div>
                    )}
                  </div>
                </div>
              </div>
            )})
          ) : (
            <div className="relative">
                 <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-border" />
                 <p className="text-muted-foreground pt-1">No hay actualizaciones para este trabajo.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
