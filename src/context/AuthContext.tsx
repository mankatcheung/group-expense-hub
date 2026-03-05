import { createContext, useContext, ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

interface User {
  id: string;
  email?: string;
  name?: string | null;
  image?: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending, refetch } = authClient.useSession();

  const login = async (email: string, password: string) => {
    const { error } = await authClient.signIn.email({
      email,
      password,
    });
    if (error) throw new Error(error.message);
    await refetch();
  };

  const register = async (name: string, email: string, password: string) => {
    const { error } = await authClient.signUp.email({
      email,
      password,
      name,
    });
    if (error) throw new Error(error.message);
    await refetch();
  };

  const logout = async () => {
    await authClient.signOut();
  };

  const value: AuthContextType = {
    user: session?.user || null,
    isAuthenticated: !!session?.user,
    isLoading: isPending,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
