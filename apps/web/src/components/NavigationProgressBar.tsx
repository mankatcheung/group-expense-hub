'use client';

import { useNavigationProgress } from '@/context/NavigationProgressContext';
import { cn } from '@/lib/utils';

export function NavigationProgressBar() {
  const { isPending } = useNavigationProgress();

  return (
    <div
      aria-hidden="true"
      className={cn(
        'fixed top-0 left-0 z-50 h-0.5 w-full bg-primary transition-opacity duration-150',
        isPending ? 'opacity-100 animate-pulse' : 'opacity-0'
      )}
    />
  );
}
