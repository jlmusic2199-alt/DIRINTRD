'use client';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlusCircle, UserCircle, LogOut, LogIn, Loader2 } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { NewJobDialog } from './new-job-dialog';
import { useAppContext } from '@/context/app-context';
import { getStatusConfig } from '@/lib/config';

export function Header() {
  const { auth } = useFirebase();
  const { user, userData, departments, isLoading } = useAppContext();

  const handleSignOut = () => {
    if (auth) {
        auth.signOut();
    }
  };
  
  const userDepartment = departments.find(d => d.id === userData?.departmentId);
  const isDesignUser = userDepartment ? getStatusConfig(userDepartment.name).label === 'Diseño y Atención' : false;

  const canCreateJob = userData?.rol === 'dueño' || isDesignUser;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <path d="M6 9V2h12v7" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <path d="M6 14h12v8H6z" />
            </svg>
            <span className="inline-block font-headline font-bold text-foreground">
              DIPRINT RD
            </span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            {user && canCreateJob && (
              <NewJobDialog>
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Trabajo
                  </Button>
              </NewJobDialog>
            )}
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : user && userData ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || 'Usuario'} />}
                      <AvatarFallback>
                        {user.email ? user.email.charAt(0).toUpperCase() : <UserCircle />}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{userData.rol === 'dueño' ? 'Administrador' : user.displayName || 'Usuario'}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
               <Button asChild>
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Iniciar Sesión
                </Link>
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
