'use client';
import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { useFirebase, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/app-context';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, Shield } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// Helper function to create the user profile. It now returns a promise.
const createUserProfile = async (firestore: any, user: User): Promise<void> => {
    const userRef = doc(firestore, 'users', user.uid);
    
    const newUserProfile = {
        id: user.uid,
        email: user.email,
        rol: user.email?.toLowerCase() === 'solutionsvillanueva@gmail.com' ? 'dueño' : 'empleado',
        departmentId: null,
        createdAt: serverTimestamp(),
    };
    
    try {
        // Await the setDoc operation to ensure it completes.
        await setDoc(userRef, newUserProfile);
    } catch (e: any) {
        // Emit a detailed error for developers and re-throw to be caught by the caller.
        const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'create',
            requestResourceData: newUserProfile,
        });
        errorEmitter.emit('permission-error', permissionError);
        console.error("Error creating user profile:", e);
        // Re-throw the error to be handled in handleSuccessfulLogin
        throw e;
    }
};


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  
  const { auth } = useFirebase();
  const { user, userData, isLoading } = useAppContext();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // If context is loaded and we have full user data, redirect.
    if (!isLoading && user && userData) {
        router.push('/');
    }
  }, [user, userData, isLoading, router]);

  const handleSuccessfulLogin = async (loggedInUser: User) => {
    if (!firestore) {
        toast({ variant: "destructive", title: "Error", description: "La base de datos no está disponible." });
        setIsSubmitting(false);
        return;
    }

    const userRef = doc(firestore, 'users', loggedInUser.uid);
    
    try {
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // User does not exist, create a new profile AND AWAIT its completion.
            toast({ title: "Creando perfil...", description: "Es tu primera vez aquí, estamos configurando tu cuenta." });
            await createUserProfile(firestore, loggedInUser);
            toast({ title: "¡Bienvenido!", description: "Tu perfil ha sido creado." });
        } else {
             toast({ title: `¡Bienvenido de vuelta, ${loggedInUser.displayName || loggedInUser.email}!`, description: "Has iniciado sesión correctamente." });
        }
        
        // In both cases (creation or existing), push to home page.
        // The AppContext will now correctly have the user profile data.
        router.push('/');

    } catch (e: any) {
        toast({ 
            variant: "destructive", 
            title: "Error de Cuenta", 
            description: "No se pudo crear o verificar tu perfil de usuario. Contacta al administrador." 
        });
        if(auth) auth.signOut(); // Log out the user if profile setup fails
    } finally {
        setIsSubmitting(false);
    }
  };


  const handleEmailLogin = async () => {
    if (!email || !password) {
      toast({ variant: "destructive", title: "Campos Requeridos", description: "Por favor, introduce tu correo y contraseña." });
      return;
    }
    if (email.toLowerCase() !== 'solutionsvillanueva@gmail.com') {
         toast({ variant: "destructive", title: "Acceso Incorrecto", description: "El inicio de sesión por contraseña es solo para el administrador." });
         return;
    }
    if (!auth) return;

    setIsSubmitting(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await handleSuccessfulLogin(userCredential.user);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al Iniciar Sesión", description: 'El correo o la contraseña son incorrectos.' });
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
      if (!auth) return;

      setIsSubmitting(true);
      const provider = new GoogleAuthProvider();
      try {
          const result = await signInWithPopup(auth, provider);
          await handleSuccessfulLogin(result.user);
      } catch (error: any) {
          console.error("Google Sign-In Error:", error);
          toast({ variant: "destructive", title: "Error de Google", description: error.message || "No se pudo iniciar sesión con Google." });
          setIsSubmitting(false);
      }
  };
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleEmailLogin();
    }
  };
    
  if (isLoading || (user && !userData)) {
     return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (user && userData) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-sm mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center space-x-2 mb-4">
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
          <CardTitle className="font-headline text-2xl">Acceder al Sistema</CardTitle>
          <CardDescription>
             Inicia sesión para continuar a tu panel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <Button onClick={handleGoogleLogin} disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 111.8 512 0 400.2 0 264.4S111.8 16.8 244 16.8c70.3 0 129.8 27.8 174.3 71.9l-64.4 64.4c-22.6-21.5-53.2-34.4-89.9-34.4-69.5 0-126.3 56.8-126.3 126.3s56.8 126.3 126.3 126.3c82.3 0 111.8-51.8 115.3-77.9H244v-92.4h244c2.5 12.8 3.9 26.1 3.9 40z"></path></svg>}
              Iniciar Sesión con Google
            </Button>
            
             {!showAdminLogin && (
                <div className="text-center">
                    <Button variant="link" className="text-xs text-muted-foreground" onClick={() => setShowAdminLogin(true)}>
                        <Shield className="mr-2 h-4 w-4" />
                        ¿Eres el administrador?
                    </Button>
                </div>
            )}
            
            {showAdminLogin && (
              <>
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">
                        Acceso de Administrador
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Correo de Administrador</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="admin@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isSubmitting}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Contraseña</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isSubmitting}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                     <Button onClick={handleEmailLogin} variant="secondary" disabled={isSubmitting} className="w-full">
                        {isSubmitting && email ? <Loader2 className="animate-spin mr-2" /> : null}
                        Acceder como Administrador
                     </Button>
                </div>
              </>
            )}
        </CardContent>
         <CardFooter className="flex justify-center text-sm">
          <p className="text-muted-foreground">Solo personal autorizado.</p>
        </CardFooter>
      </Card>
    </div>
  );
}

    