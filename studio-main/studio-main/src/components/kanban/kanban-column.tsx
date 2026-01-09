'use client';
import { KanbanCard } from './kanban-card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Job } from '@/lib/hooks/use-job-data';
import { getStatusConfig } from '@/lib/config';

interface KanbanColumnProps {
  status: string;
  jobs: Job[];
}

export function KanbanColumn({ status, jobs }: KanbanColumnProps) {
  const config = getStatusConfig(status);
  const { icon: Icon, color, label } = config;

  return (
    <div className="flex flex-col h-full bg-card/50 rounded-lg border">
      <div className="flex items-center gap-2 p-2 rounded-t-lg bg-card border-b flex-shrink-0">
        <div className={`p-1.5 rounded ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <h2 className="font-headline text-lg font-semibold text-foreground truncate" title={label}>{label}</h2>
        {jobs.length > 0 ? (
            <Badge variant="secondary" className="ml-auto flex-shrink-0">{jobs.length}</Badge>
        ) : null}
      </div>
      <ScrollArea className="flex-grow">
        <div className="flex flex-col gap-4 p-2">
          {jobs.length > 0 ? (
            jobs.map(job => (
              <KanbanCard key={job.id} job={job} />
            ))
          ) : (
            <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-lg mt-2 mx-2">
              <p className="text-muted-foreground text-center text-sm p-2">No hay trabajos aquí</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
