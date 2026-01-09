import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { getPriorityConfig } from '@/lib/config';

type Job = {
  id: string;
  clientName: string;
  createdAt: { toDate: () => Date };
  priority: 'Urgente' | 'Alta' | 'Normal' | 'Baja';
};


interface KanbanCardProps {
  job: Job;
}

export function KanbanCard({ job }: KanbanCardProps) {
  const clientInitial = job.clientName ? job.clientName.charAt(0).toUpperCase() : '?';
  const creationDate = job.createdAt ? job.createdAt.toDate() : new Date();
  const priorityConfig = getPriorityConfig(job.priority);

  return (
    <Link href={`/jobs/${job.id}`} className="block">
      <Card className="hover:shadow-lg hover:-translate-y-1 transition-transform duration-200 ease-in-out bg-card/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold font-headline">{job.clientName || 'Cliente no asignado'}</CardTitle>
          {priorityConfig && (
              <Badge 
                variant="outline" 
                className={cn("text-xs py-0", priorityConfig.color, priorityConfig.bgColor)}
              >
                  {job.priority}
              </Badge>
          )}
        </CardHeader>
        <CardContent className="flex items-center gap-4 pt-0">
          <Avatar>
            <AvatarFallback>{clientInitial}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-foreground">{job.clientName || 'Cliente no asignado'}</p>
            <p className="text-xs text-muted-foreground">Job ID: {job.id}</p>
          </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground flex justify-between">
           <div className="flex items-center gap-2">
            <span>Creado: {format(creationDate, 'dd/MM/yyyy, h:mm a', { locale: es })}</span>
           </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
