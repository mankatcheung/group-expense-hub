'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/context/AuthContext';
import { TripProvider } from '@/context/TripContext';
import { NavigationProgressProvider } from '@/context/NavigationProgressContext';
import { NavigationProgressBar } from '@/components/NavigationProgressBar';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <>
      <ServiceWorkerRegistration />
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Sonner />
            <AuthProvider>
              <TripProvider>
                <NavigationProgressProvider>
                  <NavigationProgressBar />
                  {children}
                </NavigationProgressProvider>
              </TripProvider>
            </AuthProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </>
  );
}
