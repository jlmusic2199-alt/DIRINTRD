'use client';
import { AuthGuard } from '@/components/auth-guard';
import { Header } from '@/components/header';
import { useAppContext, UserProfile, Department } from '@/context/app-context';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, updateDoc, orderBy, Timestamp } from 'firebase/firestore';
import { Loader2, Users, CheckCircle } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';

type UserProfileWithDate = Omit<UserProfile, 'createdAt'> & {
  createdAt: Timestamp | { toDate: () => Date };
};


function UserManagementRow({ user, departments }: { user: UserProfileWithDate, departments: Department[] }) {
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(user.departmentId);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const hasChanged = selectedDeptId !== user.departmentId;

  const handleConfirmChange = async () => {
    if (!firestore || !hasChanged || selectedDeptId === undefined) return;

    setIsUpdating(true);
    const userDocRef = doc(firestore, 'users', user.id);
    const updatePayload = { departmentId: selectedDeptId };
    
    updateDoc(userDocRef, updatePayload)
      .then(() => {
        toast({
          title: '¡Usuario Actualizado!',
          description: `El departamento de ${user.email} ha sido cambiado correctamente.`,
          action: <CheckCircle className="h-5 w-5 text-green-500" />,
        });
      })
      .catch((error: any) => {
         const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: updatePayload
          });
          errorEmitter.emit('permission-error', permissionError);
          
          toast({
            variant: 'destructive',
            title: 'Error de Permiso',
            description: 'No tienes permiso para cambiar el departamento. Revisa las reglas de seguridad.',
          });
          // Revert the visual selection to the user's actual department from props
          setSelectedDeptId(user.departmentId);
      })
      .finally(() => {
        setIsUpdating(false);
      });
  };

  const userCreatedAt = user.createdAt?.toDate ? format(user.createdAt.toDate(), "dd/MM/yyyy, h:mm a", { locale: es }) : 'N/A';

  return (
     <TableRow key={user.id}>
        <TableCell className="font-medium">{user.email}</TableCell>
        <TableCell>{userCreatedAt}</TableCell>
        <TableCell className="flex items-center gap-2">
          <Select
            value={selectedDeptId || 'none'}
            onValueChange={(value) => setSelectedDeptId(value === 'none' ? null : value)}
            disabled={isUpdating}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Sin asignar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin asignar</SelectItem>
              {departments.map(dep => (
                <SelectItem key={dep.id} value={dep.id}>{dep.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasChanged && (
            <Button size="sm" onClick={handleConfirmChange} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
            </Button>
          )}
        </TableCell>
      </TableRow>
  )
}

function AdminUserManagementPage() {
  const { userData, departments, isLoading: isContextLoading } = useAppContext();
  const firestore = useFirestore();

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: allUsers, isLoading: areUsersLoading } = useCollection<UserProfileWithDate>(usersQuery);

  const managedUsers = useMemo(() => {
    if (!allUsers) return [];
    // This is the definitive fix: only users with the 'empleado' role should ever be shown on this page.
    // The administrator ('dueño') is not a manageable user.
    return allUsers.filter(user => user.rol === 'empleado');
  }, [allUsers]);

  const isLoading = isContextLoading || areUsersLoading;

  if (isLoading) {
    return (
      <div className="flex h-full flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (userData?.rol !== 'dueño') {
    return (
      <div className="flex h-full flex-1 items-center justify-center">
        <p className="text-muted-foreground">Acceso denegado. Esta área es solo para administradores.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
       <div className="flex items-center gap-4 mb-8">
            <Users className="h-8 w-8 text-primary" />
            <div>
                <h1 className="text-3xl font-bold font-headline">Gestión de Usuarios</h1>
                <p className="text-muted-foreground">Asigna departamentos a los usuarios del sistema.</p>
            </div>
       </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Correo Electrónico</TableHead>
              <TableHead>Fecha de Registro</TableHead>
              <TableHead>Departamento Asignado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {managedUsers.length > 0 ? (
              managedUsers.map(user => (
                <UserManagementRow key={user.id} user={user} departments={departments} />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  No se encontraron empleados para gestionar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
    return (
        <AuthGuard>
            <div className="flex flex-col h-screen bg-background text-foreground">
                <Header />
                <main className="flex-1 overflow-auto">
                    <AdminUserManagementPage />
                </main>
            </div>
        </AuthGuard>
    )
}
