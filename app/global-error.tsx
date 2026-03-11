'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <ErrorBoundary error={error} reset={reset} />
      </body>
    </html>
  );
}
