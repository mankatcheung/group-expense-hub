'use client';

import { createContext, useContext, useTransition, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface NavigationProgressContextType {
  isPending: boolean;
  navigate: (href: string) => void;
  goBack: () => void;
}

const NavigationProgressContext = createContext<NavigationProgressContextType | null>(null);

/**
 * Wraps router.push in a transition so `isPending` stays true for the
 * duration of the actual route change (Next.js's App Router integrates
 * navigation with React transitions), not just until the click handler
 * returns. This is what drives the top progress bar during page-to-page
 * navigation, since otherwise there's no visual feedback between a click
 * and the destination page rendering.
 */
export function NavigationProgressProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };

  const goBack = () => {
    startTransition(() => {
      router.back();
    });
  };

  return (
    <NavigationProgressContext.Provider value={{ isPending, navigate, goBack }}>
      {children}
    </NavigationProgressContext.Provider>
  );
}

export function useNavigationProgress() {
  const ctx = useContext(NavigationProgressContext);
  if (!ctx) {
    throw new Error('useNavigationProgress must be used within NavigationProgressProvider');
  }
  return ctx;
}
