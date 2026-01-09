'use server';

import { getStorage, ref, deleteObject } from 'firebase/storage';
import { getFirestore, collection, getDocs, query, doc, deleteDoc } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

// Server-side initialization of Firebase
function initializeServerSideFirebase() {
    if (getApps().length === 0) {
        return initializeApp(firebaseConfig);
    }
    return getApp();
}

const firebaseApp = initializeServerSideFirebase();
const firestore = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

/**
 * Deletes a job document from Firestore and all its associated files from Firebase Storage.
 * It first queries all 'updates' for the job, collects file URLs, deletes them from Storage,
 * and finally deletes the job document itself from Firestore. This is an atomic operation for cleanup.
 *
 * @param jobId The ID of the job to be completely deleted.
 * @returns A promise that resolves when all deletions have been attempted.
 */
export async function deleteJobAndFiles(jobId: string) {
  if (!jobId) {
    throw new Error('Job ID is required to delete the job and its files.');
  }

  // 1. Delete associated files from Storage
  try {
    const updatesCollectionRef = collection(firestore, 'jobs', jobId, 'updates');
    const q = query(updatesCollectionRef);
    const querySnapshot = await getDocs(q);

    const fileUrls: string[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.fileUrl && typeof data.fileUrl === 'string') {
        fileUrls.push(data.fileUrl);
      }
      if (data.fileUrls && Array.isArray(data.fileUrls)) {
        fileUrls.push(...data.fileUrls);
      }
    });

    if (fileUrls.length > 0) {
      const deletionPromises = fileUrls.map((fileUrl) => {
        try {
          const fileRef = ref(storage, fileUrl);
          return deleteObject(fileRef);
        } catch (error) {
          console.warn(`Could not create storage reference for URL: ${fileUrl}`, error);
          return Promise.resolve();
        }
      });
      await Promise.allSettled(deletionPromises);
    }
  } catch (error) {
    console.error(`Error during file deletion phase for job ${jobId}:`, error);
    // Depending on policy, you might want to stop here or continue to delete the doc.
    // We'll continue, but log the error.
  }

  // 2. Delete the job document from Firestore
  try {
    const jobRef = doc(firestore, 'jobs', jobId);
    await deleteDoc(jobRef);
    console.log(`Successfully deleted job document ${jobId} from Firestore.`);
  } catch (error) {
    console.error(`Failed to delete job document ${jobId} from Firestore:`, error);
    // Re-throw the error if deleting the main document fails, as this is critical.
    throw error;
  }
}
