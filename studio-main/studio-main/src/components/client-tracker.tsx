'use client';

import { useAppContext } from '@/context/app-context';
import { cn } from '@/lib/utils';
import { getStatusConfig } from '@/lib/config';
import { Check, Loader2 } from 'lucide-react';
import { useMemo } from 'react';


export function ClientTracker({ currentStatus }: { currentStatus: string }) {
  const { departments, isLoading } = useAppContext();

  const statuses = useMemo(() => {
    if (!departments) return [];
    
    // The AppContext now guarantees sorted departments.
    // We just map them to the format needed by this component.
    return departments.map(dep => {
          const config = getStatusConfig(dep.name);
          return {
              name: dep.name,       // The full, real name for comparison, e.g., 'Diseño/Atencion al cliente'
              label: config.label,  // The short, display label, e.g., 'Diseño y Atención'
              icon: config.icon,
          };
      });
  }, [departments]);


  if (isLoading) {
      return (
        <div className="flex items-center justify-center w-full h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-4">Cargando seguimiento...</p>
        </div>
      )
  }

  // The comparison MUST be against `status.name` which holds the full department name.
  const currentStatusIndex = statuses.findIndex(s => s.name === currentStatus);

  // If after loading, we still have no statuses or can't find the index, show a clear error state.
   if (statuses.length === 0 || currentStatusIndex === -1) {
      return (
        <div className="flex items-center justify-center w-full h-48 text-center text-muted-foreground">
            <p>No se pudo determinar el estado actual del pedido.<br/>El estado recibido es: '{currentStatus}'.</p>
        </div>
      )
  }

  return (
    <div className="relative flex flex-col items-start w-full">
      {statuses.map((status, index) => {
        const isCompleted = index < currentStatusIndex;
        const isCurrent = index === currentStatusIndex;
        
        return (
            <div key={status.name} className={cn("flex items-start gap-4 md:gap-6 w-full pb-10", index === statuses.length -1 ? '' : 'relative')}>
                {index < statuses.length - 1 && (
                     <div className="absolute left-5 top-5 h-full w-0.5 bg-border -translate-x-1/2" />
                )}
                <div className="relative z-10 flex flex-col items-center">
                    <div className={cn(
                        "flex items-center justify-center h-10 w-10 rounded-full border-2 transition-colors duration-500",
                        isCompleted || isCurrent ? "bg-primary border-primary" : "bg-card border-border",
                        isCurrent && "animate-pulse"
                    )}>
                        {isCompleted ? (
                            <Check className="h-6 w-6 text-primary-foreground" />
                        ) : (
                            <status.icon className={cn("h-5 w-5", isCurrent ? 'text-primary-foreground' : 'text-muted-foreground')} />
                        )}
                    </div>
                </div>

                <div className="pt-1.5">
                    <h3 className={cn(
                        "font-headline font-semibold text-lg",
                        isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground"
                    )}>{status.label}</h3>
                    <p className={cn(
                        "text-sm",
                        isCompleted || isCurrent ? "text-muted-foreground" : "text-muted-foreground/50"
                    )}>
                        {isCurrent && "Su pedido se encuentra actualmente en esta etapa."}
                        {isCompleted && "Esta etapa está completa."}
                        {!isCompleted && !isCurrent && "Su pedido aún no ha llegado a esta etapa."}
                    </p>
                </div>
            </div>
        );
      })}
    </div>
  );
}
