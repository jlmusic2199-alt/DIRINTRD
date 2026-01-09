'use client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

// Generate a fixed number of skeleton columns for a consistent loading experience.
const SKELETON_COLUMN_COUNT = 6;
const skeletonColumns = Array.from({ length: SKELETON_COLUMN_COUNT });

export function KanbanShell() {
  const cards = Array.from({ length: 2 });
  
  return (
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6 h-full">
      {skeletonColumns.map((_, i) => (
        <div key={i} className="flex flex-col h-full bg-card/50 rounded-lg border">
          <div className="flex items-center gap-2 p-2 rounded-t-lg bg-card border-b flex-shrink-0">
            <Skeleton className="p-1.5 rounded h-8 w-8 bg-muted" />
            <Skeleton className="h-6 w-32 rounded" />
            <Badge variant="secondary" className="ml-auto flex-shrink-0"><Skeleton className="h-4 w-4 rounded-full" /></Badge>
          </div>
          <ScrollArea className="flex-grow">
            <div className="flex flex-col gap-4 p-2">
              {cards.map((_, j) => (
                 <div key={j} className="p-4 border rounded-lg bg-card/80">
                    <Skeleton className="h-5 w-4/5 rounded mb-4" />
                    <div className="flex items-center gap-4">
                       <Skeleton className="h-10 w-10 rounded-full" />
                       <div className="space-y-2">
                          <Skeleton className="h-4 w-28 rounded" />
                          <Skeleton className="h-3 w-20 rounded" />
                       </div>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-4" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    </div>
                 </div>
              ))}
               <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-lg mt-2 mx-2">
                <p className="text-muted-foreground text-center text-sm p-2">Cargando...</p>
              </div>
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}
