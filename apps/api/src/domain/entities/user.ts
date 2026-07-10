export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export function getDisplayName(user: Pick<User, 'name' | 'email'>): string {
  return user.name ?? user.email.split('@')[0] ?? 'User';
}
