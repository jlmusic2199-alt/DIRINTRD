'use client';
import { notFound } from 'next/navigation';
import { JobUpdates } from '@/components/job-updates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDoc, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { useAppContext } from '@/context/app-context';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useMemo } from 'react';
import { ClientTracker } from '@/components/client-tracker';

type JobUpdate = {
  id: string;
  fileUrls?: string[];
  comment?: string;
  timestamp: { toDate: () => Date };
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

export default function TrackClient({ id }: { id: string }) {
  const firestore = useFirestore();
  const { isLoading: isContextLoading } = useAppContext(); // We need the context loading state

  const jobRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'jobs', id);
  }, [firestore, id]);

  const { data: job, isLoading: isJobLoading } = useDoc(jobRef);
  
  const updatesQuery = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    const updatesCollection = collection(firestore, 'jobs', id, 'updates');
    return query(updatesCollection, orderBy('timestamp', 'desc'));
  }, [firestore, id]);
  
  const { data: updates, isLoading: areUpdatesLoading } = useCollection<JobUpdate>(updatesQuery);
  
  const screenshotUrl = useMemo(() => {
    if (!updates) return null;
    // Find the most recent update that has at least one image file URL.
    const screenshotUpdate = updates.find(u => u.fileUrls && u.fileUrls.some(isImageUrl));
    // From that update, find the primer URL that is an image.
    return screenshotUpdate?.fileUrls?.find(isImageUrl) || null;
  }, [updates]);

  // The page is loading if the job data is loading OR if the main app context (which has departments) is loading.
  const isLoading = isJobLoading || areUpdatesLoading || isContextLoading;

  if (isLoading) {
    return (
       <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4">Cargando estado del pedido...</p>
      </div>
    )
  }

  if (!job) {
    notFound();
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4">
        <div className="flex items-center space-x-2 my-8">
             <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8"
            >
              <path d="M6 9V2h12v7" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <path d="M6 14h12v8H6z" />
            </svg>
            <span className="text-2xl inline-block font-headline font-bold text-foreground">
              DIPRINT RD
            </span>
        </div>

      <div className="w-full max-w-4xl space-y-6">
        <div className="text-center">
          <h1 className="font-headline text-3xl md:text-4xl font-bold">Seguimiento de su Pedido</h1>
          <p className="text-muted-foreground mt-2">
            ID: <span className="font-semibold text-primary">{job.id}</span> | Cliente: <span className="font-semibold text-primary">{job.clientName}</span>
          </p>
        </div>

        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Estado Actual del Pedido</CardTitle>
            </CardHeader>
            <CardContent>
                <ClientTracker currentStatus={job.status} />
            </CardContent>
        </Card>
        
        {screenshotUrl && (
             <Card>
                <CardHeader>
                  <CardTitle className="font-headline text-2xl flex items-center gap-2">
                    <ImageIcon className="h-6 w-6 text-primary" />
                    <span>Vista Previa del Diseño</span>
                  </CardTitle>
                  <CardDescription>Esta es la vista previa más reciente del diseño registrado.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                        <Image 
                            src={screenshotUrl} 
                            alt="Captura de pantalla del diseño"
                            fill
                            className="object-contain"
                        />
                    </div>
                </CardContent>
            </Card>
        )}

        <JobUpdates jobId={id} />

      </div>
      
       <footer className="mt-8 text-sm text-muted-foreground">
        Impulsado por DIPRINT RD
      </footer>
    </div>
  );
}
