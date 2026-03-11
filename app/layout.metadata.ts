import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Group Expense Hub',
  description: 'Split expenses with friends and track who owes what',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ExpenseHub',
  },
};

export const viewport: Viewport = {
  themeColor: '#16553b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};
