import { createAuthClient } from "better-auth/react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4040/api";

export const authClient = createAuthClient({
  baseURL: apiUrl.replace("/api", ""),
  basePath: "/api/auth",
});
