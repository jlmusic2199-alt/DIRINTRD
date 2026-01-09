'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

// Type for a Firebase query/reference that has been tagged by useMemoFirebase
type MemoizedFirebaseObject = { __memo?: boolean };

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries and has an enabled flag.
 *
 * CRITICAL: The query or collection reference passed to this hook MUST be memoized,
 * preferably using the `useMemoFirebase` hook. This prevents infinite re-renders.
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} memoizedTargetRefOrQuery -
 * The Firestore CollectionReference or Query, wrapped in `useMemoFirebase`.
 * @param {{enabled?: boolean}} options - Options for the hook. `enabled`: to enable/disable it.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & MemoizedFirebaseObject) | null | undefined,
    options: { enabled?: boolean } = {}
): UseCollectionResult<T> {
  const { enabled = true } = options;
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  // Enforce memoization in development
  if (process.env.NODE_ENV === 'development' && memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    console.warn('A non-memoized query or collection reference was passed to useCollection. Use the `useMemoFirebase` hook to memoize it and prevent infinite loops.');
  }

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(enabled && !!memoizedTargetRefOrQuery);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    // Hold a stable reference to the query for the duration of this effect.
    const target = memoizedTargetRefOrQuery;

    // If the query is explicitly disabled, or not provided yet, do nothing and clean up state.
    if (!enabled || !target) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return; // <-- CRITICAL: Exit the effect entirely if not ready.
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      target,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        // Use the stable 'target' reference. Check for its existence before accessing properties.
        const contextualError = new FirestorePermissionError({
          path: (target as any)?.path || 'unknown_path_on_error', 
          operation: 'list', // onSnapshot for a collection is a 'list' operation
        });
        
        setError(contextualError);
        setData(null);
        setIsLoading(false);

        // Emit the error for the global listener
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery, enabled]); 
  
  return { data, isLoading, error };
}
