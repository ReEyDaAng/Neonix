'use client';

import { useEffect } from 'react';
import { sendFrontendLog } from '@/lib/frontendLogger';

export default function GlobalErrorHandlers() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      void sendFrontendLog({
        level: 'error',
        message: event.message || 'Unhandled window error',
        context: 'window.onerror',
        meta: {
          file: event.filename,
          line: event.lineno,
          column: event.colno,
        },
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      void sendFrontendLog({
        level: 'error',
        message: 'Unhandled promise rejection',
        context: 'window.unhandledrejection',
        meta: {
          reason: String(event.reason),
        },
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}