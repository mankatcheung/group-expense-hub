import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Group Expense Hub',
    short_name: 'ExpenseHub',
    description: 'Split expenses with friends and track who owes what',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#16553b',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
