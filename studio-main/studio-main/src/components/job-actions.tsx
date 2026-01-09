'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, ExternalLink, Share2, Upload, X, Paperclip, Image as ImageIcon, Send, CheckCircle, Printer, Wand2, Loader2 as Spinner } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';
import Link from 'next/link';
import { getFirestore, doc, collection, serverTimestamp, writeBatch, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useStorage } from '@/firebase';
import { Textarea } from './ui/textarea';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useAppContext } from '@/context/app-context';
import { Label } from './ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteJobAndFiles } from '@/lib/actions/delete-job-files';
import { Progress } from './ui/progress';
import { diagnoseError } from '@/ai/flows/diagnose-error-flow';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Separator } from './ui/separator';


type Job = {
  id: string;
  clientName: string;
  specifications: string;
  status: string;
  priority: 'Urgente' | 'Alta' | 'Normal' | 'Baja';
  departmentId: string;
  approvalUrl?: string;
};

type ErrorState = {
  title: string;
  description: string;
} | null;

type Diagnosis = {
  diagnosis: string;
  suggestion: string;
} | null;


export function JobActions({ job }: { job: Job }) {
  const [newStatus, setNewStatus] = useState<string>(job.status);
  const [priority, setPriority] = useState<'Urgente' | 'Alta' | 'Normal' | 'Baja'>(job.priority);
  const [comment, setComment] = useState('');
  const [approvalUrl, setApprovalUrl] = useState(job.approvalUrl || '');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [otherFiles, setOtherFiles] = useState<File[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [showLink, setShowLink] = useState(false);
  const [errorState, setErrorState] = useState<ErrorState>(null);
  const [aiDiagnosis, setAiDiagnosis] = useState<Diagnosis>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);


  const { toast } = useToast();
  const firestore = getFirestore();
  const storage = useStorage();
  const router = useRouter();
  const { user, userData, departments } = useAppContext();
  
  const enlaceCliente = typeof window !== 'undefined' ? `${window.location.origin}/track/${job.id}`: '';

  const hasStatusChanged = newStatus !== job.status;
  const hasPriorityChanged = priority !== job.priority;
  const hasApprovalChanged = approvalUrl !== (job.approvalUrl || '');
  const hasComment = !!comment;
  const hasFiles = screenshotFile || otherFiles.length > 0;
  const hasChanges = hasStatusChanged || hasPriorityChanged || hasComment || hasFiles || hasApprovalChanged;

  const resetForm = () => {
    setComment('');
    setScreenshotFile(null);
    setOtherFiles([]);
    setUploadProgress(0);
    setIsUploading(false);
    // Also reset status and priority selectors to their original state
    setNewStatus(job.status);
    setPriority(job.priority);
    setApprovalUrl(job.approvalUrl || '');
    setAiDiagnosis(null);
    setIsDiagnosing(false);
  };
  
  const handleError = (error: any) => {
    let title = 'Error Inesperado';
    let description = `Ocurrió un problema. Contacte a soporte con este código: ${error.code || 'UNKNOWN'}`;

    if (error.name === 'FirebaseError') {
        switch (error.code) {
            case 'permission-denied':
            case 'storage/unauthorized':
                title = 'Error de Permisos';
                description = `No tienes permiso para realizar esta acción. Las reglas de seguridad de Firebase denegaron la solicitud. Revisa los permisos de tu usuario.`;
                break;
            case 'storage/network-error':
                 title = 'Error de Red';
                 description = 'No se pudo conectar con los servidores de Firebase para subir los archivos. Por favor, verifica tu conexión a internet e inténtalo de nuevo.';
                 break;
            default:
                title = `Error de Firebase (${error.code})`;
                description = `Ocurrió un error específico de Firebase al procesar tu solicitud: ${error.message}`;
                break;
        }
    } else if (error instanceof FirestorePermissionError) {
        title = 'Error de Permiso de Firestore';
        description = error.message;
    }
    
    setErrorState({ title, description });
    
    // Also emit the detailed permission error for the dev overlay if it's a permission issue
    if (error.code === 'permission-denied' || error instanceof FirestorePermissionError) {
        const permissionError = new FirestorePermissionError({
            path: `jobs/${job.id}`,
            operation: 'update',
            requestResourceData: { hasFiles, hasStatusChanged, hasPriorityChanged }
        });
        errorEmitter.emit('permission-error', permissionError);
    }
  };


  const handleScreenshotFileChange = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    let file: File | null = null;
    if ('dataTransfer' in e) { // Drag event
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        file = e.dataTransfer.files[0];
      }
    } else { // Change event
      if (e.target.files && e.target.files.length > 0) {
        file = e.target.files[0];
      }
    }
    
    if (file && file.type.startsWith('image/')) {
        setScreenshotFile(file);
    } else if (file) {
        toast({ variant: 'destructive', title: 'Archivo no válido', description: 'Por favor, selecciona solo un archivo de imagen para la captura.' });
    }
  };

  const handleOtherFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setOtherFiles(prev => [...prev, ...Array.from(e.target.files as FileList)]);
    }
  };

  const removeOtherFile = (index: number) => {
    setOtherFiles(prev => prev.filter((_, i) => i !== index));
  }
  
  const handleSaveChanges = async () => {
    if (!user || !userData) {
        handleError(new Error('Usuario no autenticado. Debes iniciar sesión para actualizar un trabajo.'));
        return;
    }
    if (!hasChanges) {
        handleError(new Error('Sin cambios. No has realizado ningún cambio para guardar.'));
        return;
    }

    setIsUpdating(true);
    
    // --- BUSINESS LOGIC: Auto-delete on "Entregado" ---
    if (hasStatusChanged && departments.find(d => d.name === newStatus)?.name === 'Entregado') {
        try {
            toast({ title: 'Finalizando Trabajo...', description: 'Archivando y eliminando registros y archivos asociados.'});
            await deleteJobAndFiles(job.id);
            toast({ title: '¡Trabajo Completado y Archivado!', description: `El trabajo para ${job.clientName} ha sido eliminado del sistema.`});
            router.push('/');
            router.refresh();
        } catch (error) {
            handleError(error);
        } finally {
            setIsUpdating(false);
        }
        return;
    }

    // --- REGULAR UPDATE FLOW ---
    
    let allFileUrls: string[] = [];
        
    if (hasFiles) {
        if (!storage) {
             handleError(new Error('El servicio de almacenamiento de archivos (Firebase Storage) no está disponible.'));
             setIsUpdating(false);
             return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        
        const allFilesToUpload = [
            ...(screenshotFile ? [screenshotFile] : []),
            ...otherFiles
        ];

        try {
            toast({ title: 'Subiendo archivos...', description: `Subiendo ${allFilesToUpload.length} archivo(s)...` });
            
            const uploadPromises = allFilesToUpload.map(file => {
              return new Promise<string>((resolve, reject) => {
                  const storageRef = ref(storage, `jobs/${job.id}/updates/${Date.now()}_${file.name}`);
                  const uploadTask = uploadBytesResumable(storageRef, file);

                  uploadTask.on('state_changed', 
                    (snapshot) => {
                       const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                       console.log('Upload is ' + progress + '% done');
                       setUploadProgress(progress);
                    },
                    (error) => {
                      console.error("Upload error on one file:", error);
                      reject(error);
                    },
                    async () => {
                      try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve(downloadURL);
                      } catch (error) {
                        reject(error);
                      }
                    }
                  );
              });
            });
            
            const urls = await Promise.all(uploadPromises);
            allFileUrls.push(...urls);

        } catch (uploadError: any) {
             handleError(uploadError);
             setIsUpdating(false);
             setIsUploading(false);
             setUploadProgress(0);
             return;
        }
        
        setIsUploading(false);
    }
    
    // ---- DATABASE WRITE ----
    try {
        const batch = writeBatch(firestore);
        const jobRef = doc(firestore, 'jobs', job.id);
        
        const updateData: any = {
            jobId: job.id,
            userId: user.uid,
            departmentId: userData.departmentId,
            timestamp: serverTimestamp(),
        };
        
        if (allFileUrls.length > 0) {
          updateData.fileUrls = allFileUrls;
        }

        const jobUpdatePayload: any = {};

        if (hasStatusChanged) {
            const finalDepartmentId = departments?.find(d => d.name === newStatus)?.id;
            if (finalDepartmentId) {
                jobUpdatePayload.status = newStatus;
                jobUpdatePayload.departmentId = finalDepartmentId;
                updateData.newStatus = newStatus;
            }
        }
        if (hasPriorityChanged) {
            jobUpdatePayload.priority = priority;
            updateData.newPriority = priority;
        }
        if (hasApprovalChanged) {
            jobUpdatePayload.approvalUrl = approvalUrl;
        }

        let commentParts = [];
        if(comment) commentParts.push(comment);
        if(screenshotFile && !comment.toLowerCase().includes('captura')) {
          commentParts.push("Se adjunta captura de pantalla del diseño.");
        }
        if (hasApprovalChanged && approvalUrl) {
            commentParts.push(`Aprobación del cliente registrada: ${approvalUrl}`);
        }
        if (commentParts.length > 0) {
            updateData.comment = commentParts.join('\n');
        }

        if (Object.keys(jobUpdatePayload).length > 0) {
            batch.update(jobRef, jobUpdatePayload);
        }
        
        if (updateData.comment || updateData.newStatus || updateData.newPriority || (updateData.fileUrls && updateData.fileUrls.length > 0)) {
          const newUpdateRef = doc(collection(firestore, 'jobs', job.id, 'updates'));
          batch.set(newUpdateRef, updateData);
        }
        
        await batch.commit();

        toast({
            title: '¡Trabajo Actualizado!',
            description: 'Los cambios se han guardado correctamente.',
        });
        
        resetForm();
        router.refresh(); 

    } catch (error: any) {
        console.error("Error saving job data to Firestore:", error);
        handleError(error);
    } finally {
        setIsUpdating(false);
        setIsUploading(false);
        setUploadProgress(0);
    }
};

  const handleCopyLink = () => {
    navigator.clipboard.writeText(enlaceCliente);
    toast({
      title: '¡Enlace Copiado!',
      description: 'El enlace de seguimiento del cliente ha sido copiado.',
    });
  };

  const handleRequestApproval = async () => {
    const message = `¡Hola! Su diseño para el trabajo con ID ${job.id} está listo para su revisión. Por favor, siga el enlace para ver el progreso y la vista previa: ${enlaceCliente}`;
    navigator.clipboard.writeText(message);
    toast({
      title: '¡Mensaje de Aprobación Copiado!',
      description: 'Pega el mensaje en un correo o WhatsApp para tu cliente.',
    });

    // Add an update to the job history
     if (!user || !userData) return;
     try {
        const batch = writeBatch(firestore);
        const newUpdateRef = doc(collection(firestore, 'jobs', job.id, 'updates'));
        batch.set(newUpdateRef, {
            jobId: job.id,
            userId: user.uid,
            departmentId: userData.departmentId,
            timestamp: serverTimestamp(),
            comment: 'Se solicitó la aprobación del diseño al cliente.'
        });
        await batch.commit();
        router.refresh();
     } catch(e) {
        console.error("Could not log approval request", e);
     }
  };
  
   useEffect(() => {
    const diagnose = async () => {
        // Automatically run diagnosis if there's an error and the user is an admin.
        if (errorState && userData?.rol === 'dueño') {
            setIsDiagnosing(true);
            setAiDiagnosis(null);
            try {
                const result = await diagnoseError({
                    errorMessage: errorState.description,
                    codeContext: `Componente: JobActions, Acción: handleSaveChanges, Usuario: ${userData?.email}, Rol: ${userData?.rol}, Depto: ${userData?.departmentId}`
                });
                setAiDiagnosis(result);
            } catch (e) {
                setAiDiagnosis({
                    diagnosis: "Error al contactar a la IA.",
                    suggestion: "No se pudo obtener un diagnóstico del asistente de IA. Verifica la conexión o la configuración del servicio de IA."
                });
                console.error("AI Diagnosis Error:", e);
            } finally {
                setIsDiagnosing(false);
            }
        }
    };
    diagnose();
  }, [errorState, userData]); // Dependency array ensures this runs when an error occurs or user data is available.


  const canUpdate = userData?.rol === 'dueño' || userData?.departmentId === job.departmentId;
  const currentDepartmentName = departments.find(d => d.id === userData?.departmentId)?.name;
  
  const isDesignUser = currentDepartmentName === 'Diseño/Atencion al cliente';
  const isPrintingUser = currentDepartmentName === 'Impresion';

  const buttonText = isUploading ? 'Subiendo archivos...' : (isUpdating ? 'Guardando...' : 'Guardar Cambios');
  
  const handleCloseErrorDialog = () => {
    setErrorState(null);
    resetForm();
  }

  return (
    <div className="space-y-6">
       <AlertDialog open={!!errorState} onOpenChange={(open) => !open && handleCloseErrorDialog()}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{errorState?.title}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-wrap font-mono text-xs bg-muted p-4 rounded-md">
                {errorState?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>

            {(isDiagnosing || aiDiagnosis) && (
              <div className="space-y-4 pt-4">
                <Separator />
                 <Alert>
                    <Wand2 className="h-4 w-4" />
                    <AlertTitle>Diagnóstico de la IA</AlertTitle>
                    <AlertDescription className="space-y-2">
                        {isDiagnosing && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Spinner className="h-4 w-4 animate-spin" />
                                <span>Analizando el error...</span>
                            </div>
                        )}
                       {aiDiagnosis && (
                        <>
                            <p className="font-semibold">Causa Raíz: <span className="font-normal">{aiDiagnosis.diagnosis}</span></p>
                            <p className="font-semibold">Sugerencia: <span className="font-normal">{aiDiagnosis.suggestion}</span></p>
                        </>
                       )}
                    </AlertDescription>
                </Alert>
              </div>
            )}
            
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseErrorDialog}>Cerrar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {canUpdate && (
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">Actualizar Trabajo</CardTitle>
              <CardDescription>Mueve, cambia prioridad, añade comentarios o adjunta archivos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div>
                  <Label className="text-sm font-medium">Mover a Departamento</Label>
                  <Select value={newStatus} onValueChange={(value: string) => setNewStatus(value)}>
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Actualizar estado..." />
                      </SelectTrigger>
                      <SelectContent>
                          {departments?.map(dep => (
                              <SelectItem key={dep.id} value={dep.name} disabled={dep.name === job.status}>
                                  {dep.name}
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
               </div>

                <div>
                    <Label className="text-sm font-medium">Prioridad</Label>
                    <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                        <SelectTrigger className="w-full mt-1">
                            <SelectValue placeholder="Cambiar prioridad..." />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value="Normal">Normal</SelectItem>
                           <SelectItem value="Baja">Baja</SelectItem>
                           <SelectItem value="Alta">Alta</SelectItem>
                           <SelectItem value="Urgente">Urgente</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
                <div 
                    className="relative"
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={handleScreenshotFileChange}
                >
                    <Label>Captura de pantalla del diseño</Label>
                    <Input id="screenshot-upload" type="file" onChange={handleScreenshotFileChange} accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer top-6" />
                    {screenshotFile ? (
                        <div className="mt-1 flex items-center justify-between p-3 border rounded-md bg-secondary">
                            <div className="flex items-center gap-2 overflow-hidden">
                            <ImageIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm text-foreground truncate">{screenshotFile.name}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => setScreenshotFile(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="mt-1 flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg text-muted-foreground cursor-pointer hover:bg-muted/50">
                            <Upload className="mb-2 h-6 w-6" />
                            <span>Pegar o seleccionar captura</span>
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <Label>Adjuntar Archivos</Label>
                    <Button asChild variant="outline" className="w-full">
                        <label htmlFor="other-files-upload" className="cursor-pointer">
                            <Paperclip className="mr-2 h-4 w-4" />
                            Seleccionar Archivos
                        </label>
                    </Button>
                    <Input id="other-files-upload" type="file" onChange={handleOtherFilesChange} multiple className="hidden" />

                    {otherFiles.length > 0 && (
                        <div className="space-y-2 pt-2">
                            {otherFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-2 border rounded-md bg-secondary text-sm">
                                    <span className="truncate">{file.name}</span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeOtherFile(index)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {isDesignUser && (
                    <div className="space-y-2">
                      <Label htmlFor="approvalUrl">URL de Prueba de Aprobación</Label>
                       <Input 
                          id="approvalUrl"
                          type="url"
                          placeholder="https://ejemplo.com/prueba.jpg"
                          value={approvalUrl}
                          onChange={(e) => setApprovalUrl(e.target.value)}
                        />
                    </div>
                )}


                <div>
                    <Label className="text-sm font-medium">Añadir Comentario</Label>
                    <Textarea 
                        placeholder="Escribe un comentario sobre la actualización..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="mt-1"
                    />
                </div>
                
                <div className="space-y-2">
                    <Button onClick={handleSaveChanges} disabled={isUpdating || isUploading || !hasChanges} className="w-full">
                        {buttonText}
                    </Button>
                    {isUploading && (
                      <Progress value={uploadProgress} className="w-full h-2" />
                    )}
                </div>
            </CardContent>
          </Card>
      )}

      {isPrintingUser && (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-xl">Acciones de Impresión</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                 <Button variant="outline" className="w-full" onClick={() => toast({ title: 'Función en desarrollo', description: 'Esta acción registrará el uso de materiales de impresión.' })}>
                    <Printer className="mr-2 h-4 w-4" /> Acción de Impresión
                 </Button>
            </CardContent>
        </Card>
      )}

      {isDesignUser && (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-xl">Acciones de Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                 <Button variant="outline" className="w-full" onClick={handleRequestApproval}>
                    <Send className="mr-2 h-4 w-4" /> Solicitar Aprobación
                 </Button>
                 <p className="text-xs text-muted-foreground text-center">Copia un mensaje para enviar al cliente.</p>
            </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl">Enlace de Cliente</CardTitle>
          <CardDescription>Comparte este enlace para que el cliente vea el progreso.</CardDescription>
        </CardHeader>
        <CardContent>
          {!showLink ? (
            <Button variant="outline" className="w-full" onClick={() => setShowLink(true)}>
              <Share2 className="mr-2 h-4 w-4" /> Generar Enlace de Cliente
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Comparte este enlace con el cliente:</p>
              <div className="flex gap-2">
                <Input value={enlaceCliente} readOnly />
                <Button variant="ghost" size="icon" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Link href={enlaceCliente} target="_blank">
                <Button variant="secondary" className="w-full">
                  <ExternalLink className="mr-2 h-4 w-4" /> Vista Previa del Enlace
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

}
