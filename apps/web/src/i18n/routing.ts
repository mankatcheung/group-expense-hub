import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'zh-HK'],
  defaultLocale: 'en',
});

export type Locale = (typeof routing.locales)[number];
