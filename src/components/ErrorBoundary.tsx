'use client';

import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-8 h-8 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-foreground">Something went wrong</h2>
        <p className="text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="mt-4 p-4 bg-muted rounded-lg text-left text-xs overflow-auto max-h-32">
            {error.message}
          </pre>
        )}
        <div className="flex gap-2 justify-center pt-4">
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Go Home
          </Button>
          <Button onClick={reset}>Try Again</Button>
        </div>
      </div>
    </div>
  );
}
