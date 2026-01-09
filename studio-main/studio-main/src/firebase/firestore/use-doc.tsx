'use client';
    
import { useState, useEffect } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useDoc hook.
 * @template T Type of the document data.
 */
export interface UseDocResult<T> {
  data: WithId<T> | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

// Type for a Firebase reference that has been tagged by useMemoFirebase
type MemoizedFirebaseObject = { __memo?: boolean };


/**
 * React hook to subscribe to a single Firestore document in real-time.
 * Handles nullable references.
 *
 * CRITICAL: The document reference passed to this hook MUST be memoized,
 * preferably using the `useMemoFirebase` hook. This prevents infinite re-renders.
 * The hook will throw an error in development if it detects a non-memoized reference.
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {DocumentReference<DocumentData> | null | undefined} docRef -
 * The Firestore DocumentReference, wrapped in `useMemoFirebase`. Waits if null/undefined.
 * @param {{enabled?: boolean}} options - Options for the hook. `enabled`: to enable/disable it.
 * @returns {UseDocResult<T>} Object with data, isLoading, error.
 */
export function useDoc<T = any>(
  memoizedDocRef: (DocumentReference<DocumentData> & MemoizedFirebaseObject) | null | undefined,
  options: { enabled?: boolean } = {}
): UseDocResult<T> {
  const { enabled = true } = options;
  type StateDataType = WithId<T> | null;

  // Enforce memoization in development
  if (process.env.NODE_ENV === 'development' && memoizedDocRef && !memoizedDocRef.__memo) {
    console.warn('A non-memoized document reference was passed to useDoc. Use the `useMemoFirebase` hook to memoize it and prevent infinite loops.');
  }

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(enabled && !!memoizedDocRef);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    // Hold a stable reference to the doc ref for the duration of this effect.
    const target = memoizedDocRef;

    // If the reference is not provided yet, do nothing and clean up state.
    if (!enabled || !target) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      target,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (snapshot.exists()) {
          setData({ ...(snapshot.data() as T), id: snapshot.id });
        } else {
          // Document does not exist
          setData(null);
        }
        setError(null); // Clear any previous error on successful snapshot (even if doc doesn't exist)
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        // Use the stable 'target' reference. Check for its existence before accessing properties.
        const contextualError = new FirestorePermissionError({
          operation: 'get',
          path: target.path || 'unknown_path_on_error',
        })

        setError(contextualError)
        setData(null)
        setIsLoading(false)

        // trigger global error propagation
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [memoizedDocRef, enabled]); // Re-run if the memoizedDocRef changes.

  return { data, isLoading, error };
}
