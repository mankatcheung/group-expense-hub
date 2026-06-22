export function getTrustedOrigins(): string[] {
  const origins = [
    'http://localhost:3000',
    'http://localhost:4040',
    'https://localhost:3000',
    'https://localhost:4040',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4040',
  ];

  console.log(`NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL}`);
  if (process.env.BETTER_AUTH_URL) origins.push(process.env.BETTER_AUTH_URL);
  if (process.env.NEXT_PUBLIC_APP_URL) origins.push(process.env.NEXT_PUBLIC_APP_URL);
  if (process.env.NEXT_PUBLIC_API_URL) origins.push(process.env.NEXT_PUBLIC_API_URL);

  const result = origins.filter(Boolean);
  console.log(`trusted origins: ${result.join(', ')}`);
  return result;
}
