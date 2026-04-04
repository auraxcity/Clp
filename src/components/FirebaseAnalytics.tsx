'use client';

import { useEffect } from 'react';
import { getFirebaseApp } from '@/lib/firebase';

/** Initializes GA4 via Firebase Analytics in the browser only (Next.js–safe). */
export function FirebaseAnalytics() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { getAnalytics, isSupported } = await import('firebase/analytics');
      const supported = await isSupported();
      if (!supported || cancelled) return;
      getAnalytics(getFirebaseApp());
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
