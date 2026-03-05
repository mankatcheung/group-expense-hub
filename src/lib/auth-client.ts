import { createAuthClient } from "better-auth/react";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4040";

export const authClient = createAuthClient({
  baseURL: apiUrl.replace("/api", ""),
  basePath: "/api/auth",
});
