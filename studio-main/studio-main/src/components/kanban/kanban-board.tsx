'use client';

import { KanbanColumn } from './kanban-column';
import { Job, Department } from '@/lib/hooks/use-job-data';
import { cn } from '@/lib/utils';

interface KanbanBoardProps {
  jobs: Job[];
  departments: Department[];
}

export function KanbanBoard({ jobs, departments }: KanbanBoardProps) {

  const getJobsForColumn = (statusName: string) => {
    return jobs.filter(job => job.status === statusName);
  };
  
  return (
    <div className={cn(
        "grid gap-6 h-full",
        "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6"
    )}>
      {departments.map(department => (
        <KanbanColumn 
          key={department.id} 
          status={department.name} 
          jobs={getJobsForColumn(department.name)} 
        />
      ))}
    </div>
  );
}
