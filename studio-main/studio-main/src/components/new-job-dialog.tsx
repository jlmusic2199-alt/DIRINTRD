'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getFirestore, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/app-context';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { getStatusConfig } from '@/lib/config';

export function NewJobDialog({ children }: { children: React.ReactNode }) {
  const { user, userData, departments } = useAppContext();
  const firestore = getFirestore();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [specifications, setSpecifications] = useState('');
  const [priority, setPriority] = useState<'Urgente' | 'Alta' | 'Normal' | 'Baja'>('Normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const designDepartment = departments?.find(d => getStatusConfig(d.name).label === 'Diseño y Atención');

  const resetForm = () => {
      setClientName('');
      setSpecifications('');
      setPriority('Normal');
  }

  const handleSubmit = async () => {
    if (!user || !clientName) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Por favor, completa el campo de Cliente.',
      });
      return;
    }
    
    if (!designDepartment) {
       toast({
        variant: 'destructive',
        title: 'Error de Configuración',
        description: "No se pudo encontrar el departamento de 'Diseño/Atencion al cliente'. Contacte a un administrador.",
      });
      return;
    }

    setIsSubmitting(true);
    const jobsCollectionRef = collection(firestore, 'jobs');
    const newJobDocRef = doc(jobsCollectionRef);

    const newJobData = {
        id: newJobDocRef.id,
        clientName,
        specifications,
        priority,
        status: designDepartment.name,
        departmentId: designDepartment.id, 
        createdAt: serverTimestamp(),
        approvalUrl: null,
    };

    try {
        await setDoc(newJobDocRef, newJobData);
        toast({
            title: '¡Éxito!',
            description: `El trabajo para "${clientName}" ha sido creado con el ID: ${newJobDocRef.id}`,
        });
        resetForm();
        setOpen(false);
    } catch (e: any) {
        if (e.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `jobs/${newJobDocRef.id}`,
                operation: 'create',
                requestResourceData: newJobData,
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({
                variant: "destructive",
                title: "Error de Permiso",
                description: "No tienes permiso para crear un trabajo. Contacta al administrador."
            });
        } else {
             toast({
                variant: "destructive",
                title: "Error al Crear Trabajo",
                description: e.message || "Ocurrió un problema al intentar crear el trabajo. Por favor, inténtalo de nuevo."
            });
        }
        console.error("Error creating job:", e);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Crear Nuevo Trabajo</DialogTitle>
          <DialogDescription>
            Rellena los detalles para crear un nuevo trabajo. Empezará en 'Diseño/Atencion al cliente'.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="clientName" className="text-right">
              Cliente
            </Label>
            <Input id="clientName" value={clientName} onChange={(e) => setClientName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="priority" className="text-right">
              Prioridad
            </Label>
            <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleccionar prioridad..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Baja">Baja</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Urgente">Urgente</SelectItem>
                </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="specifications" className="text-right">
              Detalles
            </Label>
            <Textarea id="specifications" value={specifications} onChange={(e) => setSpecifications(e.target.value)} className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Creando...' : 'Crear Trabajo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
